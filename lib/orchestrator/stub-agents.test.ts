import { describe, it, expect, vi } from 'vitest'
import type { OrchestratorEvent } from '@/lib/types/agent'
import { runStubAgent } from './stub-agents'

describe('runStubAgent', () => {
  it('emits exactly one agent-chunk with the thermal text', () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    runStubAgent('thermal', emit)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith({
      type: 'agent-chunk',
      agent: 'thermal',
      text: 'Thermal analysis (V2) — Will cover temperature range, thermal cycling risk, and day/night temperature delta using NASA Diviner radiometer data.',
    })
  })

  it('emits exactly one agent-chunk with the topography text', () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    runStubAgent('topography', emit)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith({
      type: 'agent-chunk',
      agent: 'topography',
      text: 'Topography analysis (V2) — Will cover slope analysis, elevation profile, and DEM data from LOLA (Lunar Orbiter Laser Altimeter).',
    })
  })

  it('emits exactly one agent-chunk with the hazards text', () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    runStubAgent('hazards', emit)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith({
      type: 'agent-chunk',
      agent: 'hazards',
      text: 'Hazards analysis (V2) — Will cover boulder density, permanently shadowed zone mapping, and terrain risk assessment from LROC slope data.',
    })
  })

  it('emits nothing for a real agent (mineralogy is not a stub)', () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    runStubAgent('mineralogy', emit)
    expect(emit).not.toHaveBeenCalled()
  })
})
