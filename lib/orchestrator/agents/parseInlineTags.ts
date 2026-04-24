export type CitationSource = 'nasa-image' | 'jsc-sample' | 'lroc' | 'svs'

export interface ParsedChunk {
  text: string
  citations: Array<{ source: CitationSource; id: string }>
  confidences: Array<{ level: 'high' | 'medium' | 'low' }>
}

const VALID_SOURCES: ReadonlySet<CitationSource> = new Set<CitationSource>(['nasa-image', 'jsc-sample', 'lroc', 'svs'])

export function parseInlineTags(
  rawChunk: string,
  prevCarry: string,
  opts: { citationSource: CitationSource },
): { parsed: ParsedChunk; carry: string } {
  const working = prevCarry + rawChunk

  const citations: Array<{ source: CitationSource; id: string }> = []
  const confidences: Array<{ level: 'high' | 'medium' | 'low' }> = []

  const CITE_RE = /\[CITE:\s*(?:(nasa-image|jsc-sample|lroc|svs):)?([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = CITE_RE.exec(working)) !== null) {
    const maybeSource = match[1]
    const rawId = match[2]?.trim() ?? ''
    if (rawId.length === 0) continue
    if (maybeSource !== undefined) {
      // Regex already constrained to valid sources, but defensive re-check:
      if (!VALID_SOURCES.has(maybeSource as CitationSource)) continue
      citations.push({ source: maybeSource as CitationSource, id: rawId })
    } else {
      // No explicit source prefix matched. Check if rawId looks like an
      // unknown source prefix (contains a colon), which means the input was
      // [CITE:unknown-source:foo] — strip silently, no citation event.
      if (maybeSource === undefined && rawId.includes(':')) {
        continue
      }
      citations.push({ source: opts.citationSource, id: rawId })
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

  // Carry detection: find the last '[' with no closing ']' after it.
  // Scan cleanText (post-strip) so already-stripped tags don't shadow a
  // genuinely dangling bracket further right in the buffer.
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
