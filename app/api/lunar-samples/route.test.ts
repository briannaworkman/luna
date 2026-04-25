import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/data-sources', () => ({
  fetchLunarSamples: vi.fn(),
}))
vi.mock('@/lib/middleware/rate-limit', () => ({
  rateLimit: () => () => null,
}))

import { fetchLunarSamples } from '@/lib/data-sources'
const mockFetch = vi.mocked(fetchLunarSamples)

function makeReq(params: Record<string, string>) {
  const url = new URL('http://localhost/api/lunar-samples')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe('GET /api/lunar-samples', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns 400 when locationId is missing', async () => {
    const res = await GET(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when locationId is empty string', async () => {
    const res = await GET(makeReq({ locationId: '  ' }))
    expect(res.status).toBe(400)
  })

  it('returns sample data on success', async () => {
    mockFetch.mockResolvedValue({
      images: [],
      sampleMeta: {
        mission: "Chang'e 5",
        massGrams: 1731,
        ageGa: 1.96,
        rockTypes: ['Mare basalt'],
        description: 'Test',
        nasaComparativeRef: 'Ref',
      },
    })
    const res = await GET(makeReq({ locationId: 'change5' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sampleMeta.mission).toBe("Chang'e 5")
    expect(mockFetch).toHaveBeenCalledWith('change5')
  })

  it('returns null sampleMeta for unknown locationId without error', async () => {
    mockFetch.mockResolvedValue({ images: [], sampleMeta: null })
    const res = await GET(makeReq({ locationId: 'tycho' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sampleMeta).toBeNull()
  })
})
