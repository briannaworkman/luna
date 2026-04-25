import type { BriefStreamEvent } from '@/lib/types/brief'

/**
 * Typed SSE stream parser for BriefStreamEvent.
 * A typed copy of parseSseStream — NOT a generic refactor of the original.
 */
export async function* parseBriefStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<BriefStreamEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        break
      }
      const { done, value } = await reader.read()

      if (done) {
        buffer += decoder.decode(undefined, { stream: false })
        if (buffer.trim()) {
          for (const segment of buffer.split(/\r?\n\r?\n/)) {
            if (!segment.trim()) continue
            const event = parseSegment(segment)
            if (event !== null) yield event
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Split on either LF-LF or CRLF-CRLF so this works behind proxies that
      // normalize line endings.
      const segments = buffer.split(/\r?\n\r?\n/)
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

function parseSegment(segment: string): BriefStreamEvent | null {
  const lines = segment.split('\n')
  const dataLine = lines.find((l) => l.startsWith('data: '))
  if (!dataLine) return null

  const jsonStr = dataLine.slice('data: '.length)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[parseBriefStream] Failed to parse SSE data line:', jsonStr)
    }
    return null
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'type' in parsed
  ) {
    return parsed as BriefStreamEvent
  }

  return null
}
