import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataCompleteness } from './completeness'

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk at module level BEFORE any imports that use it
// ---------------------------------------------------------------------------

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { runSynthesis } from './run'

const mockGetAnthropic = vi.mocked(getAnthropic)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeChunk = {
  type: 'content_block_delta'
  index: number
  delta: { type: 'text_delta'; text: string }
}

async function* makeChunks(...texts: string[]): AsyncIterable<FakeChunk> {
  for (const text of texts) {
    yield {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    }
  }
}

function makeMockClient(stream: AsyncIterable<FakeChunk>) {
  return {
    messages: {
      stream: vi.fn().mockReturnValue(stream),
    },
  }
}

// A minimal valid brief JSON
const validBriefJson = JSON.stringify({
  locationName: 'Tycho',
  query: 'What minerals?',
  generatedAt: '2026-04-24T00:00:00.000Z',
  summary: 'Tycho is a well-studied crater. It has a ray system. Mineralogy data is available. Orbit data shows good lighting windows. Mission history is well documented.',
  sections: [
    {
      agentId: 'mineralogy',
      agentName: 'Mineralogy',
      findings: [
        { claim: 'The crater has anorthosite.', confidence: 'High', corroboratedBy: [], citations: [] },
        { claim: 'Impact melt at rim.', confidence: 'Medium', corroboratedBy: [], citations: [] },
        { claim: 'Olivine may be present.', confidence: 'Low', corroboratedBy: [], citations: [] },
      ],
    },
  ],
  followUpQueries: ['Question 1?', 'Question 2?', 'Question 3?'],
  dataCompleteness: {
    'LROC NAC': 'Confirmed',
    'LROC WAC': 'Confirmed',
    'JSC Samples': 'Partial',
    'SVS Illumination': 'Confirmed',
    'NASA Image Library': 'Confirmed',
  },
})

const baseInput = {
  locationName: 'Tycho',
  lat: -43,
  lon: -11,
  isProposed: false,
  query: 'What minerals?',
  generatedAt: '2026-04-24T00:00:00.000Z',
  completeness: {
    'LROC NAC': 'Confirmed',
    'LROC WAC': 'Confirmed',
    'JSC Samples': 'Partial',
    'SVS Illumination': 'Confirmed',
    'NASA Image Library': 'Confirmed',
  } as DataCompleteness,
  activeAgents: ['data-ingest', 'mineralogy'],
  agentOutputs: {
    mineralogy: 'Mineralogy agent output text here.',
  },
}

async function drainGenerator(gen: AsyncGenerator<unknown>): Promise<unknown[]> {
  const events: unknown[] = []
  for await (const event of gen) {
    events.push(event)
  }
  return events
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runSynthesis', () => {
  it('happy path: emits partial events then a complete event', async () => {
    // Split valid JSON across multiple chunks to test streaming
    const part1 = validBriefJson.slice(0, 50)
    const part2 = validBriefJson.slice(50)

    const client = makeMockClient(makeChunks(part1, part2))
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const partials = events.filter((e) => (e as { type: string }).type === 'partial')
    const complete = events.find((e) => (e as { type: string }).type === 'complete')

    expect(partials.length).toBeGreaterThanOrEqual(1)
    expect(complete).toBeDefined()
    expect((complete as { type: string; brief: unknown }).brief).toMatchObject({
      locationName: 'Tycho',
      followUpQueries: expect.arrayContaining(['Question 1?']),
    })
  })

  it('invalid response on attempt 1 → retries → emits complete on valid retry', async () => {
    const invalidJson = '{"locationName": "Tycho", "badField": true}'

    const client = {
      messages: {
        stream: vi.fn()
          .mockReturnValueOnce(makeChunks(invalidJson))
          .mockReturnValueOnce(makeChunks(validBriefJson)),
      },
    }
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const errorEvents = events.filter((e) => (e as { type: string }).type === 'error')
    const completeEvent = events.find((e) => (e as { type: string }).type === 'complete')

    expect(errorEvents).toHaveLength(0)
    expect(completeEvent).toBeDefined()
    // stream() should have been called twice (attempt + retry)
    expect(client.messages.stream).toHaveBeenCalledTimes(2)
  })

  it('double invalid (both attempts fail validation) → emits error with partial', async () => {
    const invalidJson = '{"locationName": "Tycho", "missingAllRequiredFields": true}'

    const client = {
      messages: {
        stream: vi.fn()
          .mockReturnValueOnce(makeChunks(invalidJson))
          .mockReturnValueOnce(makeChunks(invalidJson)),
      },
    }
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const errorEvent = events.find((e) => (e as { type: string }).type === 'error') as
      | { type: 'error'; message: string; partial: unknown }
      | undefined

    expect(errorEvent).toBeDefined()
    expect(errorEvent!.message).toMatch(/validation failed after retry/i)
    // partial should be the parsed (but schema-invalid) object
    expect(errorEvent!.partial).toMatchObject({ locationName: 'Tycho' })
  })

  it('unparseable JSON on both attempts → emits error with undefined partial', async () => {
    const client = {
      messages: {
        stream: vi.fn()
          .mockReturnValueOnce(makeChunks('not valid json at all {{'))
          .mockReturnValueOnce(makeChunks('also invalid json')),
      },
    }
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const errorEvent = events.find((e) => (e as { type: string }).type === 'error') as
      | { type: 'error'; message: string; partial: unknown }
      | undefined

    expect(errorEvent).toBeDefined()
    expect(errorEvent!.partial).toBeUndefined()
  })

  it('timeout on attempt 1 → retries → emits complete on successful retry', async () => {
    // First call: AbortError after a small delay (simulated timeout)
    const firstAbort = {
      [Symbol.asyncIterator]() {
        return {
          next: vi.fn().mockImplementation(() => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            return Promise.reject(err)
          }),
          return: vi.fn().mockResolvedValue({ done: true }),
        }
      },
    }

    const client = {
      messages: {
        stream: vi.fn()
          .mockReturnValueOnce(firstAbort)
          .mockReturnValueOnce(makeChunks(validBriefJson)),
      },
    }
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const completeEvent = events.find((e) => (e as { type: string }).type === 'complete')
    expect(completeEvent).toBeDefined()
    expect(client.messages.stream).toHaveBeenCalledTimes(2)
  })

  it('timeout on both attempts → emits error', async () => {
    const makeAbort = () => ({
      [Symbol.asyncIterator]() {
        return {
          next: vi.fn().mockImplementation(() => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            return Promise.reject(err)
          }),
          return: vi.fn().mockResolvedValue({ done: true }),
        }
      },
    })

    const client = {
      messages: {
        stream: vi.fn()
          .mockReturnValueOnce(makeAbort())
          .mockReturnValueOnce(makeAbort()),
      },
    }
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const errorEvent = events.find((e) => (e as { type: string }).type === 'error')
    expect(errorEvent).toBeDefined()
  })

  it('Anthropic SDK error → emits error event immediately without retry', async () => {
    const sdkError = new Error('API key invalid')
    sdkError.name = 'AuthenticationError'

    const failingStream = {
      [Symbol.asyncIterator]() {
        return {
          next: vi.fn().mockRejectedValue(sdkError),
          return: vi.fn().mockResolvedValue({ done: true }),
        }
      },
    }

    const client = {
      messages: {
        stream: vi.fn().mockReturnValue(failingStream),
      },
    }
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const events = await drainGenerator(runSynthesis(baseInput))

    const errorEvent = events.find((e) => (e as { type: string }).type === 'error') as
      | { type: 'error'; message: string; partial: unknown }
      | undefined

    expect(errorEvent).toBeDefined()
    expect(errorEvent!.message).toBe('API key invalid')
    expect(errorEvent!.partial).toBeUndefined()
    // SDK error should not retry
    expect(client.messages.stream).toHaveBeenCalledTimes(1)
  })

  it('overrides model-supplied dataCompleteness with server-derived map (S7.2.3)', async () => {
    // Model returns a brief whose dataCompleteness disagrees with the server.
    // After validation, the server-derived map (input.completeness) must win.
    const briefWithDivergentCompleteness = JSON.parse(validBriefJson) as Record<string, unknown>
    briefWithDivergentCompleteness['dataCompleteness'] = {
      'LROC NAC': 'Incomplete', // server says Confirmed
      // Missing all the other 4 keys — model "forgot" them.
    }

    const client = makeMockClient(makeChunks(JSON.stringify(briefWithDivergentCompleteness)))
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    const serverCompleteness: DataCompleteness = {
      'LROC NAC': 'Confirmed',
      'LROC WAC': 'Partial',
      'JSC Samples': 'Analogue only',
      'SVS Illumination': 'Confirmed',
      'NASA Image Library': 'Incomplete',
    }

    const events = await drainGenerator(
      runSynthesis({ ...baseInput, completeness: serverCompleteness }),
    )

    const completeEvent = events.find((e) => (e as { type: string }).type === 'complete') as
      | { type: 'complete'; brief: { dataCompleteness: Record<string, string> } }
      | undefined

    expect(completeEvent).toBeDefined()
    // All 5 server-derived keys present and exact, regardless of what model said.
    expect(completeEvent!.brief.dataCompleteness).toEqual(serverCompleteness)
  })

  it('signal is wired into the second argument of messages.stream (timeout enforceable)', async () => {
    const client = makeMockClient(makeChunks(validBriefJson))
    mockGetAnthropic.mockReturnValue(client as unknown as ReturnType<typeof getAnthropic>)

    await drainGenerator(runSynthesis(baseInput))

    // Second argument should be an options object with a `signal: AbortSignal`.
    expect(client.messages.stream).toHaveBeenCalledTimes(1)
    const callArgs = client.messages.stream.mock.calls[0]!
    expect(callArgs).toHaveLength(2)
    const options = callArgs[1] as { signal?: AbortSignal }
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })
})
