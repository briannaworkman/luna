import { describe, it, expect } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import { buildMineralogyPrompt } from './mineralogy-prompt'

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
