import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { getLocationById } from '@/components/globe/locations'
import { runOrchestrator } from '@/lib/orchestrator/run'
import { createSseResponse } from '@/lib/orchestrator/sse'

const checkRateLimit = rateLimit(60_000, 10)

const RequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  locationId: z.string().min(1),
  imageAssetIds: z.array(z.string()).max(4, '4 or fewer entries allowed'),
})

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.') ?? ''
    const error = path ? `${path}: ${issue!.message}` : issue?.message ?? 'Invalid request body'
    return NextResponse.json({ error }, { status: 400 })
  }

  const { query, locationId, imageAssetIds } = parsed.data

  const location = getLocationById(locationId)
  if (!location) {
    return NextResponse.json({ error: 'Unknown locationId' }, { status: 400 })
  }

  const hasImages = imageAssetIds.length > 0

  return createSseResponse(async (emitter) => {
    await runOrchestrator({ query, location, hasImages, imageAssetIds, emit: (e) => emitter.emit(e) })
  }, 120_000)
}
