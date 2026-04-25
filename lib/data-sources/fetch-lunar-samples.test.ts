import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchLunarSamples } from './fetch-lunar-samples'

vi.mock('./fetch-nasa-images', () => ({
  fetchNasaImages: vi.fn(),
}))

import { fetchNasaImages } from './fetch-nasa-images'
const mockFetchImages = vi.mocked(fetchNasaImages)

describe('fetchLunarSamples', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns sampleMeta for change5', async () => {
    mockFetchImages.mockResolvedValue([])
    const result = await fetchLunarSamples('change5')
    expect(result.sampleMeta).not.toBeNull()
    expect(result.sampleMeta!.mission).toBe("Chang'e 5")
    expect(result.sampleMeta!.massGrams).toBe(1731)
  })

  it('returns sampleMeta for luna24', async () => {
    mockFetchImages.mockResolvedValue([])
    const result = await fetchLunarSamples('luna24')
    expect(result.sampleMeta).not.toBeNull()
    expect(result.sampleMeta!.mission).toBe('Luna 24')
    expect(result.sampleMeta!.massGrams).toBe(170)
  })

  it('returns null sampleMeta for an unknown locationId', async () => {
    mockFetchImages.mockResolvedValue([])
    const result = await fetchLunarSamples('tycho')
    expect(result.sampleMeta).toBeNull()
    expect(result.images).toEqual([])
  })

  it('searches NASA images using mission name', async () => {
    const fakeImage = {
      assetId: 'ce5-001',
      thumbUrl: 'https://example.com/thumb.jpg',
      fullUrl: 'https://example.com/full.jpg',
      instrument: 'CNSA',
      date: '2020-12-17T00:00:00Z',
      nasaUrl: 'https://images.nasa.gov/details/ce5-001',
    }
    mockFetchImages.mockResolvedValue([fakeImage])
    const result = await fetchLunarSamples('change5')
    expect(result.images).toHaveLength(1)
    expect(mockFetchImages).toHaveBeenCalledWith("Chang'e 5 lunar samples")
  })
})
