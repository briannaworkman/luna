import { NextRequest, NextResponse } from 'next/server'
import type { JscSamplesResponse, JscSamplesErrorResponse } from '@/lib/types/nasa'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { findNearestStation } from '@/lib/data/apollo-stations'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchJscSamples, MAX_JSC_DISTANCE_KM } from '@/lib/data-sources/fetch-jsc-samples'

const checkRateLimit = rateLimit(60_000, 100)

export async function GET(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ results: [], nearestMission: null }, { status: 400 })
  }

  const nearest = findNearestStation(lat, lon)

  if (!nearest || nearest.distanceKm > MAX_JSC_DISTANCE_KM) {
    return NextResponse.json(
      { results: [], nearestMission: null },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    )
  }

  try {
    const results = await fetchJscSamples(lat, lon)

    return NextResponse.json(
      { results, nearestMission: nearest.mission },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    )
  } catch (err) {
    const jscError = (code: 'TIMEOUT' | 'UPSTREAM_ERROR'): JscSamplesErrorResponse => ({
      error: 'JSC sample data unavailable',
      code,
      results: [],
      nearestMission: null,
    })
    if (err instanceof TimeoutError) {
      console.error('[jsc-samples] JSC request timed out', { errorType: 'TIMEOUT', lat, lon, mission: nearest.mission, station: nearest.station })
      return NextResponse.json(jscError('TIMEOUT'))
    }
    if (err instanceof UpstreamError) {
      console.error('[jsc-samples] JSC upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon, mission: nearest.mission, station: nearest.station })
    } else {
      console.error('[jsc-samples] unexpected error', { lat, lon }, err)
    }
    return NextResponse.json(jscError('UPSTREAM_ERROR'))
  }
}
