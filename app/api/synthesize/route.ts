import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { getLocationById } from '@/components/globe/locations'
import { runDataIngest } from '@/lib/orchestrator/data-ingest'
import { deriveDataCompleteness } from '@/lib/synthesize/completeness'
import { runSynthesis } from '@/lib/synthesize/run'
import type { BriefStreamEvent } from '@/lib/types/brief'

const checkRateLimit = rateLimit(60_000, 5)

const encoder = new TextEncoder()

function sseEvent(event: BriefStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  // Validate query
  if (typeof b['query'] !== 'string' || b['query'].trim() === '') {
    return NextResponse.json(
      { error: 'query is required and must be a non-empty string' },
      { status: 400 },
    )
  }
  if (b['query'].length > 2000) {
    return NextResponse.json(
      { error: 'query must be 2000 characters or fewer' },
      { status: 400 },
    )
  }

  // Validate locationId
  if (typeof b['locationId'] !== 'string' || b['locationId'].trim() === '') {
    return NextResponse.json(
      { error: 'locationId is required and must be a non-empty string' },
      { status: 400 },
    )
  }

  // Validate agentOutputs
  if (
    typeof b['agentOutputs'] !== 'object' ||
    b['agentOutputs'] === null ||
    Array.isArray(b['agentOutputs']) ||
    !Object.values(b['agentOutputs'] as Record<string, unknown>).every(
      (v) => typeof v === 'string',
    )
  ) {
    return NextResponse.json(
      { error: 'agentOutputs must be an object of string values' },
      { status: 400 },
    )
  }

  // Validate activeAgents
  if (
    !Array.isArray(b['activeAgents']) ||
    !b['activeAgents'].every((item): item is string => typeof item === 'string')
  ) {
    return NextResponse.json(
      { error: 'activeAgents must be an array of strings' },
      { status: 400 },
    )
  }

  const query = b['query'] as string
  const locationId = b['locationId'] as string
  const agentOutputs = b['agentOutputs'] as Record<string, string>
  const activeAgents = b['activeAgents'] as string[]

  // Resolve location
  const location = getLocationById(locationId)
  if (!location) {
    return NextResponse.json({ error: 'Unknown locationId' }, { status: 400 })
  }

  const generatedAt = new Date().toISOString()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: BriefStreamEvent) => {
        controller.enqueue(encoder.encode(sseEvent(event)))
      }

      try {
        // Run data ingest (no-op emit since this route has no orchestrator stream)
        const dataContext = await runDataIngest({
          location,
          emit: () => undefined,
        })

        const completeness = deriveDataCompleteness(dataContext)

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
          emit(event)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        emit({ type: 'error', message, partial: undefined })
      } finally {
        controller.close()
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
