import { STUB_AGENT_IDS, type AgentId } from '@/lib/constants/agents'
import type { SingleAgentState } from '@/components/screen3/useAgentStream'

/**
 * Builds the agentOutputs record for POST /api/synthesize. For each non-stub,
 * non-data-ingest activated agent: concatenates text body segments (drop
 * confidence segments — the synthesis model assigns its own per-claim
 * confidence) and appends a structured "Citations: source:id, ..." line so
 * the model can populate Finding.citations without inline tag parsing.
 */
export function buildSynthesisInput(
  agentStates: Partial<Record<AgentId, SingleAgentState>>,
  activatedAgents: readonly AgentId[],
): Partial<Record<AgentId, string>> {
  const result: Partial<Record<AgentId, string>> = {}

  for (const agentId of activatedAgents) {
    if (agentId === 'data-ingest' || STUB_AGENT_IDS.has(agentId)) continue

    const agentState = agentStates[agentId]
    if (!agentState) continue

    const text = agentState.body
      .filter((seg) => seg.kind === 'text')
      .map((seg) => (seg as { text: string }).text)
      .join('')

    const citationsLine = agentState.citations.length > 0
      ? `\nCitations: ${agentState.citations.map((c) => `${c.source}:${c.id}`).join(', ')}`
      : ''

    result[agentId] = text + citationsLine
  }

  return result
}
