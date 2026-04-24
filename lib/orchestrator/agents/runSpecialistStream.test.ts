import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OrchestratorEvent } from '@/lib/types/agent'

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { runSpecialistStream } from './runSpecialistStream'

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

const baseOpts = {
  agent: 'mineralogy' as const,
  system: 'sys',
  user: 'usr',
  citationSource: 'jsc-sample' as const,
  forwardConfidence: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runSpecialistStream', () => {
  it('happy path — each text chunk becomes one agent-chunk event carrying the agent id', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('A. ', 'B. ', 'C.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({ ...baseOpts, agent: 'orbit', emit: (e) => events.push(e) })

    const chunks = events.filter((e) => e.type === 'agent-chunk')
    expect(chunks).toHaveLength(3)
    chunks.forEach((e) => {
      if (e.type === 'agent-chunk') expect(e.agent).toBe('orbit')
    })
  })

  it('explicit source prefix — [CITE:svs:SVS-5587] fires citation with that source+id', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Claim. [CITE:svs:SVS-5587]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({
      ...baseOpts,
      agent: 'orbit',
      citationSource: 'svs',
      emit: (e) => events.push(e),
    })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const c = citations[0]
    if (c && c.type === 'agent-citation') {
      expect(c.agent).toBe('orbit')
      expect(c.source).toBe('svs')
      expect(c.id).toBe('SVS-5587')
    }
  })

  it('legacy bare [CITE: id] falls back to opts.citationSource', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Claim. [CITE: 12065]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({ ...baseOpts, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    const c = citations[0]
    if (c && c.type === 'agent-citation') {
      expect(c.source).toBe('jsc-sample')
      expect(c.id).toBe('12065')
    }
  })

  it('unknown-source prefix [CITE:unknown-source:foo] — stripped, no citation event', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Some claim. [CITE:unknown-source:foo]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({ ...baseOpts, emit: (e) => events.push(e) })

    expect(events.filter((e) => e.type === 'agent-citation')).toHaveLength(0)
    const allText = events
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e.type === 'agent-chunk' ? e.text : ''))
      .join('')
    expect(allText).not.toContain('[CITE:')
  })

  it('forwardConfidence=true — [CONFIDENCE: High] fires one agent-confidence event', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Strong claim. [CONFIDENCE: High]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({
      ...baseOpts,
      forwardConfidence: true,
      emit: (e) => events.push(e),
    })

    const confs = events.filter((e) => e.type === 'agent-confidence')
    expect(confs).toHaveLength(1)
    const c = confs[0]
    if (c && c.type === 'agent-confidence') {
      expect(c.agent).toBe('mineralogy')
      expect(c.level).toBe('high')
    }
  })

  it('forwardConfidence=false — [CONFIDENCE: High] is stripped from text and no confidence event fires', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Strong claim. [CONFIDENCE: High]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({
      ...baseOpts,
      agent: 'mission-history',
      citationSource: 'nasa-image',
      forwardConfidence: false,
      emit: (e) => events.push(e),
    })

    expect(events.filter((e) => e.type === 'agent-confidence')).toHaveLength(0)
    const allText = events
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e.type === 'agent-chunk' ? e.text : ''))
      .join('')
    expect(allText).not.toContain('[CONFIDENCE:')
  })

  it('tag split across chunks — carry resolves into a single citation', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Claim here [CIT', 'E: 70017] more.')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({ ...baseOpts, emit: (e) => events.push(e) })

    const citations = events.filter((e) => e.type === 'agent-citation')
    expect(citations).toHaveLength(1)
    if (citations[0] && citations[0].type === 'agent-citation') {
      expect(citations[0].id).toBe('70017')
    }
  })

  it('trailing carry (no closing bracket) — flushed as a plain text chunk', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStreamChunks('Prose ending with [unfinished')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runSpecialistStream({ ...baseOpts, emit: (e) => events.push(e) })

    const allText = events
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e.type === 'agent-chunk' ? e.text : ''))
      .join('')
    expect(allText).toContain('[unfinished')
  })

  it('stream throws — agent-error is emitted and the helper resolves without throwing', async () => {
    mockGetAnthropic.mockReturnValue({
      messages: {
        stream: () => {
          throw new Error('Network failure')
        },
      },
    } as unknown as ReturnType<typeof getAnthropic>)

    const events: OrchestratorEvent[] = []
    await expect(
      runSpecialistStream({ ...baseOpts, agent: 'orbit', emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    const errors = events.filter((e) => e.type === 'agent-error')
    expect(errors).toHaveLength(1)
    if (errors[0] && errors[0].type === 'agent-error') {
      expect(errors[0].agent).toBe('orbit')
      expect(errors[0].message).toContain('Network failure')
    }
  })

  it('empty stream — zero events, no throw', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeEmptyStream()) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await expect(
      runSpecialistStream({ ...baseOpts, emit: (e) => events.push(e) })
    ).resolves.toBeUndefined()

    expect(events).toHaveLength(0)
  })

  it('forwards the configured max_tokens to the Anthropic client', async () => {
    const streamSpy = vi.fn((_args: { max_tokens: number }) => makeStreamChunks('ok.'))
    mockGetAnthropic.mockReturnValue({
      messages: { stream: streamSpy },
    } as unknown as ReturnType<typeof getAnthropic>)

    await runSpecialistStream({ ...baseOpts, maxTokens: 2048, emit: () => {} })

    expect(streamSpy).toHaveBeenCalledTimes(1)
    expect(streamSpy.mock.calls[0]?.[0]?.max_tokens).toBe(2048)
  })

  it('default max_tokens is 1500 when not specified', async () => {
    const streamSpy = vi.fn((_args: { max_tokens: number }) => makeStreamChunks('ok.'))
    mockGetAnthropic.mockReturnValue({
      messages: { stream: streamSpy },
    } as unknown as ReturnType<typeof getAnthropic>)

    await runSpecialistStream({ ...baseOpts, emit: () => {} })

    expect(streamSpy.mock.calls[0]?.[0]?.max_tokens).toBe(1500)
  })
})
