import { NextRequest, NextResponse } from 'next/server';
import type { JscSample, JscSamplesResponse, JscSamplesErrorResponse } from '@/lib/types/nasa';
import { fetchJson, TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout';
import { CACHE_CONTROL_1H } from '@/lib/constants/cache';

const JSC_API = 'https://curator.jsc.nasa.gov/rest/lunarapi/samples';
const JSC_CATALOG_URL = 'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm';
const MOON_RADIUS_KM = 1737.4;
const MAX_DISTANCE_KM = 500;
const MAX_RESULTS = 10;

interface ApolloStation {
  mission: string;
  station: string;
  lat: number;
  lon: number;
}

// Hardcoded lookup table of Apollo landing sites and sample stations.
// Coordinates in selenographic degrees (lat: -90 to 90, lon: -180 to 180).
// Sources: NASA mission reports, ALSJ, LRO LROC landing site imagery.
const APOLLO_STATIONS: ApolloStation[] = [
  // Apollo 11 — Sea of Tranquility (July 1969)
  { mission: 'Apollo 11', station: 'LM', lat: 0.6741, lon: 23.4727 },

  // Apollo 12 — Ocean of Storms (November 1969)
  { mission: 'Apollo 12', station: 'LM', lat: -3.0128, lon: -23.4219 },

  // Apollo 14 — Fra Mauro (February 1971)
  { mission: 'Apollo 14', station: 'LM', lat: -3.6453, lon: -17.4714 },
  { mission: 'Apollo 14', station: 'C', lat: -3.6773, lon: -17.4756 }, // Cone Crater area
  { mission: 'Apollo 14', station: 'G', lat: -3.6620, lon: -17.4795 },

  // Apollo 15 — Hadley-Apennine (July–August 1971)
  { mission: 'Apollo 15', station: 'LM', lat: 26.1322, lon: 3.6339 },
  { mission: 'Apollo 15', station: '1', lat: 26.0836, lon: 3.6619 },   // Elbow Crater
  { mission: 'Apollo 15', station: '2', lat: 26.2097, lon: 3.6430 },   // Rima Hadley south
  { mission: 'Apollo 15', station: '3', lat: 26.2469, lon: 3.6524 },
  { mission: 'Apollo 15', station: '4', lat: 26.1706, lon: 3.6468 },   // Dune Crater
  { mission: 'Apollo 15', station: '6', lat: 26.1469, lon: 3.6527 },   // Hadley Delta
  { mission: 'Apollo 15', station: '8', lat: 26.1373, lon: 3.6347 },
  { mission: 'Apollo 15', station: '9', lat: 26.1322, lon: 3.6339 },
  { mission: 'Apollo 15', station: '9A', lat: 26.1344, lon: 3.6353 },

  // Apollo 16 — Descartes Highlands (April 1972)
  { mission: 'Apollo 16', station: 'LM', lat: -8.9734, lon: 15.4986 },
  { mission: 'Apollo 16', station: '1', lat: -8.9742, lon: 15.4994 },  // Plum Crater
  { mission: 'Apollo 16', station: '2', lat: -9.0119, lon: 15.5210 },
  { mission: 'Apollo 16', station: '4', lat: -8.9920, lon: 15.4846 },
  { mission: 'Apollo 16', station: '5', lat: -8.9975, lon: 15.4724 },
  { mission: 'Apollo 16', station: '6', lat: -9.0008, lon: 15.4699 },
  { mission: 'Apollo 16', station: '8', lat: -8.9831, lon: 15.4835 },
  { mission: 'Apollo 16', station: '9', lat: -8.9734, lon: 15.4986 },
  { mission: 'Apollo 16', station: '11', lat: -9.0534, lon: 15.5120 }, // South Ray Crater

  // Apollo 17 — Taurus-Littrow Valley (December 1972)
  { mission: 'Apollo 17', station: 'LM', lat: 20.1908, lon: 30.7717 },
  { mission: 'Apollo 17', station: '1A', lat: 20.2188, lon: 30.7755 }, // Steno Crater
  { mission: 'Apollo 17', station: '2', lat: 20.1922, lon: 30.7717 },  // Nansen Crater area
  { mission: 'Apollo 17', station: '2A', lat: 20.1922, lon: 30.7717 },
  { mission: 'Apollo 17', station: '3', lat: 20.1690, lon: 30.7745 },
  { mission: 'Apollo 17', station: '4', lat: 20.1655, lon: 30.7678 },
  { mission: 'Apollo 17', station: '5', lat: 20.1719, lon: 30.7699 },
  { mission: 'Apollo 17', station: '6', lat: 20.4963, lon: 30.7965 }, // North Massif
  { mission: 'Apollo 17', station: '7', lat: 20.4872, lon: 30.7755 },
  { mission: 'Apollo 17', station: '8', lat: 20.4801, lon: 30.7681 }, // Sculptured Hills
  { mission: 'Apollo 17', station: '9', lat: 20.4790, lon: 30.7602 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * MOON_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function findNearestStation(lat: number, lon: number): (ApolloStation & { distanceKm: number }) | null {
  let nearest: (ApolloStation & { distanceKm: number }) | null = null;
  for (const station of APOLLO_STATIONS) {
    const distanceKm = haversineKm(lat, lon, station.lat, station.lon);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { ...station, distanceKm };
    }
  }
  return nearest;
}

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
      // Then by weight descending
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
    if (err instanceof TimeoutError) {
      console.error('[jsc-samples] JSC request timed out', { errorType: 'TIMEOUT', lat, lon, mission: nearest.mission, station: nearest.station });
      return NextResponse.json({ error: 'JSC sample data unavailable', code: 'TIMEOUT', results: [], nearestMission: null });
    }
    if (err instanceof UpstreamError) {
      console.error('[jsc-samples] JSC upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon, mission: nearest.mission, station: nearest.station });
    } else {
      console.error('[jsc-samples] unexpected error', { lat, lon }, err);
    }
    return NextResponse.json({ error: 'JSC sample data unavailable', code: 'UPSTREAM_ERROR', results: [], nearestMission: null });
  }
}
