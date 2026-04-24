import { describe, it, expect } from 'vitest'
import { parseInlineTags } from './parseInlineTags'
import type { CitationSource } from './parseInlineTags'

const defaultOpts = { citationSource: 'jsc-sample' as CitationSource }

describe('parseInlineTags', () => {
  it('tag-free chunk — single text segment, empty carry', () => {
    const { segments, carry } = parseInlineTags('plain text here', '', defaultOpts)
    expect(segments).toEqual([{ kind: 'text', text: 'plain text here' }])
    expect(carry).toBe('')
  })

  it('single [CITE: 72135] — text segment + citation segment, tag stripped from text', () => {
    const { segments, carry } = parseInlineTags('The sample [CITE: 72135] is basaltic.', '', defaultOpts)
    expect(segments).toEqual([
      { kind: 'text', text: 'The sample ' },
      { kind: 'citation', source: 'jsc-sample', id: '72135' },
      { kind: 'text', text: ' is basaltic.' },
    ])
    expect(carry).toBe('')
  })

  it('single [CONFIDENCE: High] — text segment + confidence segment, tag stripped from text', () => {
    const { segments, carry } = parseInlineTags('Strong evidence. [CONFIDENCE: High]', '', defaultOpts)
    expect(segments).toEqual([
      { kind: 'text', text: 'Strong evidence. ' },
      { kind: 'confidence', level: 'high' },
    ])
    expect(carry).toBe('')
  })

  it('multiple tags in one chunk — all segments extracted in order', () => {
    const chunk =
      'Anorthositic composition [CITE: 15415] [CONFIDENCE: High] and volcanic glass [CITE: 70017] [CONFIDENCE: Medium].'
    const { segments, carry } = parseInlineTags(chunk, '', defaultOpts)
    expect(segments).toEqual([
      { kind: 'text', text: 'Anorthositic composition ' },
      { kind: 'citation', source: 'jsc-sample', id: '15415' },
      { kind: 'text', text: ' ' },
      { kind: 'confidence', level: 'high' },
      { kind: 'text', text: ' and volcanic glass ' },
      { kind: 'citation', source: 'jsc-sample', id: '70017' },
      { kind: 'text', text: ' ' },
      { kind: 'confidence', level: 'medium' },
      { kind: 'text', text: '.' },
    ])
    expect(carry).toBe('')
  })

  it('tag split across two calls via carry — citation emitted after 2nd call', () => {
    const chunk1 = 'Some claim [CIT'
    const chunk2 = 'E: 12065] here.'
    const { segments: s1, carry: c1 } = parseInlineTags(chunk1, '', defaultOpts)
    // First call: the '[' is unterminated so it becomes carry
    expect(s1).toEqual([{ kind: 'text', text: 'Some claim ' }])
    expect(c1).toBe('[CIT')

    const { segments: s2, carry: c2 } = parseInlineTags(chunk2, c1, defaultOpts)
    expect(s2).toContainEqual({ kind: 'citation', source: 'jsc-sample', id: '12065' })
    const textSegs = s2.filter((s) => s.kind === 'text').map((s) => (s.kind === 'text' ? s.text : ''))
    expect(textSegs.join('')).toContain('here.')
    expect(c2).toBe('')
  })

  it('malformed [CITE: ] (empty id) — stripped silently, no citation segment', () => {
    const { segments, carry } = parseInlineTags('text [CITE: ] more text', '', defaultOpts)
    expect(segments.every((s) => s.kind !== 'citation')).toBe(true)
    const textContent = segments
      .filter((s) => s.kind === 'text')
      .map((s) => (s.kind === 'text' ? s.text : ''))
      .join('')
    expect(textContent).not.toContain('[CITE:')
    expect(carry).toBe('')
  })

  it('malformed [CONFIDENCE: Unknown] — stripped from text, no confidence segment', () => {
    const { segments, carry } = parseInlineTags('text [CONFIDENCE: Unknown] more', '', defaultOpts)
    expect(segments.every((s) => s.kind !== 'confidence')).toBe(true)
    const textContent = segments
      .filter((s) => s.kind === 'text')
      .map((s) => (s.kind === 'text' ? s.text : ''))
      .join('')
    expect(textContent).toBe('text  more')
    expect(carry).toBe('')
  })

  it('citation source respected from opts.citationSource — jsc-sample', () => {
    const { segments } = parseInlineTags('[CITE: ABC123]', '', { citationSource: 'jsc-sample' })
    const cit = segments.find((s) => s.kind === 'citation')
    expect(cit?.kind === 'citation' && cit.source).toBe('jsc-sample')
  })

  it('citation source respected from opts.citationSource — lroc', () => {
    const { segments } = parseInlineTags('[CITE: NAC_007]', '', { citationSource: 'lroc' })
    const cit = segments.find((s) => s.kind === 'citation')
    expect(cit?.kind === 'citation' && cit.source).toBe('lroc')
  })

  // --- Dual-mode CITE parser ---

  it('[CITE:nasa-image:PIA00001] — explicit source nasa-image, id PIA00001', () => {
    const { segments } = parseInlineTags('Image record. [CITE:nasa-image:PIA00001]', '', defaultOpts)
    const cit = segments.find((s) => s.kind === 'citation')
    expect(cit).toEqual({ kind: 'citation', source: 'nasa-image', id: 'PIA00001' })
    const textContent = segments
      .filter((s) => s.kind === 'text')
      .map((s) => (s.kind === 'text' ? s.text : ''))
      .join('')
    expect(textContent).not.toContain('[CITE:')
  })

  it('[CITE:jsc-sample:72135] — explicit source jsc-sample, id 72135', () => {
    const { segments } = parseInlineTags('Sample data. [CITE:jsc-sample:72135]', '', defaultOpts)
    const cit = segments.find((s) => s.kind === 'citation')
    expect(cit).toEqual({ kind: 'citation', source: 'jsc-sample', id: '72135' })
    const textContent = segments
      .filter((s) => s.kind === 'text')
      .map((s) => (s.kind === 'text' ? s.text : ''))
      .join('')
    expect(textContent).not.toContain('[CITE:')
  })

  it('[CITE:lroc:NAC_XYZ] and [CITE:svs:SVS42] — explicit lroc and svs sources', () => {
    const chunk = 'Orbital image [CITE:lroc:NAC_XYZ] and illumination [CITE:svs:SVS42].'
    const { segments } = parseInlineTags(chunk, '', defaultOpts)
    const citations = segments.filter((s) => s.kind === 'citation')
    expect(citations).toEqual([
      { kind: 'citation', source: 'lroc', id: 'NAC_XYZ' },
      { kind: 'citation', source: 'svs', id: 'SVS42' },
    ])
  })

  it('[CITE:unknown-source:foo] — stripped silently, zero citation segments', () => {
    const { segments } = parseInlineTags('Bad tag [CITE:unknown-source:foo] here.', '', defaultOpts)
    expect(segments.every((s) => s.kind !== 'citation')).toBe(true)
    const textContent = segments
      .filter((s) => s.kind === 'text')
      .map((s) => (s.kind === 'text' ? s.text : ''))
      .join('')
    expect(textContent).not.toContain('[CITE:')
  })

  it('mixed explicit and legacy tags in one chunk — both resolved correctly', () => {
    const chunk = 'History [CITE:nasa-image:PIA99] and sample [CITE: 70017] together.'
    const { segments } = parseInlineTags(chunk, '', defaultOpts)
    const citations = segments.filter((s) => s.kind === 'citation')
    expect(citations).toEqual([
      { kind: 'citation', source: 'nasa-image', id: 'PIA99' },
      { kind: 'citation', source: 'jsc-sample', id: '70017' },
    ])
  })

  it('explicit-source tag split across two chunks via carry — resolved correctly', () => {
    const chunk1 = 'Claim here [CITE:nasa-image:PI'
    const chunk2 = 'A00001] more text.'
    const { segments: s1, carry: c1 } = parseInlineTags(chunk1, '', defaultOpts)
    expect(s1.every((s) => s.kind !== 'citation')).toBe(true)
    expect(c1).toBe('[CITE:nasa-image:PI')

    const { segments: s2, carry: c2 } = parseInlineTags(chunk2, c1, defaultOpts)
    const cit = s2.find((s) => s.kind === 'citation')
    expect(cit).toEqual({ kind: 'citation', source: 'nasa-image', id: 'PIA00001' })
    const textContent = s2
      .filter((s) => s.kind === 'text')
      .map((s) => (s.kind === 'text' ? s.text : ''))
      .join('')
    expect(textContent).toContain('more text.')
    expect(c2).toBe('')
  })

  it('backward-compat single-colon [CITE: id] still uses opts.citationSource', () => {
    const { segments } = parseInlineTags('[CITE: LEGACY_ID]', '', { citationSource: 'svs' })
    const cit = segments.find((s) => s.kind === 'citation')
    expect(cit).toEqual({ kind: 'citation', source: 'svs', id: 'LEGACY_ID' })
  })

  it('explicit-source tag with spaces around id — id trimmed correctly', () => {
    const { segments } = parseInlineTags('[CITE:nasa-image: PIA12345 ]', '', defaultOpts)
    const cit = segments.find((s) => s.kind === 'citation')
    expect(cit).toEqual({ kind: 'citation', source: 'nasa-image', id: 'PIA12345' })
  })

  it('preserves order: text → citation → text → confidence → text', () => {
    const input = 'Before [CITE: ABC] middle [CONFIDENCE: High] after'
    const { segments } = parseInlineTags(input, '', { citationSource: 'jsc-sample' })
    expect(segments).toEqual([
      { kind: 'text', text: 'Before ' },
      { kind: 'citation', source: 'jsc-sample', id: 'ABC' },
      { kind: 'text', text: ' middle ' },
      { kind: 'confidence', level: 'high' },
      { kind: 'text', text: ' after' },
    ])
  })
})
