import { NextRequest, NextResponse } from 'next/server';
import type { IlluminationWindow, IlluminationWindowsErrorResponse } from '@/lib/types/nasa';
import { getSvsData } from '@/lib/svs-cache';

export const dynamic = 'force-dynamic';

const DEG_TO_RAD = Math.PI / 180;

function solarElevationDeg(
  targetLat: number,
  targetLon: number,
  subsolarLat: number,
  subsolarLon: number,
): number {
  const cosD =
    Math.sin(targetLat * DEG_TO_RAD) * Math.sin(subsolarLat * DEG_TO_RAD) +
    Math.cos(targetLat * DEG_TO_RAD) * Math.cos(subsolarLat * DEG_TO_RAD) *
    Math.cos((subsolarLon - targetLon) * DEG_TO_RAD);
  const separationDeg = Math.acos(Math.max(-1, Math.min(1, cosD))) / DEG_TO_RAD;
  return 90 - separationDeg;
}

function parseSvsTime(timeStr: string): Date {
  // "01 Jan 2026 00:00 UT" → valid UTC Date
  return new Date(timeStr.replace(' UT', ' UTC'));
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<IlluminationWindow[] | IlluminationWindowsErrorResponse>> {
  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (latStr === null || lonStr === null) {
    return NextResponse.json(
      { error: 'lat and lon query params are required', code: 'INVALID_PARAMS' as const },
      { status: 400 },
    );
  }

  const lat = Number(latStr);
  const lon = Number(lonStr);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: 'lat must be in [-90, 90] and lon must be in [-180, 180]', code: 'INVALID_PARAMS' as const },
      { status: 400 },
    );
  }

  try {
    const entries = await getSvsData();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const windowStartMs = today.getTime();
    const windowEndMs = windowStartMs + 30 * 24 * 60 * 60 * 1000;

    interface DayAcc {
      maxElevation: number;
      illuminatedCount: number;
      firstIlluminated: Date | null;
      lastIlluminated: Date | null;
    }

    const byDate = new Map<string, DayAcc>();

    for (const entry of entries) {
      const ts = parseSvsTime(entry.time);
      const tsMs = ts.getTime();
      if (tsMs < windowStartMs || tsMs >= windowEndMs) continue;

      const dateKey = ts.toISOString().slice(0, 10);
      const elevation = solarElevationDeg(lat, lon, entry.subsolar.lat, entry.subsolar.lon);

      let day = byDate.get(dateKey);
      if (!day) {
        day = { maxElevation: elevation, illuminatedCount: 0, firstIlluminated: null, lastIlluminated: null };
        byDate.set(dateKey, day);
      } else if (elevation > day.maxElevation) {
        day.maxElevation = elevation;
      }

      if (elevation > 0) {
        day.illuminatedCount++;
        if (!day.firstIlluminated) day.firstIlluminated = ts;
        day.lastIlluminated = ts;
      }
    }

    const windows: IlluminationWindow[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, day]) => ({
        date,
        sunriseUtc: day.firstIlluminated?.toISOString() ?? null,
        sunsetUtc: day.lastIlluminated?.toISOString() ?? null,
        illuminatedHours: day.illuminatedCount,
        solarElevationDeg: parseFloat(day.maxElevation.toFixed(2)),
        permanentlyShadowed: day.illuminatedCount === 0,
      }));

    return NextResponse.json(windows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[svs-illumination] failed to load SVS dataset', err);
    return NextResponse.json(
      { error: 'SVS illumination data unavailable', code: 'FETCH_FAILED' as const },
      { status: 502 },
    );
  }
}
