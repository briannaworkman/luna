import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { IlluminationWindow } from '@/lib/types/nasa'

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { runOrbitAgent } from './orbit'
import { buildOrbitPrompt } from './orbit-prompt'

const mockGetAnthropic = vi.mocked(getAnthropic)

type StreamChunk =
  | { type: 'content_block_delta'; index: number; delta: { type: 'text_delta'; text: string } }
  | { type: 'other' }

async function* makeStreamChunks(...strings: string[]): AsyncIterable<StreamChunk> {
  for (const text of strings) {
    yield {
      type: 'content_block_delta' as const,
      index: 0,
      delta: { type: 'text_delta' as const, text },
    }
  }
}

async function* makeEmptyStream(): AsyncIterable<StreamChunk> {
  // yields nothing
}

function makeMockClient(chunks: AsyncIterable<StreamChunk>) {
  return {
    messages: {
      stream: () => chunks,
    },
  }
}

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runOrbitAgent', () => {
  // Case 1: happy path — 2 text chunks → 2 agent-chunk events
  it('happy path — 2 text chunks with no tags emit 2 agent-chunk events', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('First illumination paragraph. ', 'Second comms paragraph.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const chunks = events.filter((e) => e.type === 'agent-chunk')
    expect(chunks).toHaveLength(2)
    chunks.forEach((e) => expect(e.type).toBe('agent-chunk'))
    if (chunks[0] && chunks[0].type === 'agent-chunk') {
      expect(chunks[0].agent).toBe('orbit')
    }
  })

  // Case 2: [CITE:svs:SVS-5587] → 1 agent-citation with source=svs, id=SVS-5587
  it('[CITE:svs:SVS-5587] emits 1 agent-citation with source svs and id SVS-5587', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Illumination data shows good windows. [CITE:svs:SVS-5587]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.agent).toBe('orbit')
      expect(citation.source).toBe('svs')
      expect(citation.id).toBe('SVS-5587')
    }
  })

  // Case 3: legacy [CITE: SVS-5587] via fallback → source=svs (from opts)
  it('legacy [CITE: SVS-5587] (no explicit source) → source=svs from opts fallback', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('NASA dataset supports this. [CITE: SVS-5587]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.source).toBe('svs')
      expect(citation.id).toBe('SVS-5587')
    }
  })

  // Case 4: zero confidence events on happy path
  it('happy path — zero confidence events emitted', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Orbit analysis prose without any confidence tags.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const confidences = events.filter((e) => e.type === 'agent-confidence')
    expect(confidences).toHaveLength(0)
  })

  // Case 5: [CONFIDENCE: High] in stream → stripped, zero confidence events emitted (orbit suppresses)
  it('[CONFIDENCE: High] in stream — stripped, zero confidence events emitted', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Strong illumination evidence. [CONFIDENCE: High]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    // Orbit suppresses confidence forwarding per spec
    const confidences = events.filter((e) => e.type === 'agent-confidence')
    expect(confidences).toHaveLength(0)
    // Text must not contain the raw tag
    const chunks = events.filter((e) => e.type === 'agent-chunk')
    const allText = chunks.map((e) => (e.type === 'agent-chunk' ? e.text : '')).join('')
    expect(allText).not.toContain('[CONFIDENCE:')
  })

  // Case 6: [CITE:unknown-source:foo] → stripped, zero citation events
  it('[CITE:unknown-source:foo] — stripped, zero citation events', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Some claim. [CITE:unknown-source:foo]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(0)
    const chunks = events.filter((e) => e.type === 'agent-chunk')
    const allText = chunks.map((e) => (e.type === 'agent-chunk' ? e.text : '')).join('')
    expect(allText).not.toContain('[CITE:')
  })

  // Case 7: trailing carry flushed as plain text
  it('trailing carry (no closing bracket) — flushed as plain text chunk', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Orbit prose ending with [unfinished')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const chunks = events.filter((e) => e.type === 'agent-chunk')
    const allText = chunks.map((e) => (e.type === 'agent-chunk' ? e.text : '')).join('')
    expect(allText).toContain('[unfinished')
  })

  // Case 8: stream error → agent-error emitted, no throw
  it('stream throws — agent-error is emitted and function resolves without throwing', async () => {
    mockGetAnthropic.mockReturnValue({
      messages: {
        stream: () => {
          throw new Error('Network failure')
        },
      },
    } as unknown as ReturnType<typeof getAnthropic>)

    const events: OrchestratorEvent[] = []
    await expect(
      runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    const errors = events.filter((e) => e.type === 'agent-error')
    expect(errors).toHaveLength(1)
    const error = errors[0]
    if (error && error.type === 'agent-error') {
      expect(error.agent).toBe('orbit')
      expect(error.message).toContain('Network failure')
    }
  })

  // Case 9: empty stream → zero events, no throw
  it('empty stream — zero events emitted and function resolves without throwing', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeEmptyStream()) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await expect(
      runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    expect(events).toHaveLength(0)
  })

  // Case 10: tag split across chunks → resolved correctly
  it('tag split across two chunks via carry — citation resolved correctly', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('SVS data confirms this. [CITE:svs:SVS-', '5587] for this window.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrbitAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.source).toBe('svs')
      expect(citation.id).toBe('SVS-5587')
    }
  })
})

describe('buildOrbitPrompt', () => {
  // illuminationWindows === null → user msg contains "Illumination data unavailable"
  it('illuminationWindows null — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: null } })
    expect(user).toContain('Illumination data unavailable')
  })

  // illuminationWindows === [] → same fallback
  it('illuminationWindows empty array — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: [] } })
    expect(user).toContain('Illumination data unavailable')
  })

  // Happy path with data → user msg contains serialized JSON
  it('illuminationWindows with data — user msg contains serialized JSON', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: sampleWindows } })
    expect(user).toContain(JSON.stringify(sampleWindows))
  })

  // location.isProposed === true → user msg contains "proposed name"
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
