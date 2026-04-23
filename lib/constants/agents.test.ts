import { describe, it, expect } from 'vitest'
import { AGENTS } from './agents'
import type { AgentId } from './agents'

describe('AGENTS constant', () => {
  it('contains exactly 8 agents', () => {
    expect(AGENTS).toHaveLength(8)
  })

  it('has unique ids', () => {
    const ids = AGENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(8)
  })

  it('order matches spec: data-ingest first, hazards last', () => {
    expect(AGENTS[0]?.id).toBe('data-ingest')
    expect(AGENTS[7]?.id).toBe('hazards')
  })

  it('order matches spec exactly', () => {
    const expectedOrder: AgentId[] = [
      'data-ingest',
      'imagery',
      'mineralogy',
      'orbit',
      'mission-history',
      'thermal',
      'topography',
      'hazards',
    ]
    expect(AGENTS.map((a) => a.id)).toEqual(expectedOrder)
  })

  it('real agents are not stubs', () => {
    const realIds: AgentId[] = ['data-ingest', 'imagery', 'mineralogy', 'orbit', 'mission-history']
    for (const id of realIds) {
      const agent = AGENTS.find((a) => a.id === id)
      expect(agent?.isStub, `${id} should not be a stub`).toBe(false)
    }
  })

  it('Thermal, Topography, Hazards are stubs', () => {
    const stubIds: AgentId[] = ['thermal', 'topography', 'hazards']
    for (const id of stubIds) {
      const agent = AGENTS.find((a) => a.id === id)
      expect(agent?.isStub, `${id} should be a stub`).toBe(true)
    }
  })

  it('has exactly 3 stub agents and 5 real agents', () => {
    expect(AGENTS.filter((a) => a.isStub)).toHaveLength(3)
    expect(AGENTS.filter((a) => !a.isStub)).toHaveLength(5)
  })

  it('every agent has a non-empty label', () => {
    for (const agent of AGENTS) {
      expect(agent.label.trim().length).toBeGreaterThan(0)
    }
  })
})
