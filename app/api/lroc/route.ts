import { NextRequest, NextResponse } from 'next/server';
import type { LrocProduct, LrocResponse, LrocErrorResponse } from '@/lib/types/nasa';
import { fetchJson, TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout';
import { CACHE_CONTROL_1H } from '@/lib/constants/cache';
import { rateLimit } from '@/lib/middleware/rate-limit';

const checkRateLimit = rateLimit(60_000, 100);

const ODE_API = 'https://oderest.rsl.wustl.edu/live2/';
const BOX_HALF_DEG = 0.5;
const MAX_RESULTS = 20;
const PT_NAC = 'CDRNAC4';
const PT_WAC = 'CDRWAC4';
const INSTRUMENT_NAC = 'LROC NAC';
const INSTRUMENT_WAC = 'LROC WAC';

function toPositiveLon(lon: number): number {
  return lon < 0 ? lon + 360 : lon;
}

// Build a ±0.5° bounding box. Lat is clamped to [-90, 90].
// Longitude is in 0–360; the ODE API handles wrap-around when westernlon > easternlon.
function buildBoundingBox(lat: number, lon: number) {
  const minlat = Math.max(-90, lat - BOX_HALF_DEG);
  const maxlat = Math.min(90, lat + BOX_HALF_DEG);
  const westernlon = toPositiveLon(lon - BOX_HALF_DEG);
  const easternlon = toPositiveLon(lon + BOX_HALF_DEG);
  return { minlat, maxlat, westernlon, easternlon };
}

interface OdeProduct {
  Product_name?: string;
  Map_resolution?: string;
  Observation_time?: string;
  External_url?: string;
}

interface OdeJson {
  ODEResults: {
    Status: string;
    Products?: { Product?: unknown };
  };
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

  const json = await fetchJson<OdeJson>(url);
  const result = json.ODEResults;
  if (result.Status === 'ERROR') throw new UpstreamError();
  if (!result.Products) return [];

  // ODE returns a single object (not array) when there is only one product.
  const raw = result.Products.Product;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
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

      const productId = productName.replace(/\.[^.]+$/, '');

      return { productId, resolutionMpp, acquisitionDate: date, downloadUrl: url, instrument };
    })
    .filter((p): p is LrocProduct => p !== null)
    .sort((a, b) => a.resolutionMpp - b.resolutionMpp)
    .slice(0, MAX_RESULTS);
}

export async function GET(req: NextRequest): Promise<NextResponse<LrocResponse | LrocErrorResponse>> {
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<LrocResponse | LrocErrorResponse>;

  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ wac: [], nac: [] }, { status: 400 });
  }

  const box = buildBoundingBox(lat, lon);

  try {
    const [nacRaw, wacRaw] = await Promise.all([
      fetchProducts(PT_NAC, box),
      fetchProducts(PT_WAC, box),
    ]);

    const nac = normalizeProducts(nacRaw, INSTRUMENT_NAC);
    const wac = normalizeProducts(wacRaw, INSTRUMENT_WAC);

    return NextResponse.json(
      { wac, nac },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    );
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.error('[lroc] ODE request timed out', { errorType: 'TIMEOUT', lat, lon });
      return NextResponse.json({ error: 'LROC data unavailable', code: 'TIMEOUT', results: [] });
    }
    if (err instanceof UpstreamError) {
      console.error('[lroc] ODE upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon });
    } else {
      console.error('[lroc] unexpected error', { lat, lon }, err);
    }
    return NextResponse.json({ error: 'LROC data unavailable', code: 'UPSTREAM_ERROR', results: [] });
  }
}
