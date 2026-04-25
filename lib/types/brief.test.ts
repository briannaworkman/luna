import { describe, it, expect } from 'vitest'
import { MissionBriefSchema, CompletenessStatusSchema } from './brief'

const validBrief = {
  locationName: 'Tycho',
  query: 'What minerals exist here?',
  generatedAt: '2026-04-24T00:00:00.000Z',
  summary: 'Tycho is a young crater. It has a prominent ray system. Mineralogy data is available. Mission history includes Apollo imagery. Orbital parameters are well-understood.',
  sections: [
    {
      agentId: 'mineralogy',
      agentName: 'Mineralogy',
      findings: [
        {
          claim: 'The crater floor contains anorthosite.',
          confidence: 'High' as const,
          corroboratedBy: ['orbit'],
          citations: ['JSC-12345'],
        },
        {
          claim: 'Impact melt is visible at the rim.',
          confidence: 'Medium' as const,
          corroboratedBy: [],
          citations: [],
        },
        {
          claim: 'Olivine may be present based on spectral data.',
          confidence: 'Low' as const,
          corroboratedBy: [],
          citations: [],
        },
      ],
    },
    {
      agentId: 'orbit',
      agentName: 'Orbit',
      findings: [
        {
          claim: 'The crater has favourable lighting windows in January.',
          confidence: 'High' as const,
          corroboratedBy: [],
          citations: ['SVS-2024-01-01'],
        },
        {
          claim: 'Solar elevation exceeds 10° for 5 hours per day.',
          confidence: 'Medium' as const,
          corroboratedBy: [],
          citations: [],
        },
        {
          claim: 'No permanent shadow at the crater centre.',
          confidence: 'Medium' as const,
          corroboratedBy: [],
          citations: [],
        },
      ],
    },
    {
      agentId: 'mission-history',
      agentName: 'Mission history',
      findings: [
        {
          claim: 'The site was imaged by Apollo 17.',
          confidence: 'High' as const,
          corroboratedBy: [],
          citations: ['NASA-LIB-001'],
        },
        {
          claim: 'Surveyor 7 landed near the rim.',
          confidence: 'High' as const,
          corroboratedBy: [],
          citations: [],
        },
        {
          claim: 'The crater is named after Tycho Brahe.',
          confidence: 'Low' as const,
          corroboratedBy: [],
          citations: [],
        },
      ],
    },
  ],
  followUpQueries: [
    'How does Tycho compare to Copernicus in terms of ray extent?',
    'What landing risks exist at the crater rim?',
    'Is there water ice in permanently shadowed regions near Tycho?',
  ],
  dataCompleteness: {
    'LROC NAC': 'Confirmed',
    'LROC WAC': 'Confirmed',
    'JSC Samples': 'Partial',
    'SVS Illumination': 'Confirmed',
    'NASA Image Library': 'Confirmed',
  },
}

describe('MissionBriefSchema', () => {
  it('validates a well-formed brief', () => {
    const result = MissionBriefSchema.safeParse(validBrief)
    expect(result.success).toBe(true)
  })

  it('enforces followUpQueries length of exactly 3', () => {
    const twoQueries = { ...validBrief, followUpQueries: ['Q1', 'Q2'] }
    expect(MissionBriefSchema.safeParse(twoQueries).success).toBe(false)

    const fourQueries = { ...validBrief, followUpQueries: ['Q1', 'Q2', 'Q3', 'Q4'] }
    expect(MissionBriefSchema.safeParse(fourQueries).success).toBe(false)

    const threeQueries = { ...validBrief, followUpQueries: ['Q1', 'Q2', 'Q3'] }
    expect(MissionBriefSchema.safeParse(threeQueries).success).toBe(true)
  })

  it('rejects invalid confidence value', () => {
    const invalid = {
      ...validBrief,
      sections: [
        {
          agentId: 'mineralogy',
          agentName: 'Mineralogy',
          findings: [
            {
              claim: 'Some claim.',
              confidence: 'VeryHigh',
              corroboratedBy: [],
              citations: [],
            },
          ],
        },
      ],
    }
    expect(MissionBriefSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects invalid completeness value in dataCompleteness', () => {
    const invalid = {
      ...validBrief,
      dataCompleteness: {
        'LROC NAC': 'Excellent',
        'LROC WAC': 'Confirmed',
        'JSC Samples': 'Partial',
        'SVS Illumination': 'Confirmed',
        'NASA Image Library': 'Confirmed',
      },
    }
    expect(MissionBriefSchema.safeParse(invalid).success).toBe(false)
  })

  it('accepts unknown keys in dataCompleteness (record schema)', () => {
    // The schema uses z.record(CompletenessStatusSchema) so unknown keys with valid values are ok
    const withExtra = {
      ...validBrief,
      dataCompleteness: {
        ...validBrief.dataCompleteness,
        'Some New Source': 'Confirmed',
      },
    }
    expect(MissionBriefSchema.safeParse(withExtra).success).toBe(true)
  })

  it('rejects empty generatedAt', () => {
    const invalid = { ...validBrief, generatedAt: '' }
    expect(MissionBriefSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('CompletenessStatusSchema', () => {
  it('accepts all four valid statuses', () => {
    for (const status of ['Confirmed', 'Partial', 'Analogue only', 'Incomplete']) {
      expect(CompletenessStatusSchema.safeParse(status).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(CompletenessStatusSchema.safeParse('Unknown').success).toBe(false)
  })
})
