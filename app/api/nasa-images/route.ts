import { NextRequest, NextResponse } from 'next/server'
import type { NasaImagesResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchNasaImages } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const SPARSE_THRESHOLD = 2

export async function GET(req: NextRequest): Promise<NextResponse<NasaImagesResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<NasaImagesResponse>

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json(
      { images: [], limitedCoverage: true },
      { status: 400 }
    )
  }

  const images = await fetchNasaImages(q)
  return NextResponse.json(
    { images, limitedCoverage: images.length < SPARSE_THRESHOLD },
    { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
  )
}
