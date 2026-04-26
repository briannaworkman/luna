import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { JscSamplesResponse, JscSamplesErrorResponse } from '@/lib/types/nasa'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { findNearestStation } from '@/lib/data/apollo-stations'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchJscSamples, MAX_JSC_DISTANCE_KM } from '@/lib/data-sources/fetch-jsc-samples'

const checkRateLimit = rateLimit(60_000, 100)

const CoerceFiniteNumber = z.string().trim().min(1).transform(Number).pipe(z.number().finite())

const QuerySchema = z.object({
  lat: CoerceFiniteNumber,
  lon: CoerceFiniteNumber,
})

export async function GET(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const parsed = QuerySchema.safeParse({
    lat: req.nextUrl.searchParams.get('lat'),
    lon: req.nextUrl.searchParams.get('lon'),
  })

  if (!parsed.success) {
    return NextResponse.json({ results: [], nearestMission: null }, { status: 400 })
  }

  const { lat, lon } = parsed.data
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
