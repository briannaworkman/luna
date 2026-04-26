import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { NasaImage, NasaImagesResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchNasaImages } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const SPARSE_THRESHOLD = 2

const QuerySchema = z.object({
  q: z.string().trim().min(1),
})

export async function GET(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const parsed = QuerySchema.safeParse({ q: req.nextUrl.searchParams.get('q') })
  if (!parsed.success) {
    return NextResponse.json(
      { images: [], limitedCoverage: true },
      { status: 400 }
    )
  }

  let images: NasaImage[] = []
  try {
    images = await fetchNasaImages(parsed.data.q)
  } catch (err) {
    console.warn('[nasa-images] fetch failed, returning empty', err)
  }
  return NextResponse.json(
    { images, limitedCoverage: images.length < SPARSE_THRESHOLD },
    { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
  )
}
