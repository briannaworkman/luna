import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchJscSamples } from './fetch-jsc-samples'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'

const APOLLO_17 = { lat: 20.19, lon: 30.77 }
const INTEGRITY = { lat: 2.66, lon: -104.92 }
const SHACKLETON = { lat: -89.9, lon: 0 }

function makeRawSample(overrides: Record<string, unknown> = {}) {
  return {
    GENERIC: '72135',
    SAMPLEID: null,
    MISSION: 'Apollo 17',
    STATION: '2',
    ORIGINALWEIGHT: 336.9,
    SAMPLETYPE: 'Breccia',
    SAMPLESUBTYPE: 'Fragmental',
    GENERICDESCRIPTION: 'coarsely brecciated ilmenite basalt',
    ...overrides,
  }
}

function jscResponse(samples: unknown[]) {
  return { ok: true, json: async () => samples }
}

describe('fetchJscSamples', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('station within range: returns normalized samples', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([makeRawSample()])))
    const result = await fetchJscSamples(APOLLO_17.lat, APOLLO_17.lon)
    expect(result).toHaveLength(1)
    const first = result[0]
    if (!first) return
    expect(first.sampleId).toBe('72135')
    expect(first.mission).toBe('Apollo 17')
    expect(first.mineralFlags).toEqual(['breccia', 'fragmental'])
  })

  it('no station found / beyond 500 km (Integrity far-side) → returns []', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchJscSamples(INTEGRITY.lat, INTEGRITY.lon)
    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('beyond 500 km (south pole / Shackleton) → returns []', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchJscSamples(SHACKLETON.lat, SHACKLETON.lon)
    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws TimeoutError on abort from upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    await expect(fetchJscSamples(APOLLO_17.lat, APOLLO_17.lon)).rejects.toBeInstanceOf(TimeoutError)
  })

  it('throws UpstreamError when fetch returns non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchJscSamples(APOLLO_17.lat, APOLLO_17.lon)).rejects.toBeInstanceOf(UpstreamError)
  })

  it('throws on general network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))
    await expect(fetchJscSamples(APOLLO_17.lat, APOLLO_17.lon)).rejects.toThrow()
  })
})
