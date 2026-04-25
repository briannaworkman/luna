import { NextRequest, NextResponse } from 'next/server'
import type { LunarSamplesResponse, LunarSamplesErrorResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchLunarSamples } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

export async function GET(req: NextRequest): Promise<NextResponse<LunarSamplesResponse | LunarSamplesErrorResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<LunarSamplesResponse | LunarSamplesErrorResponse>

  const locationId = req.nextUrl.searchParams.get('locationId')?.trim()
  if (!locationId) {
    return NextResponse.json(
      { error: 'locationId is required', code: 'INVALID_PARAMS', images: [], sampleMeta: null },
      { status: 400 },
    )
  }

  const data = await fetchLunarSamples(locationId)
  return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_CONTROL_1H } })
}
