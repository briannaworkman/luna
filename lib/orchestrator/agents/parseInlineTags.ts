export type CitationSource = 'nasa-image' | 'jsc-sample' | 'lroc' | 'svs'

export interface ParsedChunk {
  text: string
  citations: Array<{ source: CitationSource; id: string }>
  confidences: Array<{ level: 'high' | 'medium' | 'low' }>
}

export function parseInlineTags(
  rawChunk: string,
  prevCarry: string,
  opts: { citationSource: CitationSource },
): { parsed: ParsedChunk; carry: string } {
  const working = prevCarry + rawChunk

  const citations: Array<{ source: CitationSource; id: string }> = []
  const confidences: Array<{ level: 'high' | 'medium' | 'low' }> = []

  const citeRegex = /\[CITE:\s*([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = citeRegex.exec(working)) !== null) {
    const raw = match[1]
    if (raw !== undefined) {
      const id = raw.trim()
      if (id.length > 0) {
        citations.push({ source: opts.citationSource, id })
      }
    }
  }

  const confidenceRegex = /\[CONFIDENCE:\s*(High|Medium|Low)\]/gi
  while ((match = confidenceRegex.exec(working)) !== null) {
    const raw = match[1]
    if (raw !== undefined) {
      const level = raw.toLowerCase() as 'high' | 'medium' | 'low'
      confidences.push({ level })
    }
  }

  // Strip all tag-shaped brackets regardless of payload validity — a
  // model that emits [CONFIDENCE: Unknown] shouldn't leak raw tag text
  // into the UI stream.
  let cleanText = working
    .replace(/\[CITE:\s*[^\]]*\]/g, '')
    .replace(/\[CONFIDENCE:\s*[^\]]*\]/gi, '')

  // Carry detection: find the last '[' with no closing ']' after it
  const lastOpen = cleanText.lastIndexOf('[')
  let carry = ''
  if (lastOpen !== -1 && !cleanText.includes(']', lastOpen)) {
    carry = cleanText.slice(lastOpen)
    cleanText = cleanText.slice(0, lastOpen)
  }

  return {
    parsed: { text: cleanText, citations, confidences },
    carry,
  }
}
