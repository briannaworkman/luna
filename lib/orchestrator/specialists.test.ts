import { describe, it, expect, vi } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'

vi.mock('./agents/mineralogy', () => ({ runMineralogyAgent: vi.fn() }))
vi.mock('./agents/mission-history', () => ({ runMissionHistoryAgent: vi.fn() }))
vi.mock('./agents/orbit', () => ({ runOrbitAgent: vi.fn() }))
vi.mock('./agents/imagery', () => ({ runImageryAgent: vi.fn() }))

import { runSpecialist } from './specialists'
import { runMineralogyAgent } from './agents/mineralogy'
import { runMissionHistoryAgent } from './agents/mission-history'
import { runOrbitAgent } from './agents/orbit'
import { runImageryAgent } from './agents/imagery'

const mockRunMineralogyAgent = vi.mocked(runMineralogyAgent)
const mockRunMissionHistoryAgent = vi.mocked(runMissionHistoryAgent)
const mockRunOrbitAgent = vi.mocked(runOrbitAgent)
const mockRunImageryAgent = vi.mocked(runImageryAgent)

const fakeDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

describe('runSpecialist', () => {
  it('routes thermal (stub) — emits a stub chunk', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('thermal', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).toHaveBeenCalledTimes(1)
    const call = emit.mock.calls[0]?.[0]
    expect(call).toBeDefined()
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('thermal')
      expect(call.text).toContain('Thermal analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes topography (stub) — emits a stub chunk', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('topography', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).toHaveBeenCalledTimes(1)
    const call = emit.mock.calls[0]?.[0]
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('topography')
      expect(call.text).toContain('Topography analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes hazards (stub) — emits a stub chunk', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('hazards', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).toHaveBeenCalledTimes(1)
    const call = emit.mock.calls[0]?.[0]
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('hazards')
      expect(call.text).toContain('Hazards analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes mineralogy — delegates to runMineralogyAgent', async () => {
    mockRunMineralogyAgent.mockResolvedValue(undefined)
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mineralogy', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunMineralogyAgent).toHaveBeenCalledWith({ dataContext: fakeDataContext, emit })
    expect(emit).not.toHaveBeenCalled()
  })

  it('routes mission-history — delegates to runMissionHistoryAgent', async () => {
    mockRunMissionHistoryAgent.mockResolvedValue(undefined)
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mission-history', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunMissionHistoryAgent).toHaveBeenCalledWith({ dataContext: fakeDataContext, emit })
    expect(emit).not.toHaveBeenCalled()
  })

  it('routes orbit — delegates to runOrbitAgent', async () => {
    mockRunOrbitAgent.mockResolvedValue(undefined)
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('orbit', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunOrbitAgent).toHaveBeenCalledWith({ dataContext: fakeDataContext, emit })
    expect(emit).not.toHaveBeenCalled()
  })

  it('routes imagery — delegates to runImageryAgent with imageAssetIds', async () => {
    mockRunImageryAgent.mockResolvedValue(undefined)
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('imagery', { dataContext: fakeDataContext, imageAssetIds: ['AS16-M-0273'] }, emit)
    expect(mockRunImageryAgent).toHaveBeenCalledWith({
      dataContext: fakeDataContext,
      imageAssetIds: ['AS16-M-0273'],
      emit,
    })
    expect(emit).not.toHaveBeenCalled()
  })

  it('unknown agentId — emits nothing and does not throw', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    // Cast to satisfy TypeScript — testing the runtime guard
    await runSpecialist('unknown-agent' as Parameters<typeof runSpecialist>[0], { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).not.toHaveBeenCalled()
  })
})
