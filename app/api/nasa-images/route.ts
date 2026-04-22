import { NextRequest, NextResponse } from 'next/server';
import type { NasaImage, NasaImagesResponse } from '@/lib/types/nasa';
import { extractInstrument } from '@/lib/utils/extract-instrument';
import { fetchJson } from '@/lib/utils/fetch-with-timeout';
import { CACHE_CONTROL_1H } from '@/lib/constants/cache';

const NASA_IMAGES_API = 'https://images-api.nasa.gov/search';
const SPARSE_THRESHOLD = 2;

// Derive region-specific search terms from lat/lon for the fallback query.
// Selenographic: lon in [-90, 90] = near-side; outside = far-side.
// Tested terms: "moon far side surface" → 24 hits of actual far-side imagery;
// "moon south pole lunar surface" → 51 hits; "moon north pole lunar surface" works similarly.
function buildRegionQuery(lat: number, lon: number): string {
  const isFarSide = Math.abs(lon) > 90;
  if (isFarSide) return 'moon far side surface';
  if (lat > 60) return 'moon north pole lunar surface';
  if (lat < -60) return 'moon south pole lunar surface';
  return 'moon lunar surface';
}

interface NasaApiItem {
  href: string;
  data: Array<{
    nasa_id: string;
    date_created: string;
    title: string;
    center?: string;
    keywords?: string[];
  }>;
  links?: Array<{
    href: string;
    rel: string;
    render?: string;
  }>;
}

async function searchImages(query: string): Promise<NasaApiItem[]> {
  const url = new URL(NASA_IMAGES_API);
  url.searchParams.set('q', query);
  url.searchParams.set('media_type', 'image');
  url.searchParams.set('page_size', '20');

  try {
    const json = await fetchJson<{ collection: { items: NasaApiItem[] } }>(url);
    return (json.collection?.items ?? []) as NasaApiItem[];
  } catch {
    return [];
  }
}

function normalizeItems(items: NasaApiItem[]): NasaImage[] {
  return items
    .map((item): NasaImage | null => {
      const meta = item.data?.[0];
      if (!meta) return null;

      const thumbLink = item.links?.find(
        (l) => l.rel === 'preview' && l.render === 'image'
      );
      const fullLink =
        item.links?.find((l) => l.rel === 'canonical') ??
        item.links?.find((l) => l.rel === 'alternate');

      if (!thumbLink || !fullLink) return null;

      return {
        assetId: meta.nasa_id,
        thumbUrl: thumbLink.href,
        fullUrl: fullLink.href,
        instrument: extractInstrument(meta.keywords ?? []),
        date: meta.date_created,
        nasaUrl: `https://images.nasa.gov/details/${meta.nasa_id}`,
      };
    })
    .filter((img): img is NasaImage => img !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function GET(req: NextRequest): Promise<NextResponse<NasaImagesResponse>> {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name')?.trim();
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (!name || isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { images: [], limitedCoverage: true },
      { status: 400 }
    );
  }

  // Run both searches in parallel — name-specific and region-derived
  const regionQuery = buildRegionQuery(lat, lon);
  const [primaryItems, fallbackItems] = await Promise.all([
    searchImages(`${name} moon lunar`),
    searchImages(regionQuery),
  ]);

  const primaryImages = normalizeItems(primaryItems);
  const seen = new Set(primaryImages.map((img) => img.assetId));
  const merged = [
    ...primaryImages,
    ...normalizeItems(fallbackItems).filter((img) => !seen.has(img.assetId)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(
    { images: merged, limitedCoverage: merged.length < SPARSE_THRESHOLD },
    { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
  );
}
