import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext } from '@/lib/types/agent'

vi.mock('./runSpecialistStream', () => ({
  runSpecialistStream: vi.fn().mockResolvedValue(undefined),
}))

import { runMineralogyAgent } from './mineralogy'
import { buildMineralogyPrompt } from './mineralogy-prompt'
import { runSpecialistStream } from './runSpecialistStream'

const mockRunSpecialistStream = vi.mocked(runSpecialistStream)

const baseDataContext: DataContext = {
  location: {
    name: 'Shackleton',
    lat: -89.9,
    lon: 0,
    diameterKm: 21,
    significanceNote: 'Artemis I landing zone candidate, near south pole',
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

describe('runMineralogyAgent', () => {
  it('delegates to runSpecialistStream with agent=mineralogy, source=jsc-sample, forwardConfidence=true', async () => {
    const emit = vi.fn()
    await runMineralogyAgent({ dataContext: baseDataContext, emit })

    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('mineralogy')
    expect(opts?.citationSource).toBe('jsc-sample')
    expect(opts?.forwardConfidence).toBe(true)
    expect(opts?.emit).toBe(emit)
    expect(typeof opts?.system).toBe('string')
    expect(typeof opts?.user).toBe('string')
  })
})

describe('buildMineralogyPrompt', () => {
  it('jscSamples null — user msg contains "No sample data available"', () => {
    const { user } = buildMineralogyPrompt({ dataContext: { ...baseDataContext, jscSamples: null } })
    expect(user).toContain('No sample data available')
  })

  it('far-side location — user msg contains "No Apollo station within 500 km"', () => {
    const farSideContext: DataContext = {
      ...baseDataContext,
      location: {
        name: 'Far Side',
        lat: 0,
        lon: 180,
        diameterKm: null,
        significanceNote: 'Far side test location',
        isProposed: false,
      },
      jscSamples: null,
    }
    const { user } = buildMineralogyPrompt({ dataContext: farSideContext })
    expect(user).toContain('No Apollo station within 500 km')
  })
})
