import { describe, it, expect, vi } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import { runSpecialist } from './specialists'

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
    await runSpecialist('thermal', fakeDataContext, emit)
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

  it('routes mineralogy (real, TODO) — emits nothing', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mineralogy', fakeDataContext, emit)
    expect(emit).not.toHaveBeenCalled()
  })

  it('unknown agentId — emits nothing and does not throw', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    // Cast to satisfy TypeScript — testing the runtime guard
    await runSpecialist('unknown-agent' as Parameters<typeof runSpecialist>[0], fakeDataContext, emit)
    expect(emit).not.toHaveBeenCalled()
  })
})
