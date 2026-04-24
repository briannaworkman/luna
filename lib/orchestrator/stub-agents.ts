import type { OrchestratorEvent } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'

const STUB_MESSAGES: Partial<Record<AgentId, string>> = {
  thermal: 'Thermal analysis (V2) — Will cover temperature range, thermal cycling risk, and day/night temperature delta using NASA Diviner radiometer data.',
  topography: 'Topography analysis (V2) — Will cover slope analysis, elevation profile, and DEM data from LOLA (Lunar Orbiter Laser Altimeter).',
  hazards: 'Hazards analysis (V2) — Will cover boulder density, permanently shadowed zone mapping, and terrain risk assessment from LROC slope data.',
}

export function runStubAgent(
  agentId: AgentId,
  emit: (event: OrchestratorEvent) => void,
): void {
  const message = STUB_MESSAGES[agentId]
  if (!message) return
  emit({ type: 'agent-chunk', agent: agentId, text: message })
}
