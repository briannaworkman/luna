import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/data-sources/fetch-nasa-images', () => ({
  fetchNasaImages: vi.fn(),
}))

import { fetchNasaImages } from '@/lib/data-sources/fetch-nasa-images'

const mockFetchNasaImages = vi.mocked(fetchNasaImages)

function makeNasaImage(id: string, date: string) {
  return {
    assetId: id,
    thumbUrl: `https://images-assets.nasa.gov/image/${id}/${id}~thumb.jpg`,
    fullUrl: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
    instrument: 'Camera',
    date,
    nasaUrl: `https://images.nasa.gov/details/${id}`,
  }
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/nasa-images')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe('GET /api/nasa-images', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('parameter validation', () => {
    it('returns 400 when q is missing', async () => {
      const res = await GET(makeRequest({}))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ images: [], limitedCoverage: true })
    })

    it('returns 400 when q is whitespace only', async () => {
      const res = await GET(makeRequest({ q: '   ' }))
      expect(res.status).toBe(400)
    })

    it('does not call helper when q is missing', async () => {
      await GET(makeRequest({}))
      expect(mockFetchNasaImages).not.toHaveBeenCalled()
    })
  })

  describe('response shape', () => {
    it('wraps helper result in { images, limitedCoverage }', async () => {
      const images = [makeNasaImage('img-001', '2024-01-01'), makeNasaImage('img-002', '2023-01-01')]
      mockFetchNasaImages.mockResolvedValue(images)

      const body = await GET(makeRequest({ q: 'Tycho' })).then((r) => r.json())
      expect(body.images).toEqual(images)
      expect(body.limitedCoverage).toBe(false)
    })

    it('limitedCoverage is true when fewer than 2 results', async () => {
      mockFetchNasaImages.mockResolvedValue([makeNasaImage('only-one', '2024-01-01')])
      const body = await GET(makeRequest({ q: 'Shackleton' })).then((r) => r.json())
      expect(body.limitedCoverage).toBe(true)
    })

    it('limitedCoverage is true when helper returns empty array', async () => {
      mockFetchNasaImages.mockResolvedValue([])
      const body = await GET(makeRequest({ q: 'Carroll' })).then((r) => r.json())
      expect(body).toEqual({ images: [], limitedCoverage: true })
    })

    it('limitedCoverage is false when 2 or more results', async () => {
      mockFetchNasaImages.mockResolvedValue([
        makeNasaImage('a', '2024-01-01'),
        makeNasaImage('b', '2023-01-01'),
      ])
      const body = await GET(makeRequest({ q: 'Tycho' })).then((r) => r.json())
      expect(body.limitedCoverage).toBe(false)
    })
  })

  describe('response headers', () => {
    it('sets Cache-Control on success', async () => {
      mockFetchNasaImages.mockResolvedValue([makeNasaImage('img-001', '2024-01-01')])
      const res = await GET(makeRequest({ q: 'Tycho' }))
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
    })
  })
})
