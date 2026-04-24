import type { OrchestratorEvent } from '@/lib/types/agent'

export function serializeEvent(event: OrchestratorEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export class SseEmitter {
  private controller: ReadableStreamDefaultController<Uint8Array>
  private encoder = new TextEncoder()
  private _closed = false

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller
  }

  emit(event: OrchestratorEvent): void {
    if (this._closed) return
    this.controller.enqueue(this.encoder.encode(serializeEvent(event)))
  }

  close(): void {
    if (this._closed) return
    this._closed = true
    this.controller.close()
  }

  get closed(): boolean {
    return this._closed
  }
}

export function createSseResponse(
  handler: (emitter: SseEmitter) => Promise<void>,
  timeoutMs = 120_000,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emitter = new SseEmitter(controller)

      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          emitter.emit({
            type: 'agent-error',
            agent: 'data-ingest',
            message: `Request timed out after ${Math.round(timeoutMs / 1000)} seconds`,
          })
          emitter.emit({ type: 'done' })
          emitter.close()
          resolve()
        }, timeoutMs)
      })

      const handlerPromise = handler(emitter)
        .then(() => {
          clearTimeout(timeoutId)
          if (!emitter.closed) {
            emitter.close()
          }
        })
        .catch((err: unknown) => {
          clearTimeout(timeoutId)
          const message = err instanceof Error ? err.message : String(err)
          emitter.emit({ type: 'agent-error', agent: 'data-ingest', message })
          emitter.emit({ type: 'done' })
          emitter.close()
        })

      Promise.race([handlerPromise, timeoutPromise]).catch(() => {
        // errors already handled in .catch above
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
