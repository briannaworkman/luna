import type { OrchestratorEvent } from '@/lib/types/agent'
import { serializeEvent, SseEmitter } from '@/lib/sse'

export { serializeEvent, SseEmitter }

export function createSseResponse(
  handler: (emitter: SseEmitter<OrchestratorEvent>) => Promise<void>,
  timeoutMs = 120_000,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emitter = new SseEmitter<OrchestratorEvent>(controller)

      const timeoutId = setTimeout(() => {
        emitter.emit({
          type: 'agent-error',
          agent: 'data-ingest',
          message: `Request timed out after ${Math.round(timeoutMs / 1000)} seconds`,
        })
        emitter.emit({ type: 'done' })
        emitter.close()
      }, timeoutMs)

      handler(emitter)
        .then(() => {
          clearTimeout(timeoutId)
          emitter.close()
        })
        .catch((err: unknown) => {
          clearTimeout(timeoutId)
          const message = err instanceof Error ? err.message : String(err)
          emitter.emit({ type: 'agent-error', agent: 'data-ingest', message })
          emitter.emit({ type: 'done' })
          emitter.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
