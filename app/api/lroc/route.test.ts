import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'

vi.mock('@/lib/data-sources/fetch-lroc-products', () => ({
  fetchLrocProducts: vi.fn(),
  INSTRUMENT_NAC: 'LROC NAC',
  INSTRUMENT_WAC: 'LROC WAC',
}))

import { fetchLrocProducts } from '@/lib/data-sources/fetch-lroc-products'

const mockFetchLrocProducts = vi.mocked(fetchLrocProducts)

function makeProduct(id: string, resolution: number, instrument: string) {
  return {
    productId: id,
    resolutionMpp: resolution,
    acquisitionDate: '2024-01-01T00:00:00Z',
    downloadUrl: `https://data.lroc.example.com/${id}`,
    instrument,
  }
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/lroc')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

const SHACKLETON = { lat: '-89.9', lon: '0' }

describe('GET /api/lroc', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('parameter validation', () => {
    it('returns 400 when lat is missing', async () => {
      const res = await GET(makeRequest({ lon: '0' }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ wac: [], nac: [] })
    })

    it('returns 400 when lon is missing', async () => {
      const res = await GET(makeRequest({ lat: '0' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lat is not a number', async () => {
      const res = await GET(makeRequest({ lat: 'bad', lon: '0' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when lon is not a number', async () => {
      const res = await GET(makeRequest({ lat: '0', lon: 'bad' }))
      expect(res.status).toBe(400)
    })

    it('does not call helper when params are invalid', async () => {
      await GET(makeRequest({ lon: '0' }))
      expect(mockFetchLrocProducts).not.toHaveBeenCalled()
    })
  })

  describe('response shape', () => {
    it('re-splits flattened array into { wac, nac }', async () => {
      mockFetchLrocProducts.mockResolvedValue([
        makeProduct('NAC_001', 0.5, 'LROC NAC'),
        makeProduct('WAC_001', 110, 'LROC WAC'),
      ])

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json())
      expect(body.nac).toHaveLength(1)
      expect(body.wac).toHaveLength(1)
      expect(body.nac[0].productId).toBe('NAC_001')
      expect(body.wac[0].productId).toBe('WAC_001')
    })

    it('returns empty arrays when helper returns no products', async () => {
      mockFetchLrocProducts.mockResolvedValue([])
      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json())
      expect(body).toEqual({ wac: [], nac: [] })
    })
  })

  describe('error handling', () => {
    it('returns TIMEOUT when helper throws TimeoutError', async () => {
      mockFetchLrocProducts.mockRejectedValue(new TimeoutError())
      const res = await GET(makeRequest(SHACKLETON))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ error: 'LROC data unavailable', code: 'TIMEOUT', results: [] })
    })

    it('returns UPSTREAM_ERROR when helper throws UpstreamError', async () => {
      mockFetchLrocProducts.mockRejectedValue(new UpstreamError())
      const res = await GET(makeRequest(SHACKLETON))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ error: 'LROC data unavailable', code: 'UPSTREAM_ERROR', results: [] })
    })

    it('returns UPSTREAM_ERROR when helper throws unexpected error', async () => {
      mockFetchLrocProducts.mockRejectedValue(new Error('Network error'))
      const res = await GET(makeRequest(SHACKLETON))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ error: 'LROC data unavailable', code: 'UPSTREAM_ERROR', results: [] })
    })
  })

  describe('response headers', () => {
    it('sets Cache-Control header on success', async () => {
      mockFetchLrocProducts.mockResolvedValue([])
      const res = await GET(makeRequest(SHACKLETON))
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
    })
  })
})
