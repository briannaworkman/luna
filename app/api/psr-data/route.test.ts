import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/data-sources', () => ({
  fetchPsrData: vi.fn(),
}))
vi.mock('@/lib/middleware/rate-limit', () => ({
  rateLimit: () => () => null,
}))

import { fetchPsrData } from '@/lib/data-sources'
const mockFetch = vi.mocked(fetchPsrData)

function makeReq(params: Record<string, string>) {
  const url = new URL('http://localhost/api/psr-data')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe('GET /api/psr-data', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns 400 when lat or lon is missing', async () => {
    const res = await GET(makeReq({ lat: '-89.9' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when lat or lon is not a number', async () => {
    const res = await GET(makeReq({ lat: 'abc', lon: '0' }))
    expect(res.status).toBe(400)
  })

  it('returns psrData on success', async () => {
    mockFetch.mockResolvedValue({
      lampProducts: [],
      psrSummary: {
        locationId: 'shackleton',
        locationName: 'Shackleton Crater',
        iceConfidence: 'confirmed',
        detectionMethods: ['LRO LAMP UV reflectance'],
        estimatedIcePct: '5–10%',
        notes: 'Test note',
      },
    })
    const res = await GET(makeReq({ lat: '-89.9', lon: '0' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.psrSummary.locationId).toBe('shackleton')
    expect(body.lampProducts).toEqual([])
  })
})
