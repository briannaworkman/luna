import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { getLocationById } from '@/components/globe/locations'
import { runOrchestrator } from '@/lib/orchestrator/run'
import { createSseResponse } from '@/lib/orchestrator/sse'

const checkRateLimit = rateLimit(60_000, 10)

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  if (typeof b['query'] !== 'string' || b['query'].trim() === '') {
    return NextResponse.json({ error: 'query is required and must be a non-empty string' }, { status: 400 })
  }
  if (b['query'].length > 2000) {
    return NextResponse.json({ error: 'query must be 2000 characters or fewer' }, { status: 400 })
  }

  if (typeof b['locationId'] !== 'string' || b['locationId'].trim() === '') {
    return NextResponse.json({ error: 'locationId is required and must be a non-empty string' }, { status: 400 })
  }

  if (!Array.isArray(b['imageAssetIds']) || !b['imageAssetIds'].every((item): item is string => typeof item === 'string')) {
    return NextResponse.json({ error: 'imageAssetIds must be an array of strings' }, { status: 400 })
  }

  const query = b['query']
  const locationId = b['locationId']
  const imageAssetIds = b['imageAssetIds'] as string[]

  const location = getLocationById(locationId)
  if (!location) {
    return NextResponse.json({ error: 'Unknown locationId' }, { status: 400 })
  }

  const hasImages = imageAssetIds.length > 0

  return createSseResponse(async (emitter) => {
    await runOrchestrator({ query, location, hasImages, imageAssetIds, emit: (e) => emitter.emit(e) })
  }, 120_000)
}
