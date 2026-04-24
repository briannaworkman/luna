import type { LunarLocation } from '@/components/globe/types'
import type { OrchestratorEvent, DataContext } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'
import { AGENTS } from '@/lib/constants/agents'
import { getAnthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { buildOrchestratorPrompt } from './prompt'
import { runDataIngest } from './data-ingest'
import { runSpecialist } from './specialists'
import type { SpecialistContext } from './specialists'

interface RunOrchestratorInput {
  query: string
  location: LunarLocation
  hasImages: boolean
  imageAssetIds: string[]
  emit: (event: OrchestratorEvent) => void
}

interface RunOrchestratorResult {
  agents: AgentId[]
  rationale: string
  dataContext: DataContext
}

const VALID_AGENT_IDS = new Set<string>(AGENTS.map((a) => a.id))

function isAgentId(value: string): value is AgentId {
  return VALID_AGENT_IDS.has(value)
}

export async function runOrchestrator(input: RunOrchestratorInput): Promise<RunOrchestratorResult> {
  const { query, location, hasImages, imageAssetIds, emit } = input
  const { system, user } = buildOrchestratorPrompt({ location, hasImages, query })

  const stream = getAnthropic().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  })

  let rawBuffer = ''
  let agentJsonBuffer = ''
  let delimiterSeen = false
  let rationaleEmitted = 0
  let rationaleEnd = 0

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
          rationaleEmitted = safeEnd
        }
      } else {
        delimiterSeen = true
        rationaleEnd = delimIdx
        const newRationaleText = rawBuffer.slice(rationaleEmitted, delimIdx)
        if (newRationaleText.length > 0) {
          emit({ type: 'orchestrator-chunk', text: newRationaleText })
        }
        rationaleEmitted = delimIdx
        agentJsonBuffer += rawBuffer.slice(delimIdx + DELIMITER.length)
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

  let agents: AgentId[] = ['data-ingest', ...parsed.filter(isAgentId).filter((id) => id !== 'data-ingest')]

  if (!hasImages) {
    agents = agents.filter((id) => id !== 'imagery')
  }

  const rationale = (delimiterSeen ? rawBuffer.slice(0, rationaleEnd) : rawBuffer).trim()

  emit({ type: 'orchestrator', agents, rationale })

  await new Promise<void>((resolve) => setTimeout(resolve, 400))

  const dataContext = await runDataIngest({ location, emit })

  const specialistContext: SpecialistContext = { dataContext, imageAssetIds }

  // Activate specialists (skip data-ingest — runDataIngest owns its events)
  // TODO(PR-6+): consider parallel dispatch once real specialists run long enough to matter
  for (const agentId of agents) {
    if (agentId === 'data-ingest') continue
    emit({ type: 'agent-activate', agent: agentId })
    await runSpecialist(agentId, specialistContext, emit)
    emit({ type: 'agent-complete', agent: agentId })
  }

  emit({ type: 'done' })

  return { agents, rationale, dataContext }
}
