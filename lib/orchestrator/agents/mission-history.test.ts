import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext } from '@/lib/types/agent'

vi.mock('./runSpecialistStream', () => ({
  runSpecialistStream: vi.fn().mockResolvedValue(undefined),
}))

import { runMissionHistoryAgent } from './mission-history'
import { buildMissionHistoryPrompt } from './mission-history-prompt'
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runMissionHistoryAgent', () => {
  it('delegates to runSpecialistStream with agent=mission-history, source=nasa-image, forwardConfidence=false', async () => {
    const emit = vi.fn()
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit })

    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('mission-history')
    expect(opts?.citationSource).toBe('nasa-image')
    expect(opts?.forwardConfidence).toBe(false)
    expect(opts?.emit).toBe(emit)
    expect(typeof opts?.system).toBe('string')
    expect(typeof opts?.user).toBe('string')
  })
})

describe('buildMissionHistoryPrompt', () => {
  // Carroll → user msg contains naming story + "pending IAU"
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
    // Assert on text unique to the NAMING_STORY block — "pending IAU" already
    // appears in the location line for any proposed location and would
    // pass vacuously.
    expect(user).toContain('bright spot on the moon')
  })

  // Integrity → user msg contains naming story + "distance record"
  it('Integrity location — user msg contains naming story and "distance record"', () => {
    const integrityContext: DataContext = {
      location: {
        name: 'Integrity',
        lat: 2.66,
        lon: -104.92,
        diameterKm: null,
        significanceNote: 'Located just northwest of Orientale basin on the far side of the Moon — never visible from Earth.',
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
    // Assert on text unique to the NAMING_STORY block rather than "pending IAU",
    // which is already in the location line for any proposed location.
    expect(user).toContain('Orion spacecraft')
  })

  // Non-proposed location → no NAMING_STORY block
  it('non-proposed location — no NAMING_STORY block in user msg', () => {
    const { user } = buildMissionHistoryPrompt({ dataContext: baseDataContext })
    expect(user).not.toContain('NAMING_STORY')
  })

  // No NASA images → user msg contains "No NASA image records available"
  it('no NASA images — user msg contains "No NASA image records available"', () => {
    const { user } = buildMissionHistoryPrompt({ dataContext: { ...baseDataContext, nasaImages: null } })
    expect(user).toContain('No NASA image records available')
  })

  // No nearest station within 500 km → user msg contains "No Apollo station within 500 km"
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
