import { describe, it, expect } from 'vitest'
import { buildSynthesisPrompt } from './prompt'
import type { DataCompleteness } from './completeness'

const baseCompleteness: DataCompleteness = {
  'LROC NAC': 'Confirmed',
  'LROC WAC': 'Confirmed',
  'JSC Samples': 'Partial',
  'SVS Illumination': 'Confirmed',
  'NASA Image Library': 'Confirmed',
}

const baseInput = {
  locationName: 'Tycho',
  lat: -43,
  lon: -11,
  isProposed: false,
  query: 'What minerals exist here?',
  generatedAt: '2026-04-24T00:00:00.000Z',
  completeness: baseCompleteness,
  activeAgents: ['data-ingest', 'mineralogy', 'orbit', 'mission-history'],
  agentOutputs: {
    'mineralogy': 'Mineralogy output text here.',
    'orbit': 'Orbit output text here.',
    'mission-history': 'Mission history output text here.',
  },
}

describe('buildSynthesisPrompt', () => {
  it('filters data-ingest from active agents list shown to model', () => {
    const { user } = buildSynthesisPrompt(baseInput)
    // data-ingest should not appear in the ACTIVE AGENTS section
    const agentsSection = user.split('ACTIVE AGENTS')[1]?.split('AGENT OUTPUTS')[0] ?? ''
    expect(agentsSection).not.toContain('data-ingest')
  })

  it('filters stub agents (thermal, topography, hazards) from active agents and output sections', () => {
    const input = {
      ...baseInput,
      activeAgents: ['data-ingest', 'mineralogy', 'thermal', 'topography', 'hazards'],
      agentOutputs: {
        mineralogy: 'Mineralogy text.',
        thermal: 'Thermal placeholder.',
        topography: 'Topography placeholder.',
        hazards: 'Hazards placeholder.',
      },
    }
    const { user } = buildSynthesisPrompt(input)
    expect(user).not.toContain('thermal')
    expect(user).not.toContain('topography')
    expect(user).not.toContain('hazards')
    expect(user).toContain('mineralogy')
  })

  it('omits agents that are active but missing from agentOutputs', () => {
    const input = {
      ...baseInput,
      activeAgents: ['mineralogy', 'orbit'],
      agentOutputs: {
        mineralogy: 'Mineralogy text.',
        // orbit is missing
      },
    }
    const { user } = buildSynthesisPrompt(input)
    // orbit should not appear in AGENT OUTPUTS
    expect(user).not.toContain('--- AGENT: orbit')
  })

  it('includes "(proposed name, pending IAU approval)" suffix when isProposed is true', () => {
    const input = { ...baseInput, isProposed: true, locationName: 'Carroll' }
    const { user } = buildSynthesisPrompt(input)
    expect(user).toContain('Carroll (proposed name, pending IAU approval)')
  })

  it('does not include proposed suffix when isProposed is false', () => {
    const { user } = buildSynthesisPrompt(baseInput)
    expect(user).not.toContain('proposed name')
  })

  it('includes completeness values verbatim in DATA COMPLETENESS section', () => {
    const completeness: DataCompleteness = {
      'LROC NAC': 'Incomplete',
      'LROC WAC': 'Partial',
      'JSC Samples': 'Analogue only',
      'SVS Illumination': 'Confirmed',
      'NASA Image Library': 'Partial',
    }
    const { user } = buildSynthesisPrompt({ ...baseInput, completeness })
    expect(user).toContain('LROC NAC: Incomplete')
    expect(user).toContain('LROC WAC: Partial')
    expect(user).toContain('JSC Samples: Analogue only')
    expect(user).toContain('SVS Illumination: Confirmed')
    expect(user).toContain('NASA Image Library: Partial')
  })

  it('resolves agent labels correctly from AGENTS constant', () => {
    const { user } = buildSynthesisPrompt(baseInput)
    expect(user).toContain('--- AGENT: mineralogy (Mineralogy) ---')
    expect(user).toContain('--- AGENT: orbit (Orbit) ---')
    expect(user).toContain('--- AGENT: mission-history (Mission history) ---')
  })

  it('includes generatedAt value in user message', () => {
    const { user } = buildSynthesisPrompt(baseInput)
    expect(user).toContain('2026-04-24T00:00:00.000Z')
  })

  it('includes query in user message', () => {
    const { user } = buildSynthesisPrompt(baseInput)
    expect(user).toContain('What minerals exist here?')
  })

  it('includes location name in user message', () => {
    const { user } = buildSynthesisPrompt(baseInput)
    expect(user).toContain('Location: Tycho')
  })

  it('returns SYNTHESIS_SYSTEM_PROMPT as system', () => {
    const { system } = buildSynthesisPrompt(baseInput)
    expect(system).toContain('synthesis engine for LUNA')
  })

  it('handles empty agentOutputs gracefully', () => {
    const input = {
      ...baseInput,
      activeAgents: [],
      agentOutputs: {},
    }
    expect(() => buildSynthesisPrompt(input)).not.toThrow()
  })
})
