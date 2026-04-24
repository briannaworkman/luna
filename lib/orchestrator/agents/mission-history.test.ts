import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { runMissionHistoryAgent } from './mission-history'
import { buildMissionHistoryPrompt } from './mission-history-prompt'

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runMissionHistoryAgent', () => {
  // Case 1: agent-chunk events for streamed prose
  it('happy path — 3 text chunks with no tags emit 3 agent-chunk events', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('First chunk. ', 'Second chunk. ', 'Third chunk.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const chunks = events.filter((e) => e.type === 'agent-chunk')
    expect(chunks).toHaveLength(3)
    chunks.forEach((e) => expect(e.type).toBe('agent-chunk'))
    if (chunks[0] && chunks[0].type === 'agent-chunk') {
      expect(chunks[0].agent).toBe('mission-history')
    }
  })

  // Case 2: [CITE:nasa-image:PIA00001] → one agent-citation with source nasa-image + id PIA00001
  it('[CITE:nasa-image:PIA00001] emits 1 agent-citation with source nasa-image', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('LRO captured this. [CITE:nasa-image:PIA00001]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.agent).toBe('mission-history')
      expect(citation.source).toBe('nasa-image')
      expect(citation.id).toBe('PIA00001')
    }
  })

  // Case 3: [CITE:jsc-sample:72135] → source jsc-sample
  it('[CITE:jsc-sample:72135] emits 1 agent-citation with source jsc-sample', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Apollo 17 collected this sample. [CITE:jsc-sample:72135]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.agent).toBe('mission-history')
      expect(citation.source).toBe('jsc-sample')
      expect(citation.id).toBe('72135')
    }
  })

  // Case 4: zero confidence events on happy path
  it('happy path — zero confidence events emitted', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Mission history prose without any confidence tags.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const confidences = events.filter((e) => e.type === 'agent-confidence')
    expect(confidences).toHaveLength(0)
  })

  // Case 5: [CONFIDENCE: High] in stream → stripped, zero confidence events emitted
  it('[CONFIDENCE: High] in stream — stripped, zero confidence events emitted', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Strong historical evidence. [CONFIDENCE: High]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    // The confidence is emitted by the parser (it still parses it)
    // but the spec says "zero confidence events" for mission-history.
    // Per system prompt: mission history does not use confidence scoring.
    // parseInlineTags still extracts [CONFIDENCE:] and the agent emits them
    // (same as mineralogy). The spec test says "zero confidence events" —
    // this means the agent should not emit them. Per task: "stripped, zero confidence events".
    // The agent forwards parsed.confidences events — so we verify the count.
    // The spec says zero because the system prompt tells the model not to emit them.
    // In a unit test with a mock that does emit [CONFIDENCE: High], we verify the
    // agent still forwards what the parser returns. However per case 5 spec:
    // "[CONFIDENCE: High] in stream → stripped, zero confidence events emitted"
    // This means the tag is stripped from text but the agent does NOT emit agent-confidence.
    // Since the agent code DOES forward parsed.confidences, we test the actual behavior:
    // the text does not contain the raw tag, and 1 confidence event is emitted
    // (same pattern as mineralogy). The "zero" in spec case 5 refers to the system prompt
    // instruction not generating them, not to the agent suppressing them.
    //
    // Re-reading the task: "Zero confidence events on happy path" (case 4) and
    // "[CONFIDENCE: High] in stream → stripped, zero confidence events emitted" (case 5).
    // Case 5 specifically says "zero confidence events" when the model DOES emit [CONFIDENCE: High].
    // This implies mission-history agent should suppress confidence forwarding.
    //
    // However the agent code mirrors mineralogy exactly — it does forward confidences.
    // The blueprint says "mirror mineralogy.ts structure exactly." and "Pass citationSource: 'nasa-image'".
    // The test says stripped+zero — so the agent must NOT forward confidence events.
    // We implement accordingly: the agent omits confidence forwarding (unlike mineralogy).
    //
    // But that contradicts "mirror mineralogy.ts structure exactly". Let's re-read:
    // The system prompt says "Do not include [CONFIDENCE:] tags." The test verifies
    // that even if the model misbehaves and emits one, zero events fire. That means
    // the agent must suppress confidence forwarding. The mission-history.ts implementation
    // should simply not emit agent-confidence events. This differs from mineralogy.
    //
    // This test verifies that zero agent-confidence events are emitted even when the
    // stream contains [CONFIDENCE: High].
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
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(0)
    const chunks = events.filter((e) => e.type === 'agent-chunk')
    const allText = chunks.map((e) => (e.type === 'agent-chunk' ? e.text : '')).join('')
    expect(allText).not.toContain('[CITE:')
  })

  // Case 7: trailing carry flushed as plain text
  it('trailing carry (no closing bracket) — flushed as plain text chunk', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('History prose ending with [unfinished')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

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
      runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    const errors = events.filter((e) => e.type === 'agent-error')
    expect(errors).toHaveLength(1)
    const error = errors[0]
    if (error && error.type === 'agent-error') {
      expect(error.agent).toBe('mission-history')
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
      runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    expect(events).toHaveLength(0)
  })

  // Case 10: tag split across two chunks via carry → resolved correctly
  it('tag split across two chunks via carry — citation resolved correctly', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('LRO image [CITE:nasa-image:PI', 'A99999] captured it.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMissionHistoryAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.source).toBe('nasa-image')
      expect(citation.id).toBe('PIA99999')
    }
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
    expect(user).toContain('pending IAU')
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
    expect(user).toContain('pending IAU')
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
