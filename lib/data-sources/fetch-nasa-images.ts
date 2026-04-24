import type { NasaImage } from '@/lib/types/nasa'
import { extractInstrument } from '@/lib/utils/extract-instrument'
import { fetchJson } from '@/lib/utils/fetch-with-timeout'

const NASA_IMAGES_API = 'https://images-api.nasa.gov/search'

interface NasaApiItem {
  href: string
  data: Array<{
    nasa_id: string
    date_created: string
    title: string
    center?: string
    keywords?: string[]
  }>
  links?: Array<{
    href: string
    rel: string
    render?: string
  }>
}

async function searchImages(q: string): Promise<NasaApiItem[]> {
  const url = new URL(NASA_IMAGES_API)
  url.searchParams.set('media_type', 'image')
  url.searchParams.set('page_size', '30')
  url.searchParams.set('q', q)

  try {
    const json = await fetchJson<{ collection: { items: NasaApiItem[] } }>(url)
    return (json.collection?.items ?? []) as NasaApiItem[]
  } catch (err) {
    console.warn('[nasa-images] search failed, returning empty', err)
    return []
  }
}

// Apollo sequential frame IDs: as11-40-5931, as16-120-19187, etc.
// Keep only the first frame per mission+roll to avoid near-duplicate shots.
const APOLLO_FRAME_RE = /^(as\d+-\d+)-\d+$/i

function deduplicateSequences(images: NasaImage[]): NasaImage[] {
  const seenRolls = new Set<string>()
  return images.filter((img) => {
    const match = img.assetId.match(APOLLO_FRAME_RE)
    if (!match) return true
    const roll = match[1]!.toLowerCase()
    if (seenRolls.has(roll)) return false
    seenRolls.add(roll)
    return true
  })
}

function normalizeItems(items: NasaApiItem[]): NasaImage[] {
  return items
    .map((item): NasaImage | null => {
      const meta = item.data?.[0]
      if (!meta) return null

      const thumbLink = item.links?.find(
        (l) => l.rel === 'preview' && l.render === 'image'
      )
      const fullLink =
        item.links?.find((l) => l.rel === 'canonical') ??
        item.links?.find((l) => l.rel === 'alternate')

      if (!thumbLink || !fullLink) return null

      return {
        assetId: meta.nasa_id,
        thumbUrl: thumbLink.href,
        fullUrl: fullLink.href,
        instrument: extractInstrument(meta.keywords ?? []),
        date: meta.date_created,
        nasaUrl: `https://images.nasa.gov/details/${meta.nasa_id}`,
      }
    })
    .filter((img): img is NasaImage => img !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchNasaImages(q: string): Promise<NasaImage[]> {
  return deduplicateSequences(normalizeItems(await searchImages(q)))
}
