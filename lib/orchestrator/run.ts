import type { LunarLocation } from '@/components/globe/types'
import type { OrchestratorEvent } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'
import { AGENTS } from '@/lib/constants/agents'
import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { buildOrchestratorPrompt } from './prompt'

interface RunOrchestratorInput {
  query: string
  location: LunarLocation
  hasImages: boolean
  emit: (event: OrchestratorEvent) => void
}

interface RunOrchestratorResult {
  agents: AgentId[]
  rationale: string
}

const VALID_AGENT_IDS = new Set<string>(AGENTS.map((a) => a.id))

function isAgentId(value: string): value is AgentId {
  return VALID_AGENT_IDS.has(value)
}

export async function runOrchestrator(input: RunOrchestratorInput): Promise<RunOrchestratorResult> {
  const { query, location, hasImages, emit } = input
  const { system, user } = buildOrchestratorPrompt({ location, hasImages, query })

  const stream = getAnthropic().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  })

  let rawBuffer = ''
  let rationaleBuffer = ''
  let agentJsonBuffer = ''
  let delimiterSeen = false
  let rationaleEmitted = 0

  const DELIMITER = '---AGENTS---'

  for await (const ev of stream) {
    if (ev.type !== 'content_block_delta') continue
    if (ev.delta.type !== 'text_delta') continue

    const chunk = ev.delta.text
    rawBuffer += chunk

    if (!delimiterSeen) {
      const delimIdx = rawBuffer.indexOf(DELIMITER)
      if (delimIdx === -1) {
        // Hold back the last (DELIMITER.length - 1) chars in case they are
        // the start of a split delimiter arriving across chunks.
        const safeEnd = Math.max(rationaleEmitted, rawBuffer.length - (DELIMITER.length - 1))
        if (safeEnd > rationaleEmitted) {
          emit({ type: 'orchestrator-chunk', text: rawBuffer.slice(rationaleEmitted, safeEnd) })
          rationaleBuffer = rawBuffer.slice(0, safeEnd)
          rationaleEmitted = safeEnd
        }
      } else {
        delimiterSeen = true
        const fullRationale = rawBuffer.slice(0, delimIdx)
        const newRationaleText = fullRationale.slice(rationaleEmitted)
        if (newRationaleText.length > 0) {
          emit({ type: 'orchestrator-chunk', text: newRationaleText })
        }
        rationaleBuffer = fullRationale
        rationaleEmitted = fullRationale.length
        const afterDelimiter = rawBuffer.slice(delimIdx + DELIMITER.length)
        agentJsonBuffer += afterDelimiter
      }
    } else {
      agentJsonBuffer += chunk
    }
  }

  const trimmedJson = agentJsonBuffer
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmedJson)
  } catch {
    throw new Error('Orchestrator returned unparseable agent list')
  }

  if (!Array.isArray(parsed) || !parsed.every((item): item is string => typeof item === 'string')) {
    throw new Error('Orchestrator returned unparseable agent list')
  }

  let agents: AgentId[] = parsed.filter(isAgentId)

  if (!agents.includes('data-ingest')) {
    agents = ['data-ingest', ...agents]
  } else if (agents[0] !== 'data-ingest') {
    agents = ['data-ingest', ...agents.filter((id) => id !== 'data-ingest')]
  }

  if (!hasImages) {
    agents = agents.filter((id) => id !== 'imagery')
  }

  const rationale = rationaleBuffer.trim()

  emit({ type: 'orchestrator', agents, rationale })

  await new Promise<void>((resolve) => setTimeout(resolve, 400))

  for (const agentId of agents) {
    emit({ type: 'agent-activate', agent: agentId })
  }

  // TODO(PR-3): replace with real specialist dispatch
  for (const agentId of agents) {
    emit({ type: 'agent-complete', agent: agentId })
  }

  emit({ type: 'done' })

  return { agents, rationale }
}
