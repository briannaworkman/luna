import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/data-sources/fetch-illumination-windows', () => ({
  fetchIlluminationWindows: vi.fn(),
}))

import { fetchIlluminationWindows } from '@/lib/data-sources/fetch-illumination-windows'

const mockFetchIlluminationWindows = vi.mocked(fetchIlluminationWindows)

const FAKE_NOW = new Date('2026-04-22T00:00:00Z')

function makeWindow(date: string, illuminated = true) {
  return {
    date,
    sunriseUtc: illuminated ? `${date}T06:00:00.000Z` : null,
    sunsetUtc: illuminated ? `${date}T18:00:00.000Z` : null,
    illuminatedHours: illuminated ? 12 : 0,
    solarElevationDeg: illuminated ? 45 : -10,
    permanentlyShadowed: !illuminated,
  }
}

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/svs-illumination')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

describe('GET /api/svs-illumination', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FAKE_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('parameter validation', () => {
    it('returns 400 when lat is missing', async () => {
      const res = await GET(makeRequest({ lon: '0' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe('INVALID_PARAMS')
    })

    it('returns 400 when lon is missing', async () => {
      const res = await GET(makeRequest({ lat: '0' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.code).toBe('INVALID_PARAMS')
    })

    it('returns 400 when lat is out of range', async () => {
      const res = await GET(makeRequest({ lat: '91', lon: '0' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lon is out of range', async () => {
      const res = await GET(makeRequest({ lat: '0', lon: '181' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lat is not a number', async () => {
      const res = await GET(makeRequest({ lat: 'abc', lon: '0' }))
      expect(res.status).toBe(400)
    })

    it('does not call helper when params are invalid', async () => {
      await GET(makeRequest({ lon: '0' }))
      expect(mockFetchIlluminationWindows).not.toHaveBeenCalled()
    })
  })

  describe('successful response', () => {
    it('returns the windows array from the helper directly', async () => {
      const windows = [makeWindow('2026-04-22'), makeWindow('2026-04-23')]
      mockFetchIlluminationWindows.mockResolvedValue(windows)

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json())
      expect(body).toEqual(windows)
    })

    it('passes lat and lon to helper', async () => {
      mockFetchIlluminationWindows.mockResolvedValue([])
      await GET(makeRequest({ lat: '-43.31', lon: '-11.36' }))
      expect(mockFetchIlluminationWindows).toHaveBeenCalledWith(-43.31, -11.36)
    })

    it('sets Cache-Control: no-store on success', async () => {
      mockFetchIlluminationWindows.mockResolvedValue([makeWindow('2026-04-22')])
      const res = await GET(makeRequest({ lat: '0', lon: '0' }))
      expect(res.headers.get('Cache-Control')).toBe('no-store')
    })
  })

  describe('error handling', () => {
    it('returns 502 with FETCH_FAILED when helper throws', async () => {
      mockFetchIlluminationWindows.mockRejectedValue(new Error('upstream timeout'))
      const res = await GET(makeRequest({ lat: '0', lon: '0' }))
      expect(res.status).toBe(502)
      const body = await res.json()
      expect(body.code).toBe('FETCH_FAILED')
    })

    it('does not include entries in error response', async () => {
      mockFetchIlluminationWindows.mockRejectedValue(new Error('network error'))
      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json())
      expect(body).not.toHaveProperty('entries')
    })
  })
})
