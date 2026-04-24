export type CitationSource = 'nasa-image' | 'jsc-sample' | 'lroc' | 'svs'

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'citation'; source: CitationSource; id: string }
  | { kind: 'confidence'; level: 'high' | 'medium' | 'low' }

const VALID_SOURCES = new Set<string>(['nasa-image', 'jsc-sample', 'lroc', 'svs'])

// Combined regex: matches well-formed CITE with optional source prefix,
// well-formed CONFIDENCE, and malformed variants of each (to strip them).
// Group 1: optional source prefix (nasa-image|jsc-sample|lroc|svs)
// Group 2: id after the source colon (explicit-source variant)
// Group 3: bare id (no source prefix variant)
// Group 4: confidence level (High|Medium|Low)
const TAG_RE =
  /\[CITE:\s*(?:(nasa-image|jsc-sample|lroc|svs):([^\]]*))|\[CITE:\s*([^\]]*)\]|\[CONFIDENCE:\s*(High|Medium|Low)\]|\[CONFIDENCE:\s*[^\]]*\]/gi

export function parseInlineTags(
  rawChunk: string,
  prevCarry: string,
  opts: { citationSource: CitationSource },
): { segments: Segment[]; carry: string } {
  // We need to handle the TAG_RE carefully because the alternation for
  // explicit-source has a missing closing bracket intentionally — we must
  // detect and close it ourselves. Rebuild a self-contained approach below.

  // Simpler and clearer: use a single combined regex with full brackets.
  const FULL_RE =
    /\[CITE:\s*(?:(nasa-image|jsc-sample|lroc|svs):([^\]]*))\]|\[CITE:\s*([^\]]*)\]|\[CONFIDENCE:\s*(High|Medium|Low)\]|\[CONFIDENCE:\s*[^\]]*\]/gi

  const working = prevCarry + rawChunk
  const segments: Segment[] = []

  let lastIndex = 0
  let match: RegExpExecArray | null

  FULL_RE.lastIndex = 0
  while ((match = FULL_RE.exec(working)) !== null) {
    const matchStart = match.index
    const matchEnd = matchStart + match[0].length

    // Push any text before this match
    if (matchStart > lastIndex) {
      segments.push({ kind: 'text', text: working.slice(lastIndex, matchStart) })
    }

    const explicitSource = match[1] // e.g. 'nasa-image'
    const explicitId = match[2]     // id when source prefix present
    const bareId = match[3]         // id when no source prefix
    const confidenceLevel = match[4] // 'High' | 'Medium' | 'Low'

    if (confidenceLevel !== undefined) {
      // [CONFIDENCE: High/Medium/Low]
      segments.push({ kind: 'confidence', level: confidenceLevel.toLowerCase() as 'high' | 'medium' | 'low' })
    } else if (explicitSource !== undefined) {
      // [CITE:source:id] — explicit source, already constrained to valid set by regex
      const id = (explicitId ?? '').trim()
      if (id.length > 0) {
        segments.push({ kind: 'citation', source: explicitSource as CitationSource, id })
      }
      // empty id → strip silently
    } else if (bareId !== undefined) {
      // [CITE: id] — legacy bare form OR unknown-source form
      const raw = bareId.trim()
      if (raw.length === 0) {
        // empty id → strip silently
      } else if (raw.includes(':')) {
        // Colon in bare form means unrecognized source prefix — strip silently
        const colonIdx = raw.indexOf(':')
        const possibleSource = raw.slice(0, colonIdx)
        if (VALID_SOURCES.has(possibleSource)) {
          // e.g. [CITE: lroc:NAC] — shouldn't happen (explicit branch handles it),
          // but handle defensively: use explicit source from the bare id
          const id = raw.slice(colonIdx + 1).trim()
          if (id.length > 0) {
            segments.push({ kind: 'citation', source: possibleSource as CitationSource, id })
          }
        }
        // otherwise unknown source → stripped silently
      } else {
        // Legacy bare [CITE: id] — fall back to opts.citationSource
        segments.push({ kind: 'citation', source: opts.citationSource, id: raw })
      }
    }
    // All other matches (malformed [CONFIDENCE: Unknown]) — stripped silently

    lastIndex = matchEnd
  }

  // Text after the last match (before carry detection)
  const tail = working.slice(lastIndex)

  // Carry detection: find the last unmatched '[' in the tail (not followed by ']')
  const lastOpen = tail.lastIndexOf('[')
  let carry = ''
  let textRemainder = tail

  if (lastOpen !== -1 && !tail.includes(']', lastOpen)) {
    carry = tail.slice(lastOpen)
    textRemainder = tail.slice(0, lastOpen)
  }

  if (textRemainder.length > 0) {
    segments.push({ kind: 'text', text: textRemainder })
  }

  return { segments, carry }
}
