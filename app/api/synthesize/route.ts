import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { getLocationById } from '@/components/globe/locations'
import { runDataIngest } from '@/lib/orchestrator/data-ingest'
import { deriveDataCompleteness } from '@/lib/synthesize/completeness'
import { runSynthesis } from '@/lib/synthesize/run'
import { SseEmitter } from '@/lib/sse'
import type { BriefStreamEvent } from '@/lib/types/brief'

const checkRateLimit = rateLimit(60_000, 5)

const RequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  locationId: z.string().min(1),
  agentOutputs: z.record(z.string(), z.string()),
  activeAgents: z.array(z.string()),
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
  const { query, locationId, agentOutputs, activeAgents } = parsed.data

  const location = getLocationById(locationId)
  if (!location) {
    return NextResponse.json({ error: 'Unknown locationId' }, { status: 400 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emitter = new SseEmitter<BriefStreamEvent>(controller)
      try {
        const dataContext = await runDataIngest({
          location,
          emit: () => undefined,
        })
        const completeness = deriveDataCompleteness(dataContext)
        // Stamp generatedAt at synthesis call time, after data ingest
        // (which can take several seconds).
        const generatedAt = new Date().toISOString()

        for await (const event of runSynthesis({
          locationName: dataContext.location.name,
          lat: dataContext.location.lat,
          lon: dataContext.location.lon,
          isProposed: dataContext.location.isProposed,
          query,
          generatedAt,
          completeness,
          activeAgents,
          agentOutputs,
        })) {
          emitter.emit(event)
        }
      } catch (err) {
        emitter.emit({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          partial: undefined,
        })
      } finally {
        emitter.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
