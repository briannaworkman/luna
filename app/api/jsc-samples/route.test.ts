import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'

vi.mock('@/lib/data-sources/fetch-jsc-samples', () => ({
  fetchJscSamples: vi.fn(),
  MAX_JSC_DISTANCE_KM: 500,
}))

import { fetchJscSamples } from '@/lib/data-sources/fetch-jsc-samples'

const mockFetchJscSamples = vi.mocked(fetchJscSamples)

const APOLLO_17 = { lat: '20.19', lon: '30.77' }
const INTEGRITY = { lat: '2.66', lon: '-104.92' }
const SHACKLETON = { lat: '-89.9', lon: '0' }

function makeSample(id: string) {
  return {
    sampleId: id,
    mission: 'Apollo 17',
    station: '2',
    weightGrams: 336.9,
    mineralFlags: ['breccia'],
    description: 'A basalt sample',
    jscUrl: `https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=${id}`,
  }
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/jsc-samples')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe('GET /api/jsc-samples', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('parameter validation', () => {
    it('returns 400 when lat is missing', async () => {
      const res = await GET(makeRequest({ lon: '30.77' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lon is missing', async () => {
      const res = await GET(makeRequest({ lat: '20.19' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lat is not a number', async () => {
      const res = await GET(makeRequest({ lat: 'bad', lon: '30.77' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lon is not a number', async () => {
      const res = await GET(makeRequest({ lat: '20.19', lon: 'bad' }))
      expect(res.status).toBe(400)
    })
  })

  describe('out-of-range locations (>500 km from any Apollo station)', () => {
    it('returns 200 with empty results for far-side location (Integrity)', async () => {
      const res = await GET(makeRequest(INTEGRITY))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ results: [], nearestMission: null })
    })

    it('returns 200 with empty results for south pole (Shackleton)', async () => {
      const res = await GET(makeRequest(SHACKLETON))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ results: [], nearestMission: null })
    })

    it('does not call helper for out-of-range coordinates', async () => {
      await GET(makeRequest(INTEGRITY))
      expect(mockFetchJscSamples).not.toHaveBeenCalled()
    })

    it('sets Cache-Control on out-of-range response', async () => {
      const res = await GET(makeRequest(INTEGRITY))
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
    })
  })

  describe('successful response', () => {
    it('returns results from helper and nearestMission from route-layer lookup', async () => {
      mockFetchJscSamples.mockResolvedValue([makeSample('72135')])
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json())
      expect(body.nearestMission).toBe('Apollo 17')
      expect(body.results).toHaveLength(1)
      expect(body.results[0].sampleId).toBe('72135')
    })

    it('sets Cache-Control on success', async () => {
      mockFetchJscSamples.mockResolvedValue([makeSample('72135')])
      const res = await GET(makeRequest(APOLLO_17))
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
    })
  })

  describe('error responses', () => {
    it('returns TIMEOUT when helper throws TimeoutError', async () => {
      mockFetchJscSamples.mockRejectedValue(new TimeoutError())
      const res = await GET(makeRequest(APOLLO_17))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        error: 'JSC sample data unavailable',
        code: 'TIMEOUT',
        results: [],
        nearestMission: null,
      })
    })

    it('returns UPSTREAM_ERROR when helper throws UpstreamError', async () => {
      mockFetchJscSamples.mockRejectedValue(new UpstreamError(503))
      const res = await GET(makeRequest(APOLLO_17))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        error: 'JSC sample data unavailable',
        code: 'UPSTREAM_ERROR',
        results: [],
        nearestMission: null,
      })
    })

    it('returns UPSTREAM_ERROR when helper throws unexpected error', async () => {
      mockFetchJscSamples.mockRejectedValue(new Error('Network error'))
      const res = await GET(makeRequest(APOLLO_17))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        error: 'JSC sample data unavailable',
        code: 'UPSTREAM_ERROR',
        results: [],
        nearestMission: null,
      })
    })
  })
})
