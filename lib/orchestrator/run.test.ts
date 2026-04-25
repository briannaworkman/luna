import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LunarLocation } from '@/components/globe/types'
import type { DataContext } from '@/lib/types/agent'

vi.mock('@/lib/anthropic', () => ({
  CLAUDE_MODEL: 'claude-opus-4-7',
  getAnthropic: vi.fn(),
}))

vi.mock('./data-ingest', () => ({
  runDataIngest: vi.fn(),
}))

vi.mock('./specialists', () => ({
  runSpecialist: vi.fn(),
}))

import { getAnthropic } from '@/lib/anthropic'
import { runOrchestrator } from './run'
import type { OrchestratorEvent } from '@/lib/types/agent'
import { runDataIngest } from './data-ingest'
import { runSpecialist } from './specialists'

const mockGetAnthropic = vi.mocked(getAnthropic)
const mockRunDataIngest = vi.mocked(runDataIngest)
const mockRunSpecialist = vi.mocked(runSpecialist)

const fakeDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater',
    isProposed: false,
  },
  nasaImages: [],
  lrocProducts: [],
  jscSamples: [],
  illuminationWindows: [],
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

function makeStream(...strings: string[]) {
  return makeStreamChunks(...strings)
}

const testLocation: LunarLocation = {
  id: 'tycho',
  name: 'Tycho',
  lat: -43,
  lon: -11,
  significance: 'Most prominent young crater',
  isProposed: false,
  type: 'crater',
  coords: '43°S, 11°W',
  region: 'NEAR SIDE',
}

function makeMockClient(chunks: AsyncIterable<StreamChunk>) {
  return {
    messages: {
      stream: () => chunks,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRunDataIngest.mockImplementation(async ({ emit }) => {
    emit({ type: 'agent-activate', agent: 'data-ingest' })
    emit({ type: 'agent-complete', agent: 'data-ingest' })
    return fakeDataContext
  })
  mockRunSpecialist.mockResolvedValue(undefined)
})

describe('runOrchestrator', () => {
  it('normal path: streams rationale as orchestrator-chunk, then orchestrator event, then activates and completes agents, then done', async () => {
    const rationale = 'I will activate mineralogy and mission-history for this query. '
    const agentsJson = '["data-ingest","mineralogy","mission-history"]'

    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream(rationale, '---AGENTS---\n', agentsJson)) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    const result = await runOrchestrator({
      query: 'What minerals exist here?',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: (e) => events.push(e),
    })

    const chunkEvents = events.filter((e) => e.type === 'orchestrator-chunk')
    expect(chunkEvents.length).toBeGreaterThan(0)
    const combinedText = chunkEvents.map((e) => (e as { type: 'orchestrator-chunk'; text: string }).text).join('')
    expect(combinedText).toContain('I will activate mineralogy')

    const orchestratorEvent = events.find((e) => e.type === 'orchestrator')
    expect(orchestratorEvent).toBeDefined()
    if (orchestratorEvent && orchestratorEvent.type === 'orchestrator') {
      expect(orchestratorEvent.agents).toEqual(['data-ingest', 'mineralogy', 'mission-history'])
      expect(orchestratorEvent.rationale).toContain('I will activate mineralogy')
    }

    const activateEvents = events.filter((e) => e.type === 'agent-activate')
    expect(activateEvents).toHaveLength(3)

    const completeEvents = events.filter((e) => e.type === 'agent-complete')
    expect(completeEvents).toHaveLength(3)

    const doneEvent = events.find((e) => e.type === 'done')
    expect(doneEvent).toBeDefined()

    expect(result.agents).toEqual(['data-ingest', 'mineralogy', 'mission-history'])
    expect(result.rationale).toContain('I will activate mineralogy')
  })

  it('parses markdown-fence-wrapped JSON correctly', async () => {
    const rationale = 'Activating orbit for landing window analysis. '
    const agentsJson = '```json\n["data-ingest","orbit"]\n```'

    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream(rationale, '---AGENTS---\n', agentsJson)) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    const result = await runOrchestrator({
      query: 'When can we land?',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: (e) => events.push(e),
    })

    expect(result.agents).toEqual(['data-ingest', 'orbit'])
  })

  it('strips imagery when hasImages is false even if model returned it', async () => {
    const rationale = 'Activating imagery and mineralogy. '
    const agentsJson = '["data-ingest","imagery","mineralogy"]'

    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream(rationale, '---AGENTS---\n', agentsJson)) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    const result = await runOrchestrator({
      query: 'What is the composition?',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: (e) => events.push(e),
    })

    expect(result.agents).not.toContain('imagery')
    expect(result.agents).toContain('mineralogy')
  })

  it('throws when JSON is unparseable', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream('Some rationale. ', '---AGENTS---\n', 'not valid json')) as unknown as ReturnType<typeof getAnthropic>
    )

    await expect(
      runOrchestrator({
        query: 'test',
        location: testLocation,
        hasImages: false,
        imageAssetIds: [],
        emit: () => {},
      })
    ).rejects.toThrow('Orchestrator returned unparseable agent list')
  })

  it('inserts data-ingest at position 0 when missing', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream('Some rationale. ', '---AGENTS---\n', '["mineralogy","orbit"]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const result = await runOrchestrator({
      query: 'test',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: () => {},
    })

    expect(result.agents[0]).toBe('data-ingest')
    expect(result.agents).toContain('mineralogy')
    expect(result.agents).toContain('orbit')
  })

  it('emits multiple orchestrator-chunk events when rationale arrives in multiple SDK events', async () => {
    const chunk1 = 'First part of rationale. '
    const chunk2 = 'Second part of rationale. '
    const agentsJson = '["data-ingest","orbit"]'

    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream(chunk1, chunk2, '---AGENTS---\n', agentsJson)) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    await runOrchestrator({
      query: 'landing windows?',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: (e) => events.push(e),
    })

    const chunkEvents = events.filter((e) => e.type === 'orchestrator-chunk')
    expect(chunkEvents.length).toBeGreaterThanOrEqual(2)

    const combined = chunkEvents.map((e) => (e as { type: 'orchestrator-chunk'; text: string }).text).join('')
    expect(combined).toBe(chunk1 + chunk2)
  })

  it('never leaks partial delimiter text into emitted rationale when delimiter splits across chunks', async () => {
    const rationale = 'Some rationale text '
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream(rationale + '---AG', 'ENTS---\n["data-ingest","orbit"]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    const result = await runOrchestrator({
      query: 'test',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: (e) => events.push(e),
    })

    const chunkEvents = events.filter((e) => e.type === 'orchestrator-chunk')
    const combined = chunkEvents.map((e) => (e as { type: 'orchestrator-chunk'; text: string }).text).join('')
    expect(combined).toBe(rationale)
    expect(combined).not.toContain('---')
    expect(result.agents).toEqual(['data-ingest', 'orbit'])
  })

  it('silently filters unknown agent IDs instead of throwing', async () => {
    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream('rationale ', '---AGENTS---\n', '["data-ingest","mineralogy","hallucinated-agent"]')) as unknown as ReturnType<typeof getAnthropic>
    )

    const result = await runOrchestrator({
      query: 'test',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: () => {},
    })

    expect(result.agents).toEqual(['data-ingest', 'mineralogy'])
  })

  it('integration: full event order — orchestrator-chunk*, orchestrator, agent-activate(data-ingest), agent-complete(data-ingest), agent-activate(specialist)*, agent-complete(specialist)*, done; data-ingest activate appears exactly once', async () => {
    const rationale = 'Activating mineralogy for this query. '
    const agentsJson = '["data-ingest","mineralogy","orbit"]'

    mockGetAnthropic.mockReturnValue(
      makeMockClient(makeStream(rationale, '---AGENTS---\n', agentsJson)) as unknown as ReturnType<typeof getAnthropic>
    )

    const events: OrchestratorEvent[] = []
    const result = await runOrchestrator({
      query: 'What minerals are here?',
      location: testLocation,
      hasImages: false,
      imageAssetIds: [],
      emit: (e) => events.push(e),
    })

    const types = events.map((e) => e.type)

    const orchestratorChunkIdx = types.findIndex((t) => t === 'orchestrator-chunk')
    const orchestratorIdx = types.findIndex((t) => t === 'orchestrator')
    const doneIdx = types.lastIndexOf('done')

    expect(orchestratorChunkIdx).toBeGreaterThanOrEqual(0)
    expect(orchestratorIdx).toBeGreaterThan(orchestratorChunkIdx)

    const dataIngestActivateEvents = events.filter(
      (e) => e.type === 'agent-activate' && (e as { type: 'agent-activate'; agent: string }).agent === 'data-ingest'
    )
    expect(dataIngestActivateEvents).toHaveLength(1)

    const dataIngestActivateIdx = events.findIndex(
      (e) => e.type === 'agent-activate' && (e as { type: 'agent-activate'; agent: string }).agent === 'data-ingest'
    )
    const dataIngestCompleteIdx = events.findIndex(
      (e) => e.type === 'agent-complete' && (e as { type: 'agent-complete'; agent: string }).agent === 'data-ingest'
    )

    expect(dataIngestActivateIdx).toBeGreaterThan(orchestratorIdx)
    expect(dataIngestCompleteIdx).toBeGreaterThan(dataIngestActivateIdx)

    const specialistActivateEvents = events.filter(
      (e) => e.type === 'agent-activate' && (e as { type: 'agent-activate'; agent: string }).agent !== 'data-ingest'
    )
    const specialistCompleteEvents = events.filter(
      (e) => e.type === 'agent-complete' && (e as { type: 'agent-complete'; agent: string }).agent !== 'data-ingest'
    )

    expect(specialistActivateEvents).toHaveLength(2)
    expect(specialistCompleteEvents).toHaveLength(2)

    expect(doneIdx).toBe(types.length - 1)

    // runSpecialist is called once per non-data-ingest agent (mineralogy + orbit)
    expect(mockRunSpecialist).toHaveBeenCalledTimes(2)
    expect(mockRunSpecialist).toHaveBeenCalledWith(
      'mineralogy',
      { dataContext: fakeDataContext, imageAssetIds: [] },
      expect.any(Function)
    )
    expect(mockRunSpecialist).toHaveBeenCalledWith(
      'orbit',
      { dataContext: fakeDataContext, imageAssetIds: [] },
      expect.any(Function)
    )

    expect(result.dataContext).toEqual(fakeDataContext)
    expect(result.agents).toEqual(['data-ingest', 'mineralogy', 'orbit'])
  })
})
