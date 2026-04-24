import { NextRequest, NextResponse } from 'next/server'
import type { IlluminationWindow, IlluminationWindowsErrorResponse } from '@/lib/types/nasa'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchIlluminationWindows } from '@/lib/data-sources'

export const dynamic = 'force-dynamic'

const checkRateLimit = rateLimit(60_000, 100)

export async function GET(
  request: NextRequest,
): Promise<NextResponse<IlluminationWindow[] | IlluminationWindowsErrorResponse>> {
  const rateLimitResponse = checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<IlluminationWindow[] | IlluminationWindowsErrorResponse>

  const { searchParams } = request.nextUrl
  const latStr = searchParams.get('lat')
  const lonStr = searchParams.get('lon')

  if (latStr === null || lonStr === null) {
    return NextResponse.json(
      { error: 'lat and lon query params are required', code: 'INVALID_PARAMS' as const },
      { status: 400 },
    )
  }

  const lat = Number(latStr)
  const lon = Number(lonStr)

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: 'lat must be in [-90, 90] and lon must be in [-180, 180]', code: 'INVALID_PARAMS' as const },
      { status: 400 },
    )
  }

  try {
    const windows = await fetchIlluminationWindows(lat, lon)
    return NextResponse.json(windows, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[svs-illumination] failed to load SVS dataset', err)
    return NextResponse.json(
      { error: 'SVS illumination data unavailable', code: 'FETCH_FAILED' as const },
      { status: 502 },
    )
  }
}
