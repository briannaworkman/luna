import { AGENTS, type AgentId } from '@/lib/constants/agents'
import type { SingleAgentState } from '@/components/screen3/useAgentStream'

const STUB_IDS = new Set<AgentId>(AGENTS.filter((a) => a.isStub).map((a) => a.id))

/**
 * Builds the agentOutputs record passed to POST /api/synthesize.
 *
 * For each non-stub, non-data-ingest agent in activatedAgents:
 * - Concatenate text body segments (drop confidence segments)
 * - If citations exist, append "Citations: source:id, source:id, ..." line
 * - Skip agents missing from agentStates
 */
export function buildSynthesisInput(
  agentStates: Partial<Record<AgentId, SingleAgentState>>,
  activatedAgents: AgentId[],
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const agentId of activatedAgents) {
    if (agentId === 'data-ingest') continue
    if (STUB_IDS.has(agentId)) continue

    const agentState = agentStates[agentId]
    if (!agentState) continue

    const textParts: string[] = []
    for (const seg of agentState.body) {
      if (seg.kind === 'text') {
        textParts.push(seg.text)
      }
    }

    let output = textParts.join('')

    if (agentState.citations.length > 0) {
      const citationList = agentState.citations
        .map((c) => `${c.source}:${c.id}`)
        .join(', ')
      output = output + `\nCitations: ${citationList}`
    }

    result[agentId] = output
  }

  return result
}
