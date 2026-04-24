import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { runMineralogyAgent } from './mineralogy'

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

function makeMockClient(chunks: AsyncIterable<StreamChunk>) {
  return {
    messages: {
      stream: () => chunks,
    },
  }
}

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runMineralogyAgent', () => {
  it('happy path — 3 text chunks with no tags emit 3 agent-chunk events', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('First chunk. ', 'Second chunk. ', 'Third chunk.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMineralogyAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const chunks = events.filter((e) => e.type === 'agent-chunk')
    expect(chunks).toHaveLength(3)
    chunks.forEach((e) => expect(e.type).toBe('agent-chunk'))
    if (chunks[0] && chunks[0].type === 'agent-chunk') expect(chunks[0].agent).toBe('mineralogy')
  })

  it('single [CITE: 12065] in a chunk emits 1 agent-citation with source jsc-sample', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('The basalt is volcanic. [CITE: 12065]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMineralogyAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.agent).toBe('mineralogy')
      expect(citation.source).toBe('jsc-sample')
      expect(citation.id).toBe('12065')
    }
  })

  it('[CONFIDENCE: High] emits 1 agent-confidence with level high', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Strong evidence here. [CONFIDENCE: High]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMineralogyAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const confidences = events.filter((e) => e.type === 'agent-confidence')
    expect(confidences).toHaveLength(1)
    const conf = confidences[0]
    if (conf && conf.type === 'agent-confidence') {
      expect(conf.agent).toBe('mineralogy')
      expect(conf.level).toBe('high')
    }
  })

  it('tags split across chunks — citation fires only after 2nd chunk', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Claim here [CIT', 'E: 70017] more text.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runMineralogyAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    if (citation && citation.type === 'agent-citation') {
      expect(citation.id).toBe('70017')
    }
  })

  it('jscSamples is null — buildMineralogyPrompt user msg contains no sample data text', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('No data analysis.')) as unknown as ReturnType<typeof getAnthropic>
    )

    // Capture what the stream was called with by inspecting the mock
    let capturedMessages: Array<{ role: string; content: string }> | undefined
    const mockStream = vi.fn((args: { messages: Array<{ role: string; content: string }> }) => {
      capturedMessages = args.messages
      return makeStreamChunks('No data analysis.')
    })
    mockGetAnthropic.mockReturnValue({
      messages: { stream: mockStream },
    } as unknown as ReturnType<typeof getAnthropic>)

    await runMineralogyAgent({ dataContext: { ...baseDataContext, jscSamples: null }, emit: () => {} })

    expect(capturedMessages).toBeDefined()
    const userContent = capturedMessages?.[0]?.content ?? ''
    expect(userContent).toContain('No sample data available')
  })

  it('no nearest station within 500 km — user msg contains "No Apollo station within 500 km"', async () => {
    // Far-side location: lat 0, lon 180 is as far from all Apollo sites as possible
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

    let capturedMessages: Array<{ role: string; content: string }> | undefined
    const mockStream = vi.fn((args: { messages: Array<{ role: string; content: string }> }) => {
      capturedMessages = args.messages
      return makeStreamChunks('Far side analysis.')
    })
    mockGetAnthropic.mockReturnValue({
      messages: { stream: mockStream },
    } as unknown as ReturnType<typeof getAnthropic>)

    await runMineralogyAgent({ dataContext: farSideContext, emit: () => {} })

    expect(capturedMessages).toBeDefined()
    const userContent = capturedMessages?.[0]?.content ?? ''
    expect(userContent).toContain('No Apollo station within 500 km')
  })

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
      runMineralogyAgent({ dataContext: baseDataContext, emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    const errors = events.filter((e) => e.type === 'agent-error')
    expect(errors).toHaveLength(1)
    const error = errors[0]
    if (error && error.type === 'agent-error') {
      expect(error.agent).toBe('mineralogy')
      expect(error.message).toContain('Network failure')
    }
  })
})
