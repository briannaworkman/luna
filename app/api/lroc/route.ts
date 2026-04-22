import { NextRequest, NextResponse } from 'next/server';
import type { LrocProduct, LrocResponse } from '@/lib/types/nasa';

const ODE_API = 'https://oderest.rsl.wustl.edu/live2/';
const TIMEOUT_MS = 8000;
const BOX_HALF_DEG = 0.5;
const MAX_RESULTS = 20;

// ODE REST API uses 0–360 longitude. Convert selenographic (-180 to 180) to 0–360.
function toPositiveLon(lon: number): number {
  return lon < 0 ? lon + 360 : lon;
}

// Build a ±0.5° bounding box. Lat is clamped to [-90, 90].
// Longitude is in 0–360; the ODE API handles wrap-around when westernlon > easternlon.
function buildBoundingBox(lat: number, lon: number) {
  const posLon = toPositiveLon(lon);
  const minlat = Math.max(-90, lat - BOX_HALF_DEG);
  const maxlat = Math.min(90, lat + BOX_HALF_DEG);
  const westernlon = toPositiveLon(lon - BOX_HALF_DEG);
  const easternlon = toPositiveLon(lon + BOX_HALF_DEG);
  return { minlat, maxlat, westernlon, easternlon, posLon };
}

interface OdeProduct {
  Product_name?: string;
  Map_resolution?: string;
  Observation_time?: string;
  External_url?: string;
}

async function fetchProducts(
  pt: string,
  box: ReturnType<typeof buildBoundingBox>
): Promise<OdeProduct[]> {
  const url = new URL(ODE_API);
  url.searchParams.set('query', 'product');
  url.searchParams.set('results', 'm');
  url.searchParams.set('output', 'JSON');
  url.searchParams.set('target', 'moon');
  url.searchParams.set('ihid', 'lro');
  url.searchParams.set('iid', 'lroc');
  url.searchParams.set('pt', pt);
  url.searchParams.set('westernlon', String(box.westernlon));
  url.searchParams.set('easternlon', String(box.easternlon));
  url.searchParams.set('minlat', String(box.minlat));
  url.searchParams.set('maxlat', String(box.maxlat));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return [];
    const json = await res.json();
    const result = json?.ODEResults;
    if (!result || result.Status === 'ERROR' || !result.Products) return [];

    // ODE returns a single object (not array) when there is only one product.
    const raw = result.Products.Product;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function normalizeProducts(raw: OdeProduct[], instrument: string): LrocProduct[] {
  return raw
    .map((p): LrocProduct | null => {
      const productName = p.Product_name;
      const resStr = p.Map_resolution;
      const date = p.Observation_time;
      const url = p.External_url;

      if (!productName || !resStr || !date || !url) return null;

      const resolutionMpp = parseFloat(resStr);
      if (isNaN(resolutionMpp)) return null;

      // Strip file extension from product name for the ID.
      const productId = productName.replace(/\.[^.]+$/, '');

      return { productId, resolutionMpp, acquisitionDate: date, downloadUrl: url, instrument };
    })
    .filter((p): p is LrocProduct => p !== null)
    .sort((a, b) => a.resolutionMpp - b.resolutionMpp)
    .slice(0, MAX_RESULTS);
}

export async function GET(req: NextRequest): Promise<NextResponse<LrocResponse>> {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ wac: [], nac: [] }, { status: 400 });
  }

  const box = buildBoundingBox(lat, lon);

  const [nacRaw, wacRaw] = await Promise.all([
    fetchProducts('CDRNAC4', box),
    fetchProducts('CDRWAC4', box),
  ]);

  const nac = normalizeProducts(nacRaw, 'NAC');
  const wac = normalizeProducts(wacRaw, 'WAC');

  return NextResponse.json(
    { wac, nac },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
