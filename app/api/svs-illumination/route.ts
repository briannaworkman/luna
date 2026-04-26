import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { IlluminationWindow, IlluminationWindowsErrorResponse } from '@/lib/types/nasa'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchIlluminationWindows } from '@/lib/data-sources'

export const dynamic = 'force-dynamic'

const checkRateLimit = rateLimit(60_000, 100)

const QuerySchema = z.object({
  lat: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-90).max(90)),
  lon: z.string().trim().min(1).transform(Number).pipe(z.number().finite().min(-180).max(180)),
})

export async function GET(
  request: NextRequest,
): Promise<Response> {
  const rateLimitResponse = checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const parsed = QuerySchema.safeParse({
    lat: request.nextUrl.searchParams.get('lat'),
    lon: request.nextUrl.searchParams.get('lon'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'lat must be in [-90, 90] and lon must be in [-180, 180]', code: 'INVALID_PARAMS' as const },
      { status: 400 },
    )
  }

  try {
    const windows = await fetchIlluminationWindows(parsed.data.lat, parsed.data.lon)
    return NextResponse.json(windows, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[svs-illumination] failed to load SVS dataset', err)
    return NextResponse.json(
      { error: 'SVS illumination data unavailable', code: 'FETCH_FAILED' as const },
      { status: 502 },
    )
  }
}
