import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'

vi.mock('./agents/runSpecialistStream', () => ({
  runSpecialistStream: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./agents/imagery', () => ({ runImageryAgent: vi.fn().mockResolvedValue(undefined) }))

import { runSpecialist } from './specialists'
import { runSpecialistStream } from './agents/runSpecialistStream'
import { runImageryAgent } from './agents/imagery'

const mockRunSpecialistStream = vi.mocked(runSpecialistStream)
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

beforeEach(() => {
  vi.clearAllMocks()
})

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
    const call = emit.mock.calls[0]?.[0]
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('hazards')
      expect(call.text).toContain('Hazards analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes mineralogy — calls runSpecialistStream with agent=mineralogy, source=jsc-sample, forwardConfidence=true', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mineralogy', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('mineralogy')
    expect(opts?.citationSource).toBe('jsc-sample')
    expect(opts?.forwardConfidence).toBe(true)
    expect(opts?.emit).toBe(emit)
    expect(typeof opts?.system).toBe('string')
    expect(typeof opts?.user).toBe('string')
  })

  it('routes orbit — calls runSpecialistStream with agent=orbit, source=svs, forwardConfidence=false', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('orbit', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('orbit')
    expect(opts?.citationSource).toBe('svs')
    expect(opts?.forwardConfidence).toBe(false)
  })

  it('routes mission-history — calls runSpecialistStream with agent=mission-history, source=nasa-image, forwardConfidence=false', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mission-history', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('mission-history')
    expect(opts?.citationSource).toBe('nasa-image')
    expect(opts?.forwardConfidence).toBe(false)
  })

  it('routes imagery — delegates to runImageryAgent with imageAssetIds', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('imagery', { dataContext: fakeDataContext, imageAssetIds: ['AS16-M-0273'] }, emit)
    expect(mockRunImageryAgent).toHaveBeenCalledWith({
      dataContext: fakeDataContext,
      imageAssetIds: ['AS16-M-0273'],
      emit,
    })
  })

  it('unknown agentId — emits nothing and does not throw', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('unknown-agent' as Parameters<typeof runSpecialist>[0], { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).not.toHaveBeenCalled()
  })
})
