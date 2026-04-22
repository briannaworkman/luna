import { NextRequest, NextResponse } from 'next/server';
import type { NasaImage, NasaImagesResponse } from '@/lib/types/nasa';

const NASA_IMAGES_API = 'https://images-api.nasa.gov/search';
const TIMEOUT_MS = 8000;
const RESULT_LIMIT = 4;
const SPARSE_THRESHOLD = 2;

// Known lunar instrument/mission keywords to extract a meaningful instrument label
const INSTRUMENT_KEYWORDS: [RegExp, string][] = [
  [/LROC|Lunar Reconnaissance Orbiter Camera/i, 'LROC'],
  [/LRO|Lunar Reconnaissance Orbiter/i, 'LRO'],
  [/Clementine/i, 'Clementine'],
  [/Chandrayaan/i, 'Chandrayaan'],
  [/LCROSS/i, 'LCROSS'],
  [/Diviner/i, 'Diviner'],
  [/GRAIL/i, 'GRAIL'],
  [/Apollo/i, 'Apollo'],
  [/Kaguya|SELENE/i, 'Kaguya'],
];

function extractInstrument(keywords: string[], center: string): string {
  const combined = keywords.join(' ');
  for (const [pattern, label] of INSTRUMENT_KEYWORDS) {
    if (pattern.test(combined)) return label;
  }
  return center || 'NASA';
}

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
  url.searchParams.set('page_size', '10');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.collection?.items ?? []) as NasaApiItem[];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
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
        instrument: extractInstrument(meta.keywords ?? [], meta.center ?? ''),
        date: meta.date_created,
        nasaUrl: `https://images.nasa.gov/details/${meta.nasa_id}`,
      };
    })
    .filter((img): img is NasaImage => img !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RESULT_LIMIT);
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

  // Primary search: location name
  const primaryItems = await searchImages(`${name} moon lunar`);
  const primaryImages = normalizeItems(primaryItems);

  if (primaryImages.length >= SPARSE_THRESHOLD) {
    return NextResponse.json({
      images: primaryImages,
      limitedCoverage: false,
    });
  }

  // Fallback: coordinate-region keywords
  const regionQuery = buildRegionQuery(lat, lon);
  const fallbackItems = await searchImages(regionQuery);
  const fallbackImages = normalizeItems(fallbackItems);

  // Merge: primary results first (deduped), pad with fallback
  const seen = new Set(primaryImages.map((img) => img.assetId));
  const merged = [
    ...primaryImages,
    ...fallbackImages.filter((img) => !seen.has(img.assetId)),
  ].slice(0, RESULT_LIMIT);

  return NextResponse.json({
    images: merged,
    limitedCoverage: merged.length < SPARSE_THRESHOLD,
  });
}
