import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import type { IlluminationWindow } from '@/lib/types/nasa'

vi.mock('./runSpecialistStream', () => ({
  runSpecialistStream: vi.fn().mockResolvedValue(undefined),
}))

import { runOrbitAgent } from './orbit'
import { buildOrbitPrompt } from './orbit-prompt'
import { runSpecialistStream } from './runSpecialistStream'

const mockRunSpecialistStream = vi.mocked(runSpecialistStream)

const baseDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater; bright ray system visible from Earth with naked eye',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

const sampleWindows: IlluminationWindow[] = [
  {
    date: '2026-04-10',
    sunriseUtc: '2026-04-10T06:00:00Z',
    sunsetUtc: '2026-04-10T20:00:00Z',
    illuminatedHours: 14,
    solarElevationDeg: 25,
    permanentlyShadowed: false,
  },
  {
    date: '2026-04-11',
    sunriseUtc: '2026-04-11T06:00:00Z',
    sunsetUtc: '2026-04-11T20:00:00Z',
    illuminatedHours: 14,
    solarElevationDeg: 27,
    permanentlyShadowed: false,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runOrbitAgent', () => {
  it('delegates to runSpecialistStream with agent=orbit, source=svs, forwardConfidence=false', async () => {
    const emit = vi.fn()
    await runOrbitAgent({ dataContext: baseDataContext, emit })

    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('orbit')
    expect(opts?.citationSource).toBe('svs')
    expect(opts?.forwardConfidence).toBe(false)
    expect(opts?.emit).toBe(emit)
    expect(typeof opts?.system).toBe('string')
    expect(typeof opts?.user).toBe('string')
  })
})

describe('buildOrbitPrompt', () => {
  // illuminationWindows === null → user msg contains "Illumination data unavailable"
  it('illuminationWindows null — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: null } })
    expect(user).toContain('Illumination data unavailable')
  })

  // illuminationWindows === [] → same fallback
  it('illuminationWindows empty array — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: [] } })
    expect(user).toContain('Illumination data unavailable')
  })

  // Happy path with data → user msg contains serialized JSON
  it('illuminationWindows with data — user msg contains serialized JSON', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: sampleWindows } })
    expect(user).toContain(JSON.stringify(sampleWindows))
  })

  // location.isProposed === true → user msg contains "proposed name"
  it('isProposed location — user msg contains "proposed name"', () => {
    const proposedContext: DataContext = {
      ...baseDataContext,
      location: {
        name: 'Carroll',
        lat: 18.84,
        lon: -86.51,
        diameterKm: null,
        significanceNote: 'Sits near the near/far side boundary.',
        isProposed: true,
      },
    }
    const { user } = buildOrbitPrompt({ dataContext: proposedContext })
    expect(user).toContain('proposed name')
  })
})
