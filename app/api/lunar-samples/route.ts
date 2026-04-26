import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { LunarSamplesResponse, LunarSamplesErrorResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchLunarSamples } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const QuerySchema = z.object({
  locationId: z.string().trim().min(1),
})

export async function GET(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const parsed = QuerySchema.safeParse({
    locationId: req.nextUrl.searchParams.get('locationId'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'locationId is required', code: 'INVALID_PARAMS', images: [], sampleMeta: null },
      { status: 400 },
    )
  }

  const data = await fetchLunarSamples(parsed.data.locationId)
  return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_CONTROL_1H } })
}
