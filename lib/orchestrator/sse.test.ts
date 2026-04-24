import { describe, it, expect } from 'vitest'
import { serializeEvent, SseEmitter, createSseResponse } from './sse'

async function readAllChunks(response: Response): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  return result
}

describe('serializeEvent', () => {
  it('formats a done event correctly', () => {
    const result = serializeEvent({ type: 'done' })
    expect(result).toBe('data: {"type":"done"}\n\n')
  })

  it('formats an orchestrator-chunk event correctly', () => {
    const result = serializeEvent({ type: 'orchestrator-chunk', text: 'hello' })
    expect(result).toBe('data: {"type":"orchestrator-chunk","text":"hello"}\n\n')
  })

  it('formats an agent-chunk event correctly', () => {
    const result = serializeEvent({ type: 'agent-chunk', agent: 'mineralogy', text: 'some text' })
    expect(result).toBe('data: {"type":"agent-chunk","agent":"mineralogy","text":"some text"}\n\n')
  })
})

describe('SseEmitter', () => {
  it('emits an event through the controller', () => {
    const chunks: Uint8Array[] = []
    const mockController = {
      enqueue: (chunk: Uint8Array) => { chunks.push(chunk) },
      close: () => {},
    } as unknown as ReadableStreamDefaultController<Uint8Array>

    const emitter = new SseEmitter(mockController)
    emitter.emit({ type: 'done' })

    expect(chunks).toHaveLength(1)
    const decoded = new TextDecoder().decode(chunks[0])
    expect(decoded).toBe('data: {"type":"done"}\n\n')
  })

  it('is a no-op after close', () => {
    const chunks: Uint8Array[] = []
    const mockController = {
      enqueue: (chunk: Uint8Array) => { chunks.push(chunk) },
      close: () => {},
    } as unknown as ReadableStreamDefaultController<Uint8Array>

    const emitter = new SseEmitter(mockController)
    emitter.close()
    emitter.emit({ type: 'done' })

    expect(chunks).toHaveLength(0)
  })

  it('closed flag flips after close()', () => {
    const mockController = {
      enqueue: () => {},
      close: () => {},
    } as unknown as ReadableStreamDefaultController<Uint8Array>

    const emitter = new SseEmitter(mockController)
    expect(emitter.closed).toBe(false)
    emitter.close()
    expect(emitter.closed).toBe(true)
  })
})

describe('createSseResponse', () => {
  it('returns a Response with correct SSE headers', () => {
    const response = createSseResponse(async () => {}, 5000)
    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
    expect(response.headers.get('Connection')).toBe('keep-alive')
  })

  it('emits agent-error then done when timeout fires', async () => {
    const response = createSseResponse(
      () => new Promise(() => {}),
      50,
    )

    const text = await readAllChunks(response)
    expect(text).toContain('"type":"agent-error"')
    expect(text).toContain('Request timed out after 0 seconds')
    expect(text).toContain('"type":"done"')
  }, 500)

  it('emits agent-error then done when handler throws', async () => {
    const response = createSseResponse(async () => {
      throw new Error('handler failed')
    }, 5000)

    const text = await readAllChunks(response)
    expect(text).toContain('"type":"agent-error"')
    expect(text).toContain('handler failed')
    expect(text).toContain('"type":"done"')
  })
})
