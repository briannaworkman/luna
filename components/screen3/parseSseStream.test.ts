import { describe, it, expect } from 'vitest'
import { parseSseStream } from './parseSseStream'

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const encoded = chunks.map((c) => encoder.encode(c))
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of encoded) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
}

async function collectEvents(stream: ReadableStream<Uint8Array>) {
  const events = []
  for await (const event of parseSseStream(stream)) {
    events.push(event)
  }
  return events
}

describe('parseSseStream', () => {
  it('single complete event yields one event', async () => {
    const stream = makeStream([
      'data: {"type":"done"}\n\n',
    ])
    const events = await collectEvents(stream)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'done' })
  })

  it('two events in one read yields two events in order', async () => {
    const stream = makeStream([
      'data: {"type":"done"}\n\ndata: {"type":"agent-complete","agent":"imagery"}\n\n',
    ])
    const events = await collectEvents(stream)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'done' })
    expect(events[1]).toEqual({ type: 'agent-complete', agent: 'imagery' })
  })

  it('event split across two reads yields one event after second read', async () => {
    const stream = makeStream([
      'data: {"type":"don',
      'e"}\n\n',
    ])
    const events = await collectEvents(stream)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ type: 'done' })
  })

  it('malformed JSON yields zero events', async () => {
    const stream = makeStream([
      'data: not-json\n\n',
    ])
    const events = await collectEvents(stream)
    expect(events).toHaveLength(0)
  })

  it('non-data line yields zero events', async () => {
    const stream = makeStream([
      'event: ping\n\n',
    ])
    const events = await collectEvents(stream)
    expect(events).toHaveLength(0)
  })
})
