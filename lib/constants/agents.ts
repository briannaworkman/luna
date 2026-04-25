export type AgentId =
  | 'data-ingest'
  | 'imagery'
  | 'mineralogy'
  | 'orbit'
  | 'mission-history'
  | 'thermal'
  | 'topography'
  | 'hazards'

export interface Agent {
  id: AgentId
  /** Display label — always uppercase in the rail, enforced by CSS, not the data. */
  label: string
  /**
   * true  — returns placeholder on Screen 3; orchestrator may not activate it.
   * false — fully implemented in V1.
   */
  isStub: boolean
}

export const AGENTS: readonly Agent[] = [
  { id: 'data-ingest',     label: 'Data ingest',     isStub: false },
  { id: 'imagery',         label: 'Imagery',         isStub: false },
  { id: 'mineralogy',      label: 'Mineralogy',      isStub: false },
  { id: 'orbit',           label: 'Orbit',           isStub: false },
  { id: 'mission-history', label: 'Mission history', isStub: false },
  { id: 'thermal',         label: 'Thermal',         isStub: true  },
  { id: 'topography',      label: 'Topography',      isStub: true  },
  { id: 'hazards',         label: 'Hazards',         isStub: true  },
] as const

/**
 * Data-ingest activates on every query but produces no stream output;
 * it appears in the agent rail but never gets a main-panel block or a
 * citation row. Use this to filter activatedAgents lists before they
 * drive any UI that represents specialist output.
 */
export function isMainPanelAgent(id: AgentId): boolean {
  return id !== 'data-ingest'
}

export const STUB_AGENT_IDS: ReadonlySet<AgentId> = new Set(
  AGENTS.filter((a) => a.isStub).map((a) => a.id),
)
