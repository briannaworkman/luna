import type { OrchestratorEvent } from '@/lib/types/agent'

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<OrchestratorEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Flush the decoder and process any remaining buffer
        buffer += decoder.decode(undefined, { stream: false })
        if (buffer.trim()) {
          const segments = buffer.split('\n\n')
          for (const segment of segments) {
            if (!segment.trim()) continue
            const event = parseSegment(segment)
            if (event !== null) yield event
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const segments = buffer.split('\n\n')
      // Last item may be incomplete — keep it in buffer
      buffer = segments.pop() ?? ''

      for (const segment of segments) {
        if (!segment.trim()) continue
        const event = parseSegment(segment)
        if (event !== null) yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseSegment(segment: string): OrchestratorEvent | null {
  const lines = segment.split('\n')
  const dataLine = lines.find((l) => l.startsWith('data: '))
  if (!dataLine) return null

  const jsonStr = dataLine.slice('data: '.length)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[parseSseStream] Failed to parse SSE data line:', jsonStr)
    }
    return null
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'type' in parsed
  ) {
    return parsed as OrchestratorEvent
  }

  return null
}
