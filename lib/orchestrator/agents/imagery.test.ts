import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { NasaImage } from '@/lib/types/nasa'

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

vi.mock('./fetchImageBase64', () => ({
  fetchImageBase64: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { fetchImageBase64 } from './fetchImageBase64'
import { runImageryAgent } from './imagery'

const mockGetAnthropic = vi.mocked(getAnthropic)
const mockFetchImageBase64 = vi.mocked(fetchImageBase64)

const fakeDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

function makeImage(assetId: string): NasaImage {
  return {
    assetId,
    thumbUrl: `https://example.com/${assetId}/thumb.jpg`,
    fullUrl: `https://example.com/${assetId}/full.jpg`,
    instrument: 'LRO WAC',
    date: '2012-01-15T00:00:00Z',
    nasaUrl: `https://images.nasa.gov/details/${assetId}`,
  }
}

type StreamChunk = {
  type: 'content_block_delta'
  index: number
  delta: { type: 'text_delta'; text: string }
}

async function* makeStreamChunks(...strings: string[]): AsyncIterable<StreamChunk> {
  for (const text of strings) {
    yield {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    }
  }
}

function makeMockClient(chunks: AsyncIterable<StreamChunk>) {
  return {
    messages: {
      stream: vi.fn().mockReturnValue(chunks),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runImageryAgent', () => {
  it('empty imageAssetIds — returns immediately, no emits', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [makeImage('IMG-001')] },
      imageAssetIds: [],
      emit,
    })
    expect(emit).not.toHaveBeenCalled()
    expect(mockGetAnthropic).not.toHaveBeenCalled()
  })

  it('nasaImages === null — emits fallback note, no Opus calls', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: null },
      imageAssetIds: ['IMG-001'],
      emit,
    })
    expect(emit).toHaveBeenCalledTimes(1)
    const call = emit.mock.calls[0]?.[0]
    expect(call?.type).toBe('agent-chunk')
    if (call?.type === 'agent-chunk') {
      expect(call.text).toContain('Unable to locate selected images in NASA archive')
    }
    expect(mockGetAnthropic).not.toHaveBeenCalled()
  })

  it('non-empty imageAssetIds but zero matches in nasaImages — emits mismatch note, no Opus calls', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [makeImage('OTHER-001')] },
      imageAssetIds: ['IMG-001', 'IMG-002'],
      emit,
    })
    expect(emit).toHaveBeenCalledTimes(1)
    const call = emit.mock.calls[0]?.[0]
    expect(call?.type).toBe('agent-chunk')
    if (call?.type === 'agent-chunk') {
      expect(call.text).toContain('Unable to match 2 selected image(s)')
    }
    expect(mockGetAnthropic).not.toHaveBeenCalled()
  })

  it('single-image happy path — header without "Image N of N"; one stream call; chunks + citations forwarded; no synthesis', async () => {
    const image = makeImage('AS16-M-0273')
    mockFetchImageBase64.mockResolvedValue({ data: 'abc123', mediaType: 'image/jpeg' })

    const mockClient = makeMockClient(makeStreamChunks('Mare basalt plains with smooth texture. [CITE: AS16-M-0273]'))
    mockGetAnthropic.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropic>)

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [image] },
      imageAssetIds: ['AS16-M-0273'],
      emit,
    })

    // Check header chunk does not contain "Image N of N"
    const chunkEvents = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'agent-chunk')
    const headerChunk = chunkEvents[0]
    expect(headerChunk?.type).toBe('agent-chunk')
    if (headerChunk?.type === 'agent-chunk') {
      expect(headerChunk.text).not.toMatch(/Image \d+ of \d+/)
      expect(headerChunk.text).toContain('AS16-M-0273')
    }

    // One stream call (single image, no synthesis)
    expect(mockClient.messages.stream).toHaveBeenCalledTimes(1)

    // Citation forwarded
    const citationEvents = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'agent-citation')
    expect(citationEvents.length).toBeGreaterThanOrEqual(1)
    const citation = citationEvents[0]
    if (citation?.type === 'agent-citation') {
      expect(citation.source).toBe('nasa-image')
      expect(citation.id).toBe('AS16-M-0273')
    }
  })

  it('two-image happy path — "Image 1 of 2" / "Image 2 of 2" headers; two stream calls; synthesis header + synthesis stream call', async () => {
    const img1 = makeImage('IMG-001')
    const img2 = makeImage('IMG-002')
    mockFetchImageBase64.mockResolvedValue({ data: 'abc', mediaType: 'image/jpeg' })

    const mockClient = makeMockClient(makeStreamChunks('Geological text.'))
    // We need the stream mock to be callable multiple times
    mockClient.messages.stream.mockReturnValue(makeStreamChunks('Geological text.'))
    mockGetAnthropic.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropic>)

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [img1, img2] },
      imageAssetIds: ['IMG-001', 'IMG-002'],
      emit,
    })

    // Three stream calls: two per-image + one synthesis
    expect(mockClient.messages.stream).toHaveBeenCalledTimes(3)

    const chunkTexts = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e as { type: 'agent-chunk'; text: string }).text)

    const allText = chunkTexts.join('')
    expect(allText).toContain('Image 1 of 2')
    expect(allText).toContain('Image 2 of 2')
    expect(allText).toContain('Synthesis across 2 images')
  })

  it('one of two images fails to fetch — "Unable to fetch" note; second image analyzed; no synthesis (only 1 successful)', async () => {
    const img1 = makeImage('IMG-001')
    const img2 = makeImage('IMG-002')

    mockFetchImageBase64
      .mockRejectedValueOnce(new Error('HTTP 404'))
      .mockResolvedValueOnce({ data: 'abc', mediaType: 'image/jpeg' })

    const mockClient = makeMockClient(makeStreamChunks('Analysis of second image.'))
    mockGetAnthropic.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropic>)

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [img1, img2] },
      imageAssetIds: ['IMG-001', 'IMG-002'],
      emit,
    })

    // Error message emitted for the first image
    const chunkTexts = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e as { type: 'agent-chunk'; text: string }).text)
    expect(chunkTexts.join('')).toContain('Unable to fetch IMG-001')

    // Only one stream call (second image succeeds)
    expect(mockClient.messages.stream).toHaveBeenCalledTimes(1)

    // No synthesis header (only 1 successful fetch)
    expect(chunkTexts.join('')).not.toContain('Synthesis across')
  })

  it('all images fail to fetch — no Opus calls; no synthesis', async () => {
    const img1 = makeImage('IMG-001')
    const img2 = makeImage('IMG-002')

    mockFetchImageBase64.mockRejectedValue(new Error('HTTP 503'))

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [img1, img2] },
      imageAssetIds: ['IMG-001', 'IMG-002'],
      emit,
    })

    expect(mockGetAnthropic).not.toHaveBeenCalled()

    const chunkTexts = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e as { type: 'agent-chunk'; text: string }).text)
    expect(chunkTexts.join('')).not.toContain('Synthesis across')
  })

  it('per-image stream throws — agent-error emitted; loop continues to next image (not rethrown)', async () => {
    const img1 = makeImage('IMG-001')
    const img2 = makeImage('IMG-002')

    mockFetchImageBase64.mockResolvedValue({ data: 'abc', mediaType: 'image/jpeg' })

    async function* throwingStream(): AsyncGenerator<never> {
      throw new Error('Stream error')
      // eslint-disable-next-line no-unreachable
      yield undefined as never
    }

    const goodStream = makeStreamChunks('Good analysis.')

    const mockStream = vi.fn()
      .mockReturnValueOnce(throwingStream())
      .mockReturnValueOnce(goodStream)

    mockGetAnthropic.mockReturnValue({
      messages: { stream: mockStream },
    } as unknown as ReturnType<typeof getAnthropic>)

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [img1, img2] },
      imageAssetIds: ['IMG-001', 'IMG-002'],
      emit,
    })

    // Should not throw; agent-error emitted for first image
    const errorEvents = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'agent-error')
    expect(errorEvents.length).toBeGreaterThanOrEqual(1)
    const errEvent = errorEvents[0]
    if (errEvent?.type === 'agent-error') {
      expect(errEvent.agent).toBe('imagery')
      expect(errEvent.message).toContain('Stream error')
    }

    // Second image was also processed, but synthesis does NOT fire because
    // only one image streamed successfully. A failed stream means no analysis
    // was produced for that image — it shouldn't be re-fed into synthesis.
    expect(mockStream).toHaveBeenCalledTimes(2)
  })

  it('synthesis stream throws — agent-error emitted; per-image blocks already in event log', async () => {
    const img1 = makeImage('IMG-001')
    const img2 = makeImage('IMG-002')

    mockFetchImageBase64.mockResolvedValue({ data: 'abc', mediaType: 'image/jpeg' })

    async function* throwingStream(): AsyncGenerator<never> {
      throw new Error('Synthesis stream failed')
      // eslint-disable-next-line no-unreachable
      yield undefined as never
    }

    const perImageStream1 = makeStreamChunks('Analysis of image 1.')
    const perImageStream2 = makeStreamChunks('Analysis of image 2.')

    const mockStream = vi.fn()
      .mockReturnValueOnce(perImageStream1)
      .mockReturnValueOnce(perImageStream2)
      .mockReturnValueOnce(throwingStream())

    mockGetAnthropic.mockReturnValue({
      messages: { stream: mockStream },
    } as unknown as ReturnType<typeof getAnthropic>)

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [img1, img2] },
      imageAssetIds: ['IMG-001', 'IMG-002'],
      emit,
    })

    // Per-image chunks present
    const chunkTexts = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e as { type: 'agent-chunk'; text: string }).text)
    expect(chunkTexts.join('')).toContain('Analysis of image 1.')
    expect(chunkTexts.join('')).toContain('Analysis of image 2.')

    // Agent-error emitted for synthesis
    const errorEvents = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'agent-error')
    expect(errorEvents.length).toBeGreaterThanOrEqual(1)
    const errEvent = errorEvents[0]
    if (errEvent?.type === 'agent-error') {
      expect(errEvent.agent).toBe('imagery')
      expect(errEvent.message).toContain('Synthesis stream failed')
    }
  })

  it('[CITE: M1234] in model stream — agent-citation emitted with source=nasa-image, id=M1234; tag not in chunk text', async () => {
    const image = makeImage('M1234')
    mockFetchImageBase64.mockResolvedValue({ data: 'abc', mediaType: 'image/jpeg' })

    const mockClient = makeMockClient(makeStreamChunks('Sharp impact rim visible. [CITE: M1234] Further analysis.'))
    mockGetAnthropic.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropic>)

    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runImageryAgent({
      dataContext: { ...fakeDataContext, nasaImages: [image] },
      imageAssetIds: ['M1234'],
      emit,
    })

    const citationEvents = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'agent-citation')
    expect(citationEvents.length).toBeGreaterThanOrEqual(1)
    const citation = citationEvents[0]
    if (citation?.type === 'agent-citation') {
      expect(citation.source).toBe('nasa-image')
      expect(citation.id).toBe('M1234')
    }

    // Tag text not in any chunk
    const chunkTexts = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'agent-chunk')
      .map((e) => (e as { type: 'agent-chunk'; text: string }).text)
    const allText = chunkTexts.join('')
    expect(allText).not.toContain('[CITE:')
    expect(allText).toContain('Sharp impact rim visible.')
    expect(allText).toContain('Further analysis.')
  })
})
