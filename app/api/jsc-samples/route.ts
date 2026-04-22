import { NextRequest, NextResponse } from 'next/server';
import type { JscSample, JscSamplesResponse, JscSamplesErrorResponse } from '@/lib/types/nasa';
import { fetchJson, TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout';
import { CACHE_CONTROL_1H } from '@/lib/constants/cache';
import { findNearestStation } from '@/lib/data/apollo-stations';

const JSC_API = 'https://curator.jsc.nasa.gov/rest/lunarapi/samples';
const JSC_CATALOG_URL = 'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm';
const MAX_DISTANCE_KM = 500;
const MAX_RESULTS = 10;

interface JscRawSample {
  GENERIC: string;
  SAMPLEID: string | null;
  MISSION: string;
  STATION: string | null;
  ORIGINALWEIGHT: number | null;
  SAMPLETYPE: string | null;
  SAMPLESUBTYPE: string | null;
  GENERICDESCRIPTION: string | null;
}

function buildMineralFlags(type: string | null, subtype: string | null): string[] {
  const flags: string[] = [];
  if (type) flags.push(type.toLowerCase());
  if (subtype && subtype.toLowerCase() !== type?.toLowerCase()) {
    flags.push(subtype.toLowerCase());
  }
  return flags;
}

function normalizeSamples(raw: JscRawSample[], mission: string, station: string): JscSample[] {
  return raw
    .map((s): JscSample => ({
      sampleId: s.GENERIC,
      mission: s.MISSION || mission,
      station: s.STATION ?? station,
      weight: s.ORIGINALWEIGHT ?? null,
      mineralFlags: buildMineralFlags(s.SAMPLETYPE, s.SAMPLESUBTYPE),
      description: s.GENERICDESCRIPTION ?? null,
      jscUrl: `${JSC_CATALOG_URL}?sample=${s.GENERIC}`,
    }))
    .sort((a, b) => {
      // Prefer non-soil samples (rocks, breccias) for mineralogy relevance
      const aIsSoil = a.mineralFlags[0] === 'soil';
      const bIsSoil = b.mineralFlags[0] === 'soil';
      if (aIsSoil !== bIsSoil) return aIsSoil ? 1 : -1;
      return (b.weight ?? 0) - (a.weight ?? 0);
    })
    .slice(0, MAX_RESULTS);
}

export async function GET(req: NextRequest): Promise<NextResponse<JscSamplesResponse | JscSamplesErrorResponse>> {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ results: [], nearestMission: null }, { status: 400 });
  }

  const nearest = findNearestStation(lat, lon);

  if (!nearest || nearest.distanceKm > MAX_DISTANCE_KM) {
    return NextResponse.json(
      { results: [], nearestMission: null },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    );
  }

  const url = `${JSC_API}/samplesbystation/${encodeURIComponent(nearest.mission)}/${encodeURIComponent(nearest.station)}`;

  try {
    const raw = await fetchJson<JscRawSample[]>(url);
    const results = normalizeSamples(raw, nearest.mission, nearest.station);

    return NextResponse.json(
      { results, nearestMission: nearest.mission },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    );
  } catch (err) {
    const jscError = (code: 'TIMEOUT' | 'UPSTREAM_ERROR'): JscSamplesErrorResponse => ({
      error: 'JSC sample data unavailable',
      code,
      results: [],
      nearestMission: null,
    });
    if (err instanceof TimeoutError) {
      console.error('[jsc-samples] JSC request timed out', { errorType: 'TIMEOUT', lat, lon, mission: nearest.mission, station: nearest.station });
      return NextResponse.json(jscError('TIMEOUT'));
    }
    if (err instanceof UpstreamError) {
      console.error('[jsc-samples] JSC upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon, mission: nearest.mission, station: nearest.station });
    } else {
      console.error('[jsc-samples] unexpected error', { lat, lon }, err);
    }
    return NextResponse.json(jscError('UPSTREAM_ERROR'));
  }
}
