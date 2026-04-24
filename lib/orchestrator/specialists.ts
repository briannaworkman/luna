import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'
import { AGENTS } from '@/lib/constants/agents'
import { runStubAgent } from './stub-agents'
import { runMineralogyAgent } from './agents/mineralogy'
import { runMissionHistoryAgent } from './agents/mission-history'
import { runOrbitAgent } from './agents/orbit'

export async function runSpecialist(
  agentId: AgentId,
  dataContext: DataContext,
  emit: (event: OrchestratorEvent) => void,
): Promise<void> {
  const agent = AGENTS.find((a) => a.id === agentId)
  if (!agent) return

  if (agent.isStub) {
    // runStubAgent is intentionally synchronous — mark void so a future
    // async refactor can't silently drop events on the floor.
    void runStubAgent(agentId, emit)
    return
  }

  if (agentId === 'mineralogy') {
    await runMineralogyAgent({ dataContext, emit })
    return
  }

  if (agentId === 'mission-history') {
    await runMissionHistoryAgent({ dataContext, emit })
    return
  }

  if (agentId === 'orbit') {
    await runOrbitAgent({ dataContext, emit })
    return
  }

  // TODO(PR-9): imagery
  // Placeholder: specialist emits nothing; agent-complete still fires
  // from the orchestrator after this function returns.
}
