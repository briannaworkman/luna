import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { MissionBriefSchema } from '@/lib/types/brief'
import type { MissionBrief, BriefStreamEvent } from '@/lib/types/brief'
import { buildSynthesisPrompt } from './prompt'
import type { DataCompleteness } from './completeness'

const SYNTHESIS_TIMEOUT_MS = 60_000
const MAX_TOKENS = 4096
const FAILURE_MESSAGE = 'Synthesis validation failed after retry. Partial results shown.'
const OVERLOADED_MESSAGE = 'The Anthropic API is currently overloaded. Please try again in a moment.'

interface MaybeAnthropicError {
  status?: number
  error?: { type?: string }
}

/**
 * AbortError (timeout), 529/503, or overloaded_error — fall through to retry
 * rather than bailing on the first attempt. Anthropic occasionally returns
 * these transient errors for several seconds during peak load.
 */
function isRetryableSdkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.name === 'AbortError') return true
  const e = err as MaybeAnthropicError
  return (
    e.status === 529 ||
    e.status === 503 ||
    e.error?.type === 'overloaded_error'
  )
}

function friendlyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const e = err as MaybeAnthropicError
    if (e.status === 529 || e.error?.type === 'overloaded_error') {
      return OVERLOADED_MESSAGE
    }
    return err.message
  }
  return String(err)
}

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

interface AttemptResult {
  text: string
  parsed: unknown
  brief: MissionBrief | null
  validationError: string | null
}

async function* streamText(
  system: string,
  user: string,
  signal: AbortSignal,
): AsyncGenerator<string, void> {
  const stream = getAnthropic().messages.stream(
    {
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
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

/**
 * Yields one `partial` event per text chunk from the SDK so the SSE client sees
 * progress in real time. Returns the full attempt result (text + validation
 * outcome) once the stream completes. Throws on AbortError (timeout) or SDK error.
 */
async function* runAttempt(
  system: string,
  user: string,
): AsyncGenerator<BriefStreamEvent, AttemptResult, void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SYNTHESIS_TIMEOUT_MS)
  let text = ''
  try {
    for await (const chunk of streamText(system, user, controller.signal)) {
      text += chunk
      yield { type: 'partial', text: chunk }
    }
  } finally {
    clearTimeout(timeoutId)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { text, parsed: undefined, brief: null, validationError: 'Response was not valid JSON.' }
  }

  const validation = MissionBriefSchema.safeParse(parsed)
  if (validation.success) {
    return { text, parsed, brief: validation.data, validationError: null }
  }
  return { text, parsed, brief: null, validationError: validation.error.message }
}

function asPartial(parsed: unknown): Partial<MissionBrief> | undefined {
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    return parsed as Partial<MissionBrief>
  }
  return undefined
}

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

/**
 * Server-derived completeness is the source of truth (S7.2.3): the model is
 * asked to echo it back, but we override post-validation as defense in depth.
 * Also guarantees the brief always has the exact 5 keys the UI expects.
 */
function finalizeBrief(brief: MissionBrief, completeness: DataCompleteness): MissionBrief {
  return { ...brief, dataCompleteness: { ...completeness } }
}

export async function* runSynthesis(
  input: RunSynthesisInput,
): AsyncGenerator<BriefStreamEvent, void> {
  const { system, user } = buildSynthesisPrompt(input)

  let currentUser = user
  let lastResult: AttemptResult | null = null
  let lastTransientError: unknown = null

  for (let attempt = 0; attempt < 2; attempt++) {
    let result: AttemptResult | null = null
    try {
      result = yield* runAttempt(system, currentUser)
    } catch (err) {
      if (isRetryableSdkError(err)) {
        lastTransientError = err
        result = null
      } else {
        yield {
          type: 'error',
          message: friendlyErrorMessage(err),
          partial: undefined,
        }
        return
      }
    }

    if (result?.brief) {
      yield { type: 'complete', brief: finalizeBrief(result.brief, input.completeness) }
      return
    }

    if (result) lastResult = result
    currentUser = buildRetryUserMessage(
      user,
      result?.text ?? '',
      result?.validationError ?? 'Request did not produce a usable response (transient API error or timeout).',
    )
  }

  // If we exhausted retries on transient errors and never got a result, surface
  // the transient error rather than the schema-validation failure message.
  const message =
    lastResult === null && lastTransientError !== null
      ? friendlyErrorMessage(lastTransientError)
      : FAILURE_MESSAGE
  yield {
    type: 'error',
    message,
    partial: asPartial(lastResult?.parsed),
  }
}
