import { NextRequest, NextResponse } from 'next/server'
import type { LrocResponse, LrocErrorResponse } from '@/lib/types/nasa'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchLrocProducts, INSTRUMENT_NAC } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

export async function GET(req: NextRequest): Promise<NextResponse<LrocResponse | LrocErrorResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<LrocResponse | LrocErrorResponse>

  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ wac: [], nac: [] }, { status: 400 })
  }

  try {
    const products = await fetchLrocProducts(lat, lon)
    const nac = products.filter((p) => p.instrument === INSTRUMENT_NAC)
    const wac = products.filter((p) => p.instrument !== INSTRUMENT_NAC)

    return NextResponse.json(
      { wac, nac },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    )
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.error('[lroc] ODE request timed out', { errorType: 'TIMEOUT', lat, lon })
      return NextResponse.json({ error: 'LROC data unavailable', code: 'TIMEOUT', results: [] })
    }
    if (err instanceof UpstreamError) {
      console.error('[lroc] ODE upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon })
    } else {
      console.error('[lroc] unexpected error', { lat, lon }, err)
    }
    return NextResponse.json({ error: 'LROC data unavailable', code: 'UPSTREAM_ERROR', results: [] })
  }
}
