export function serializeEvent<T>(event: T): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export class SseEmitter<T = unknown> {
  private controller: ReadableStreamDefaultController<Uint8Array>
  private encoder = new TextEncoder()
  private _closed = false

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller
  }

  emit(event: T): void {
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
