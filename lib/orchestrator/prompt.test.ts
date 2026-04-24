import { describe, it, expect } from 'vitest'
import { buildOrchestratorPrompt } from './prompt'
import type { LunarLocation } from '@/components/globe/types'

const baseLocation: LunarLocation = {
  id: 'tycho',
  name: 'Tycho',
  lat: -43,
  lon: -11,
  significance: 'Most prominent young crater; bright ray system visible from Earth with naked eye',
  isProposed: false,
  coords: '43°S, 11°W',
  region: 'NEAR SIDE',
}

const proposedLocation: LunarLocation = {
  id: 'carroll',
  name: 'Carroll',
  lat: 18.84,
  lon: -86.51,
  significance: 'Sits near the near/far side boundary — visible from Earth at certain libration angles.',
  isProposed: true,
  coords: '18.84°N, 86.51°W',
  region: 'FAR SIDE',
}

describe('buildOrchestratorPrompt', () => {
  it('user string contains "Has attached images: no" when hasImages is false', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'Tell me about this crater' })
    expect(user).toContain('Has attached images: no')
  })

  it('user string contains "Has attached images: yes" when hasImages is true', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: true, query: 'Analyze these images' })
    expect(user).toContain('Has attached images: yes')
  })

  it('user string contains location name', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    expect(user).toContain('Tycho')
  })

  it('user string contains lat and lon', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    expect(user).toContain('-43')
    expect(user).toContain('-11')
  })

  it('user string contains region', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    expect(user).toContain('NEAR SIDE')
  })

  it('user string contains significance', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    expect(user).toContain('Most prominent young crater')
  })

  it('user string contains "(proposed name, pending IAU approval)" for proposed locations', () => {
    const { user } = buildOrchestratorPrompt({ location: proposedLocation, hasImages: false, query: 'test' })
    expect(user).toContain('(proposed name, pending IAU approval)')
  })

  it('user string does not contain proposed suffix for non-proposed locations', () => {
    const { user } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    expect(user).not.toContain('pending IAU approval')
  })

  it('system prompt contains all 8 agent ids', () => {
    const { system } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    const agentIds = ['data-ingest', 'imagery', 'mineralogy', 'orbit', 'mission-history', 'thermal', 'topography', 'hazards']
    for (const id of agentIds) {
      expect(system).toContain(id)
    }
  })

  it('system prompt contains the ---AGENTS--- delimiter string', () => {
    const { system } = buildOrchestratorPrompt({ location: baseLocation, hasImages: false, query: 'test' })
    expect(system).toContain('---AGENTS---')
  })
})
