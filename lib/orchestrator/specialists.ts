import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'
import { AGENTS } from '@/lib/constants/agents'
import { runStubAgent } from './stub-agents'

export async function runSpecialist(
  agentId: AgentId,
  _dataContext: DataContext,
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

  // TODO(PR-6+): mineralogy, orbit, mission-history, imagery
  // Placeholder: specialist emits nothing; agent-complete still fires
  // from the orchestrator after this function returns.
}
