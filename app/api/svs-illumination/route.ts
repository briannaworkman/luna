import { NextResponse } from 'next/server';
import type { SvsIlluminationResponse, SvsIlluminationErrorResponse } from '@/lib/types/nasa';
import { getSvsData } from '@/lib/svs-cache';

// Always dynamic — response content comes from server-side cache, not per-request params.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<SvsIlluminationResponse | SvsIlluminationErrorResponse>> {
  try {
    const entries = await getSvsData();
    return NextResponse.json(
      { entries, source: 'svs.gsfc.nasa.gov/5587' },
      // No HTTP cache: data is served from server-side memory/disk; CDN caching gains nothing.
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[svs-illumination] failed to load SVS dataset', err);
    return NextResponse.json(
      { error: 'SVS illumination data unavailable', code: 'FETCH_FAILED' },
      { status: 502 }
    );
  }
}
