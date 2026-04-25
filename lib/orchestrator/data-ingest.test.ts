import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LunarLocation } from '@/components/globe/types'
import type { OrchestratorEvent } from '@/lib/types/agent'

vi.mock('@/lib/data-sources', () => ({
  fetchNasaImages: vi.fn(),
  fetchLrocProducts: vi.fn(),
  fetchJscSamples: vi.fn(),
  fetchIlluminationWindows: vi.fn(),
}))

import { fetchNasaImages, fetchLrocProducts, fetchJscSamples, fetchIlluminationWindows } from '@/lib/data-sources'
import { runDataIngest } from './data-ingest'

const mockFetchNasaImages = vi.mocked(fetchNasaImages)
const mockFetchLrocProducts = vi.mocked(fetchLrocProducts)
const mockFetchJscSamples = vi.mocked(fetchJscSamples)
const mockFetchIlluminationWindows = vi.mocked(fetchIlluminationWindows)

const testLocation: LunarLocation = {
  id: 'tycho',
  name: 'Tycho',
  lat: -43.31,
  lon: -11.36,
  diameter: '85 km',
  significance: 'Most prominent young crater visible from Earth',
  isProposed: false,
  type: 'crater',
  coords: '43.3°S, 11.4°W',
  region: 'NEAR SIDE',
}

const fakeImages = [
  { assetId: 'img-001', thumbUrl: 't1', fullUrl: 'f1', instrument: 'Camera', date: '2024-01-01', nasaUrl: 'n1' },
]

const fakeLroc = [
  { productId: 'PROD1', resolutionMpp: 0.5, acquisitionDate: '2024-01-01', downloadUrl: 'u1', instrument: 'LROC NAC' },
]

const fakeJsc = [
  { sampleId: '72135', mission: 'Apollo 17', station: '2', weightGrams: 336.9, mineralFlags: ['breccia'], description: null, jscUrl: 'j1' },
]

const fakeWindows = [
  { date: '2026-04-22', sunriseUtc: null, sunsetUtc: null, illuminatedHours: 0, solarElevationDeg: -5, permanentlyShadowed: true },
]

describe('runDataIngest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('happy path: all four resolve → DataContext fully populated', async () => {
    mockFetchNasaImages.mockResolvedValue(fakeImages)
    mockFetchLrocProducts.mockResolvedValue(fakeLroc)
    mockFetchJscSamples.mockResolvedValue(fakeJsc)
    mockFetchIlluminationWindows.mockResolvedValue(fakeWindows)

    const events: OrchestratorEvent[] = []
    const result = await runDataIngest({ location: testLocation, emit: (e) => events.push(e) })

    expect(result.nasaImages).toEqual(fakeImages)
    expect(result.lrocProducts).toEqual(fakeLroc)
    expect(result.jscSamples).toEqual(fakeJsc)
    expect(result.illuminationWindows).toEqual(fakeWindows)
    expect(result.location.name).toBe('Tycho')
    expect(result.location.lat).toBe(-43.31)
    expect(result.location.lon).toBe(-11.36)
    expect(result.location.diameterKm).toBe(85)
    expect(result.location.significanceNote).toBe('Most prominent young crater visible from Earth')
    expect(result.location.isProposed).toBe(false)
  })

  it('happy path: event order is agent-activate then agent-complete, no agent-chunk', async () => {
    mockFetchNasaImages.mockResolvedValue(fakeImages)
    mockFetchLrocProducts.mockResolvedValue(fakeLroc)
    mockFetchJscSamples.mockResolvedValue(fakeJsc)
    mockFetchIlluminationWindows.mockResolvedValue(fakeWindows)

    const events: OrchestratorEvent[] = []
    await runDataIngest({ location: testLocation, emit: (e) => events.push(e) })

    const eventTypes = events.map((e) => e.type)
    expect(eventTypes[0]).toBe('agent-activate')
    const activateEvent = events[0]
    if (activateEvent !== undefined && activateEvent.type === 'agent-activate') {
      expect(activateEvent.agent).toBe('data-ingest')
    }

    expect(eventTypes[eventTypes.length - 1]).toBe('agent-complete')
    const completeEvent = events[events.length - 1]
    if (completeEvent !== undefined && completeEvent.type === 'agent-complete') {
      expect(completeEvent.agent).toBe('data-ingest')
    }

    expect(eventTypes).not.toContain('agent-chunk')
  })

  it('one helper rejects → that DataContext key is null, others populated, no error thrown', async () => {
    mockFetchNasaImages.mockRejectedValue(new Error('NASA timeout'))
    mockFetchLrocProducts.mockResolvedValue(fakeLroc)
    mockFetchJscSamples.mockResolvedValue(fakeJsc)
    mockFetchIlluminationWindows.mockResolvedValue(fakeWindows)

    const events: OrchestratorEvent[] = []
    const result = await runDataIngest({ location: testLocation, emit: (e) => events.push(e) })

    expect(result.nasaImages).toBeNull()
    expect(result.lrocProducts).toEqual(fakeLroc)
    expect(result.jscSamples).toEqual(fakeJsc)
    expect(result.illuminationWindows).toEqual(fakeWindows)
  })

  it('all four reject → all four data keys null, location populated', async () => {
    mockFetchNasaImages.mockRejectedValue(new Error('fail'))
    mockFetchLrocProducts.mockRejectedValue(new Error('fail'))
    mockFetchJscSamples.mockRejectedValue(new Error('fail'))
    mockFetchIlluminationWindows.mockRejectedValue(new Error('fail'))

    const events: OrchestratorEvent[] = []
    const result = await runDataIngest({ location: testLocation, emit: (e) => events.push(e) })

    expect(result.nasaImages).toBeNull()
    expect(result.lrocProducts).toBeNull()
    expect(result.jscSamples).toBeNull()
    expect(result.illuminationWindows).toBeNull()
    expect(result.location.name).toBe('Tycho')
  })

  it('8s timeout fires BEFORE helpers resolve → agent-status event emitted', async () => {
    vi.useFakeTimers()

    let resolveAll: () => void
    const pending = new Promise<void>((resolve) => { resolveAll = resolve })

    mockFetchNasaImages.mockImplementation(() => pending.then(() => fakeImages))
    mockFetchLrocProducts.mockImplementation(() => pending.then(() => fakeLroc))
    mockFetchJscSamples.mockImplementation(() => pending.then(() => fakeJsc))
    mockFetchIlluminationWindows.mockImplementation(() => pending.then(() => fakeWindows))

    const events: OrchestratorEvent[] = []
    const promise = runDataIngest({ location: testLocation, emit: (e) => events.push(e) })

    await vi.advanceTimersByTimeAsync(8001)

    const statusEvents = events.filter((e) => e.type === 'agent-status')
    expect(statusEvents).toHaveLength(1)
    const statusEvent = statusEvents[0]
    if (statusEvent !== undefined && statusEvent.type === 'agent-status') {
      expect(statusEvent.agent).toBe('data-ingest')
      expect(statusEvent.text).toBe('Still loading NASA data...')
    }

    resolveAll!()
    await promise
  })

  it('helpers resolve under 8s → agent-status event NOT emitted', async () => {
    vi.useFakeTimers()

    mockFetchNasaImages.mockResolvedValue(fakeImages)
    mockFetchLrocProducts.mockResolvedValue(fakeLroc)
    mockFetchJscSamples.mockResolvedValue(fakeJsc)
    mockFetchIlluminationWindows.mockResolvedValue(fakeWindows)

    const events: OrchestratorEvent[] = []
    await runDataIngest({ location: testLocation, emit: (e) => events.push(e) })

    await vi.advanceTimersByTimeAsync(8001)

    const statusEvents = events.filter((e) => e.type === 'agent-status')
    expect(statusEvents).toHaveLength(0)
  })

  describe('parseDiameterKm', () => {
    it('"85 km" → 85', async () => {
      mockFetchNasaImages.mockResolvedValue([])
      mockFetchLrocProducts.mockResolvedValue([])
      mockFetchJscSamples.mockResolvedValue([])
      mockFetchIlluminationWindows.mockResolvedValue([])

      const result = await runDataIngest({
        location: { ...testLocation, diameter: '85 km' },
        emit: () => {},
      })
      expect(result.location.diameterKm).toBe(85)
    })

    it('"~2,500 km" → 2500', async () => {
      mockFetchNasaImages.mockResolvedValue([])
      mockFetchLrocProducts.mockResolvedValue([])
      mockFetchJscSamples.mockResolvedValue([])
      mockFetchIlluminationWindows.mockResolvedValue([])

      const result = await runDataIngest({
        location: { ...testLocation, diameter: '~2,500 km' },
        emit: () => {},
      })
      expect(result.location.diameterKm).toBe(2500)
    })

    it('undefined → null', async () => {
      mockFetchNasaImages.mockResolvedValue([])
      mockFetchLrocProducts.mockResolvedValue([])
      mockFetchJscSamples.mockResolvedValue([])
      mockFetchIlluminationWindows.mockResolvedValue([])

      const locationNodiameter: LunarLocation = {
        id: 'shackleton',
        name: 'Shackleton',
        lat: -89.9,
        lon: 0,
        significance: 'Permanently shadowed south pole crater',
        isProposed: false,
        type: 'crater',
        coords: '89.9°S, 0°E',
        region: 'NEAR SIDE',
      }

      const result = await runDataIngest({ location: locationNodiameter, emit: () => {} })
      expect(result.location.diameterKm).toBeNull()
    })

    it('"231 km" → 231', async () => {
      mockFetchNasaImages.mockResolvedValue([])
      mockFetchLrocProducts.mockResolvedValue([])
      mockFetchJscSamples.mockResolvedValue([])
      mockFetchIlluminationWindows.mockResolvedValue([])

      const result = await runDataIngest({
        location: { ...testLocation, diameter: '231 km' },
        emit: () => {},
      })
      expect(result.location.diameterKm).toBe(231)
    })
  })
})
