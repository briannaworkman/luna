import { describe, it, expect } from 'vitest'
import { AGENT_TOPIC_MAP, TOPIC_ORDER, groupFindingsByTopic } from '../topicMap'
import type { BriefSection } from '@/lib/types/brief'

const makeFinding = (claim: string) => ({
  claim,
  confidence: 'High' as const,
  corroboratedBy: [],
  citations: [],
})

describe('AGENT_TOPIC_MAP', () => {
  it('maps all four main-panel agents to topics', () => {
    expect(AGENT_TOPIC_MAP['mineralogy']).toBe('Geology')
    expect(AGENT_TOPIC_MAP['imagery']).toBe('Surface imagery')
    expect(AGENT_TOPIC_MAP['mission-history']).toBe('Mission history')
    expect(AGENT_TOPIC_MAP['orbit']).toBe('Orbital considerations')
  })

  it('does not map stub agents', () => {
    expect(AGENT_TOPIC_MAP['thermal']).toBeUndefined()
    expect(AGENT_TOPIC_MAP['topography']).toBeUndefined()
    expect(AGENT_TOPIC_MAP['hazards']).toBeUndefined()
  })

  it('does not map data-ingest', () => {
    expect(AGENT_TOPIC_MAP['data-ingest']).toBeUndefined()
  })
})

describe('TOPIC_ORDER', () => {
  it('has exactly 4 topics', () => {
    expect(TOPIC_ORDER).toHaveLength(4)
  })

  it('contains the expected topics', () => {
    expect(TOPIC_ORDER).toContain('Geology')
    expect(TOPIC_ORDER).toContain('Surface imagery')
    expect(TOPIC_ORDER).toContain('Mission history')
    expect(TOPIC_ORDER).toContain('Orbital considerations')
  })
})

describe('groupFindingsByTopic', () => {
  it('groups mineralogy findings into Geology topic', () => {
    const sections: BriefSection[] = [
      {
        agentId: 'mineralogy',
        agentName: 'Mineralogy',
        findings: [makeFinding('Basalt found.')],
      },
    ]
    const groups = groupFindingsByTopic(sections)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.topic).toBe('Geology')
    expect(groups[0]!.findings[0]!.claim).toBe('Basalt found.')
    expect(groups[0]!.findings[0]!.agentId).toBe('mineralogy')
    expect(groups[0]!.findings[0]!.agentName).toBe('Mineralogy')
  })

  it('drops unmapped agents (e.g., stub agents)', () => {
    const sections: BriefSection[] = [
      {
        agentId: 'thermal',
        agentName: 'Thermal',
        findings: [makeFinding('Surface temp data.')],
      },
      {
        agentId: 'mineralogy',
        agentName: 'Mineralogy',
        findings: [makeFinding('KREEP detected.')],
      },
    ]
    const groups = groupFindingsByTopic(sections)
    // Only mineralogy should appear
    expect(groups).toHaveLength(1)
    expect(groups[0]!.topic).toBe('Geology')
  })

  it('merges multiple sections from same topic correctly', () => {
    // Even though only one agent maps to Geology, verify findings are attributed correctly
    const sections: BriefSection[] = [
      {
        agentId: 'mineralogy',
        agentName: 'Mineralogy',
        findings: [makeFinding('Finding 1.'), makeFinding('Finding 2.')],
      },
    ]
    const groups = groupFindingsByTopic(sections)
    expect(groups[0]!.findings).toHaveLength(2)
  })

  it('preserves TOPIC_ORDER ordering in results', () => {
    const sections: BriefSection[] = [
      { agentId: 'orbit', agentName: 'Orbit', findings: [makeFinding('Orbit fact.')] },
      { agentId: 'mineralogy', agentName: 'Mineralogy', findings: [makeFinding('Mineral fact.')] },
      { agentId: 'imagery', agentName: 'Imagery', findings: [makeFinding('Image fact.')] },
      { agentId: 'mission-history', agentName: 'Mission history', findings: [makeFinding('History fact.')] },
    ]
    const groups = groupFindingsByTopic(sections)
    expect(groups.map((g) => g.topic)).toEqual([
      'Geology',
      'Surface imagery',
      'Mission history',
      'Orbital considerations',
    ])
  })

  it('returns empty array when no sections', () => {
    const groups = groupFindingsByTopic([])
    expect(groups).toEqual([])
  })

  it('returns empty array when all sections are unmapped agents', () => {
    const sections: BriefSection[] = [
      { agentId: 'thermal', agentName: 'Thermal', findings: [makeFinding('Heat.')] },
    ]
    const groups = groupFindingsByTopic(sections)
    expect(groups).toEqual([])
  })
})
