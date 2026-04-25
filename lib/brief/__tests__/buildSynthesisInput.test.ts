import { describe, it, expect } from 'vitest'
import { buildSynthesisInput } from '../buildSynthesisInput'
import type { AgentId } from '@/lib/constants/agents'
import type { SingleAgentState } from '@/components/screen3/useAgentStream'

function makeAgentState(
  overrides: Partial<SingleAgentState> = {},
): SingleAgentState {
  return {
    status: 'complete',
    body: [],
    citations: [],
    ...overrides,
  }
}

describe('buildSynthesisInput', () => {
  it('returns empty record for empty inputs', () => {
    const result = buildSynthesisInput({}, [])
    expect(result).toEqual({})
  })

  it('excludes data-ingest agent', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      'data-ingest': makeAgentState({ body: [{ kind: 'text', text: 'data' }] }),
    }
    const result = buildSynthesisInput(agentStates, ['data-ingest'])
    expect(result).toEqual({})
  })

  it('excludes stub agents (thermal, topography, hazards)', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      thermal: makeAgentState({ body: [{ kind: 'text', text: 'thermal data' }] }),
      topography: makeAgentState({ body: [{ kind: 'text', text: 'topo data' }] }),
      hazards: makeAgentState({ body: [{ kind: 'text', text: 'hazards data' }] }),
    }
    const result = buildSynthesisInput(agentStates, ['thermal', 'topography', 'hazards'])
    expect(result).toEqual({})
  })

  it('concatenates text segments with no separator', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      mineralogy: makeAgentState({
        body: [
          { kind: 'text', text: 'Basalt found here. ' },
          { kind: 'text', text: 'KREEP signatures detected.' },
        ],
      }),
    }
    const result = buildSynthesisInput(agentStates, ['mineralogy'])
    expect(result['mineralogy']).toBe('Basalt found here. KREEP signatures detected.')
  })

  it('drops confidence segments', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      orbit: makeAgentState({
        body: [
          { kind: 'text', text: 'Illumination window: 14 days.' },
          { kind: 'confidence', level: 'high' },
          { kind: 'text', text: ' Polar shadow present.' },
        ],
      }),
    }
    const result = buildSynthesisInput(agentStates, ['orbit'])
    expect(result['orbit']).toBe('Illumination window: 14 days. Polar shadow present.')
    expect(result['orbit']).not.toContain('high')
    expect(result['orbit']).not.toContain('confidence')
  })

  it('appends Citations line when citations are present', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      mineralogy: makeAgentState({
        body: [{ kind: 'text', text: 'Sample analysis complete.' }],
        citations: [
          { source: 'jsc-sample', id: '14310' },
          { source: 'lroc', id: 'M1334189784LE' },
        ],
      }),
    }
    const result = buildSynthesisInput(agentStates, ['mineralogy'])
    expect(result['mineralogy']).toContain('Sample analysis complete.')
    expect(result['mineralogy']).toContain('\nCitations: jsc-sample:14310, lroc:M1334189784LE')
  })

  it('does not append Citations line when no citations', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      orbit: makeAgentState({
        body: [{ kind: 'text', text: 'Orbit data here.' }],
        citations: [],
      }),
    }
    const result = buildSynthesisInput(agentStates, ['orbit'])
    expect(result['orbit']).toBe('Orbit data here.')
    expect(result['orbit']).not.toContain('Citations:')
  })

  it('skips agents missing from agentStates', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      mineralogy: makeAgentState({ body: [{ kind: 'text', text: 'data' }] }),
    }
    const result = buildSynthesisInput(agentStates, ['mineralogy', 'orbit'])
    expect(result).toHaveProperty('mineralogy')
    expect(result).not.toHaveProperty('orbit')
  })

  it('includes all valid main-panel agents when all present', () => {
    const agentStates: Partial<Record<AgentId, SingleAgentState>> = {
      mineralogy: makeAgentState({ body: [{ kind: 'text', text: 'minerals' }] }),
      orbit: makeAgentState({ body: [{ kind: 'text', text: 'orbit' }] }),
      'mission-history': makeAgentState({ body: [{ kind: 'text', text: 'history' }] }),
      imagery: makeAgentState({ body: [{ kind: 'text', text: 'images' }] }),
    }
    const result = buildSynthesisInput(agentStates, [
      'data-ingest',
      'mineralogy',
      'orbit',
      'mission-history',
      'imagery',
    ])
    expect(Object.keys(result)).toHaveLength(4)
    expect(result).toHaveProperty('mineralogy')
    expect(result).toHaveProperty('orbit')
    expect(result).toHaveProperty('mission-history')
    expect(result).toHaveProperty('imagery')
    expect(result).not.toHaveProperty('data-ingest')
  })
})
