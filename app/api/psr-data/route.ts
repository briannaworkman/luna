import { NextRequest, NextResponse } from 'next/server'
import type { PsrDataResponse, PsrDataErrorResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchPsrData } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

export async function GET(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'lat and lon are required', code: 'INVALID_PARAMS', lampProducts: [], psrSummary: null },
      { status: 400 },
    )
  }

  const data = await fetchPsrData(lat, lon)
  return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_CONTROL_1H } })
}
