import { describe, it, expect } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import type { IlluminationWindow } from '@/lib/types/nasa'
import { buildOrbitPrompt } from './orbit-prompt'

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

describe('buildOrbitPrompt', () => {
  it('illuminationWindows null — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: null } })
    expect(user).toContain('Illumination data unavailable')
  })

  it('illuminationWindows empty array — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: [] } })
    expect(user).toContain('Illumination data unavailable')
  })

  it('illuminationWindows with data — user msg contains serialized JSON', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: sampleWindows } })
    expect(user).toContain(JSON.stringify(sampleWindows))
  })

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
