import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchNasaImages } from './fetch-nasa-images'

function makeItem(id: string, date: string, keywords: string[] = []) {
  return {
    href: `https://images-assets.nasa.gov/image/${id}/collection.json`,
    data: [{ nasa_id: id, date_created: date, title: `Image ${id}`, keywords }],
    links: [
      { href: `https://images-assets.nasa.gov/image/${id}/${id}~thumb.jpg`, rel: 'preview', render: 'image' },
      { href: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`, rel: 'canonical', render: 'image' },
    ],
  }
}

function nasaResponse(items: unknown[]) {
  return { ok: true, json: async () => ({ collection: { items } }) }
}

describe('fetchNasaImages', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('happy path: returns normalized and deduplicated images', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      nasaResponse([
        makeItem('lroc-001', '2024-06-01T00:00:00Z'),
        makeItem('lroc-002', '2023-01-01T00:00:00Z'),
      ])
    ))

    const result = await fetchNasaImages('Tycho crater Moon')
    expect(result).toHaveLength(2)
    const first = result[0]
    expect(first).toBeDefined()
    if (!first) return
    expect(first.assetId).toBe('lroc-001')
    expect(first).toHaveProperty('thumbUrl')
    expect(first).toHaveProperty('fullUrl')
    expect(first).toHaveProperty('nasaUrl')
    expect(first).toHaveProperty('instrument')
    expect(first).toHaveProperty('date')
  })

  it('returns [] when API returns empty items', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nasaResponse([])))
    const result = await fetchNasaImages('Carroll crater Moon')
    expect(result).toEqual([])
  })

  it('returns [] on timeout (fetch throws AbortError)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    const result = await fetchNasaImages('Tycho lunar crater Moon')
    expect(result).toEqual([])
  })

  it('returns [] on upstream error (non-ok response)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const result = await fetchNasaImages('Shackleton crater Moon')
    expect(result).toEqual([])
  })

  it('returns [] on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))
    const result = await fetchNasaImages('Aristarchus crater Moon')
    expect(result).toEqual([])
  })

  it('deduplicates Apollo sequential frames', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      nasaResponse([
        makeItem('as11-40-5931', '2024-01-01T00:00:00Z'),
        makeItem('as11-40-5932', '2024-01-01T00:00:00Z'),
        makeItem('as11-40-5933', '2024-01-01T00:00:00Z'),
      ])
    ))

    const result = await fetchNasaImages('Apollo 11 lunar crater Moon')
    expect(result).toHaveLength(1)
    const first = result[0]
    if (!first) return
    expect(first.assetId).toBe('as11-40-5931')
  })

  it('sorts images by date descending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      nasaResponse([
        makeItem('old-img', '2020-01-01T00:00:00Z'),
        makeItem('new-img', '2024-06-01T00:00:00Z'),
      ])
    ))

    const result = await fetchNasaImages('Tycho crater Moon')
    const first = result[0]
    const second = result[1]
    if (!first || !second) return
    expect(first.assetId).toBe('new-img')
    expect(second.assetId).toBe('old-img')
  })
})
