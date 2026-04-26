import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { PsrDataResponse, PsrDataErrorResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchPsrData } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const CoerceFiniteNumber = z.string().min(1).transform(Number).pipe(z.number().finite())

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
    return NextResponse.json(
      { error: 'lat and lon are required', code: 'INVALID_PARAMS', lampProducts: [], psrSummary: null },
      { status: 400 },
    )
  }

  const data = await fetchPsrData(parsed.data.lat, parsed.data.lon)
  return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_CONTROL_1H } })
}
