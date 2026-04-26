import { describe, it, expect } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import { buildMissionHistoryPrompt } from './mission-history-prompt'

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

describe('buildMissionHistoryPrompt', () => {
  it('Carroll location — user msg contains naming story and "pending IAU"', () => {
    const carrollContext: DataContext = {
      location: {
        name: 'Carroll',
        lat: 18.84,
        lon: -86.51,
        diameterKm: null,
        significanceNote: 'Sits near the near/far side boundary — visible from Earth at certain libration angles.',
        isProposed: true,
      },
      nasaImages: null,
      lrocProducts: null,
      jscSamples: null,
      illuminationWindows: null,
    }
    const { user } = buildMissionHistoryPrompt({ dataContext: carrollContext })
    expect(user).toContain('NAMING_STORY')
    expect(user).toContain('Carroll Taylor Wiseman')
    expect(user).toContain('bright spot on the moon')
  })

  it('Integrity location — user msg contains naming story and "distance record"', () => {
    const integrityContext: DataContext = {
      location: {
        name: 'Integrity',
        lat: 2.66,
        lon: -104.92,
        diameterKm: null,
        significanceNote: 'Located just northwest of Orientale basin on the far side of the Moon.',
        isProposed: true,
      },
      nasaImages: null,
      lrocProducts: null,
      jscSamples: null,
      illuminationWindows: null,
    }
    const { user } = buildMissionHistoryPrompt({ dataContext: integrityContext })
    expect(user).toContain('NAMING_STORY')
    expect(user).toContain('distance record')
    expect(user).toContain('Orion spacecraft')
  })

  it('non-proposed location — no NAMING_STORY block in user msg', () => {
    const { user } = buildMissionHistoryPrompt({ dataContext: baseDataContext })
    expect(user).not.toContain('NAMING_STORY')
  })

  it('no NASA images — user msg contains "No NASA image records available"', () => {
    const { user } = buildMissionHistoryPrompt({ dataContext: { ...baseDataContext, nasaImages: null } })
    expect(user).toContain('No NASA image records available')
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
    const { user } = buildMissionHistoryPrompt({ dataContext: farSideContext })
    expect(user).toContain('No Apollo station within 500 km')
  })
})
