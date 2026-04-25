import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { MissionBriefSchema } from '@/lib/types/brief'
import type { MissionBrief, BriefStreamEvent } from '@/lib/types/brief'
import { buildSynthesisPrompt } from './prompt'
import type { DataCompleteness } from './completeness'

const SYNTHESIS_TIMEOUT_MS = 60_000

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface RunSynthesisInput {
  locationName: string
  lat: number
  lon: number
  isProposed: boolean
  query: string
  generatedAt: string
  completeness: DataCompleteness
  activeAgents: string[]
  agentOutputs: Record<string, string>
}

// ---------------------------------------------------------------------------
// Stream helper — drains an Anthropic stream and yields text deltas
// ---------------------------------------------------------------------------

async function* streamText(
  system: string,
  user: string,
  signal: AbortSignal,
): AsyncGenerator<string, void> {
  const stream = getAnthropic().messages.stream(
    {
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    },
    { signal },
  )

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

// ---------------------------------------------------------------------------
// Attempt helper — runs one synthesis attempt; returns accumulated text
// Throws on AbortError (timeout) or Anthropic SDK error
// ---------------------------------------------------------------------------

async function runAttempt(
  system: string,
  user: string,
): Promise<{ text: string; events: BriefStreamEvent[] }> {
  const controller = new AbortController()
  const events: BriefStreamEvent[] = []
  let accumulated = ''

  const timeoutId = setTimeout(() => controller.abort(), SYNTHESIS_TIMEOUT_MS)

  try {
    for await (const chunk of streamText(system, user, controller.signal)) {
      accumulated += chunk
      events.push({ type: 'partial', text: chunk })
    }
  } finally {
    clearTimeout(timeoutId)
  }

  return { text: accumulated, events }
}

// ---------------------------------------------------------------------------
// Parse best-effort — returns Partial<MissionBrief> | undefined
// ---------------------------------------------------------------------------

function parseBestEffort(text: string): Partial<MissionBrief> | undefined {
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Partial<MissionBrief>
    }
    return undefined
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Finalize brief — override model-supplied dataCompleteness with the
// server-derived map. The spec (S7.2.3) makes the server-derived completeness
// the source of truth: "Coverage values are derived from DataContext — not
// estimated by the synthesis model." This also guarantees the brief always
// has the exact 5 keys the UI expects, even if the model produced a partial
// or extra-keyed map that still passed schema validation.
// ---------------------------------------------------------------------------

function finalizeBrief(
  brief: MissionBrief,
  completeness: DataCompleteness,
): MissionBrief {
  return { ...brief, dataCompleteness: { ...completeness } }
}

// ---------------------------------------------------------------------------
// Validation notice for retry user message
// ---------------------------------------------------------------------------

function buildRetryUserMessage(
  originalUser: string,
  invalidText: string,
  validationError: string,
): string {
  return `${originalUser}

VALIDATION NOTICE
=================
Your previous response did not conform to the required JSON schema. It was rejected with the following error:

${validationError}

Your previous response (for reference):
${invalidText}

Please produce a corrected JSON object that exactly matches the schema. Output only the JSON — no markdown fences, no commentary.`
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function* runSynthesis(
  input: RunSynthesisInput,
): AsyncGenerator<BriefStreamEvent, void> {
  const { system, user } = buildSynthesisPrompt(input)

  // ---- Attempt 1 ----
  let attempt1Events: BriefStreamEvent[] = []
  let attempt1Text = ''

  try {
    const result = await runAttempt(system, user)
    attempt1Events = result.events
    attempt1Text = result.text
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // Timeout on attempt 1 — fall through to retry
      // Don't yield partial events from a timed-out attempt
    } else {
      // Anthropic SDK error
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        partial: undefined,
      }
      return
    }
  }

  if (attempt1Text) {
    // Yield partial events from attempt 1
    for (const event of attempt1Events) {
      yield event
    }

    // Try to validate
    let parsed: unknown
    try {
      parsed = JSON.parse(attempt1Text)
    } catch {
      parsed = undefined
    }

    const validation = MissionBriefSchema.safeParse(parsed)
    if (validation.success) {
      yield { type: 'complete', brief: finalizeBrief(validation.data, input.completeness) }
      return
    }

    // Invalid — build retry user message
    const validationError = validation.error.message
    const retryUser = buildRetryUserMessage(user, attempt1Text, validationError)

    // ---- Attempt 2 (retry) ----
    let attempt2Events: BriefStreamEvent[] = []
    let attempt2Text = ''

    try {
      const result = await runAttempt(system, retryUser)
      attempt2Events = result.events
      attempt2Text = result.text
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Timeout on retry too
        yield {
          type: 'error',
          message: 'Synthesis validation failed after retry. Partial results shown.',
          partial: parseBestEffort(attempt1Text),
        }
        return
      } else {
        yield {
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          partial: undefined,
        }
        return
      }
    }

    // Yield partial events from retry
    for (const event of attempt2Events) {
      yield event
    }

    let parsed2: unknown
    try {
      parsed2 = JSON.parse(attempt2Text)
    } catch {
      parsed2 = undefined
    }

    const validation2 = MissionBriefSchema.safeParse(parsed2)
    if (validation2.success) {
      yield { type: 'complete', brief: finalizeBrief(validation2.data, input.completeness) }
      return
    }

    // Double invalid — fall back to attempt1 partial if attempt2 produced nothing
    yield {
      type: 'error',
      message: 'Synthesis validation failed after retry. Partial results shown.',
      partial: parseBestEffort(attempt2Text) ?? parseBestEffort(attempt1Text),
    }
    return
  }

  // attempt1Text was empty (timeout on first attempt with no chunks) — retry
  const retryUser = buildRetryUserMessage(user, '', 'Request timed out before any output was produced.')

  let attempt2Events: BriefStreamEvent[] = []
  let attempt2Text = ''

  try {
    const result = await runAttempt(system, retryUser)
    attempt2Events = result.events
    attempt2Text = result.text
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      yield {
        type: 'error',
        message: 'Synthesis validation failed after retry. Partial results shown.',
        partial: undefined,
      }
      return
    } else {
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        partial: undefined,
      }
      return
    }
  }

  for (const event of attempt2Events) {
    yield event
  }

  let parsed2: unknown
  try {
    parsed2 = JSON.parse(attempt2Text)
  } catch {
    parsed2 = undefined
  }

  const validation2 = MissionBriefSchema.safeParse(parsed2)
  if (validation2.success) {
    yield { type: 'complete', brief: finalizeBrief(validation2.data, input.completeness) }
    return
  }

  yield {
    type: 'error',
    message: 'Synthesis validation failed after retry. Partial results shown.',
    partial: parseBestEffort(attempt2Text),
  }
}
