import { describe, it, expect } from 'vitest'
import { parseInlineTags } from './parseInlineTags'
import type { CitationSource } from './parseInlineTags'

const defaultOpts = { citationSource: 'jsc-sample' as CitationSource }

describe('parseInlineTags', () => {
  it('tag-free chunk — unchanged text, empty arrays', () => {
    const { parsed, carry } = parseInlineTags('plain text here', '', defaultOpts)
    expect(parsed.text).toBe('plain text here')
    expect(parsed.citations).toHaveLength(0)
    expect(parsed.confidences).toHaveLength(0)
    expect(carry).toBe('')
  })

  it('single [CITE: 72135] — 1 citation, text stripped', () => {
    const { parsed, carry } = parseInlineTags('The sample [CITE: 72135] is basaltic.', '', defaultOpts)
    expect(parsed.citations).toHaveLength(1)
    expect(parsed.citations[0]).toEqual({ source: 'jsc-sample', id: '72135' })
    expect(parsed.text).not.toContain('[CITE:')
    expect(parsed.text).toContain('is basaltic')
    expect(carry).toBe('')
  })

  it('single [CONFIDENCE: High] — 1 confidence high, text stripped', () => {
    const { parsed, carry } = parseInlineTags('Strong evidence. [CONFIDENCE: High]', '', defaultOpts)
    expect(parsed.confidences).toHaveLength(1)
    expect(parsed.confidences[0]).toEqual({ level: 'high' })
    expect(parsed.text).not.toContain('[CONFIDENCE:')
    expect(carry).toBe('')
  })

  it('multiple tags in one chunk — all extracted, clean text', () => {
    const chunk = 'Anorthositic composition [CITE: 15415] [CONFIDENCE: High] and volcanic glass [CITE: 70017] [CONFIDENCE: Medium].'
    const { parsed, carry } = parseInlineTags(chunk, '', defaultOpts)
    expect(parsed.citations).toHaveLength(2)
    expect(parsed.citations[0]).toEqual({ source: 'jsc-sample', id: '15415' })
    expect(parsed.citations[1]).toEqual({ source: 'jsc-sample', id: '70017' })
    expect(parsed.confidences).toHaveLength(2)
    expect(parsed.confidences[0]).toEqual({ level: 'high' })
    expect(parsed.confidences[1]).toEqual({ level: 'medium' })
    expect(parsed.text).not.toContain('[CITE:')
    expect(parsed.text).not.toContain('[CONFIDENCE:')
    expect(carry).toBe('')
  })

  it('tag split across two calls via carry — citation emitted after 2nd call', () => {
    const chunk1 = 'Some claim [CIT'
    const chunk2 = 'E: 12065] here.'
    const { parsed: p1, carry: c1 } = parseInlineTags(chunk1, '', defaultOpts)
    // First call: the '[' is unterminated so it becomes carry
    expect(p1.citations).toHaveLength(0)
    expect(c1).toBe('[CIT')

    const { parsed: p2, carry: c2 } = parseInlineTags(chunk2, c1, defaultOpts)
    expect(p2.citations).toHaveLength(1)
    expect(p2.citations[0]).toEqual({ source: 'jsc-sample', id: '12065' })
    expect(p2.text).toContain('here.')
    expect(c2).toBe('')
  })

  it('malformed [CITE: ] (empty id) — stripped, no citation event', () => {
    const { parsed, carry } = parseInlineTags('text [CITE: ] more text', '', defaultOpts)
    expect(parsed.citations).toHaveLength(0)
    expect(parsed.text).not.toContain('[CITE:')
    expect(carry).toBe('')
  })

  it('malformed [CONFIDENCE: Unknown] — stripped from text, no confidence event', () => {
    const { parsed, carry } = parseInlineTags('text [CONFIDENCE: Unknown] more', '', defaultOpts)
    expect(parsed.confidences).toHaveLength(0)
    expect(parsed.text).not.toContain('[CONFIDENCE:')
    expect(parsed.text).toBe('text  more')
    expect(carry).toBe('')
  })

  it('citation source respected from opts.citationSource — jsc-sample', () => {
    const { parsed } = parseInlineTags('[CITE: ABC123]', '', { citationSource: 'jsc-sample' })
    expect(parsed.citations[0]?.source).toBe('jsc-sample')
  })

  it('citation source respected from opts.citationSource — lroc', () => {
    const { parsed } = parseInlineTags('[CITE: NAC_007]', '', { citationSource: 'lroc' })
    expect(parsed.citations[0]?.source).toBe('lroc')
  })

  // --- Dual-mode CITE parser (new cases) ---

  it('[CITE:nasa-image:PIA00001] — explicit source nasa-image, id PIA00001', () => {
    const { parsed } = parseInlineTags('Image record. [CITE:nasa-image:PIA00001]', '', defaultOpts)
    expect(parsed.citations).toHaveLength(1)
    expect(parsed.citations[0]).toEqual({ source: 'nasa-image', id: 'PIA00001' })
    expect(parsed.text).not.toContain('[CITE:')
  })

  it('[CITE:jsc-sample:72135] — explicit source jsc-sample, id 72135', () => {
    const { parsed } = parseInlineTags('Sample data. [CITE:jsc-sample:72135]', '', defaultOpts)
    expect(parsed.citations).toHaveLength(1)
    expect(parsed.citations[0]).toEqual({ source: 'jsc-sample', id: '72135' })
    expect(parsed.text).not.toContain('[CITE:')
  })

  it('[CITE:lroc:NAC_XYZ] and [CITE:svs:SVS42] — explicit lroc and svs sources', () => {
    const chunk = 'Orbital image [CITE:lroc:NAC_XYZ] and illumination [CITE:svs:SVS42].'
    const { parsed } = parseInlineTags(chunk, '', defaultOpts)
    expect(parsed.citations).toHaveLength(2)
    expect(parsed.citations[0]).toEqual({ source: 'lroc', id: 'NAC_XYZ' })
    expect(parsed.citations[1]).toEqual({ source: 'svs', id: 'SVS42' })
  })

  it('[CITE:unknown-source:foo] — stripped silently, zero citation events', () => {
    const { parsed } = parseInlineTags('Bad tag [CITE:unknown-source:foo] here.', '', defaultOpts)
    expect(parsed.citations).toHaveLength(0)
    expect(parsed.text).not.toContain('[CITE:')
  })

  it('mixed explicit and legacy tags in one chunk — both resolved correctly', () => {
    const chunk = 'History [CITE:nasa-image:PIA99] and sample [CITE: 70017] together.'
    const { parsed } = parseInlineTags(chunk, '', defaultOpts)
    expect(parsed.citations).toHaveLength(2)
    expect(parsed.citations[0]).toEqual({ source: 'nasa-image', id: 'PIA99' })
    expect(parsed.citations[1]).toEqual({ source: 'jsc-sample', id: '70017' })
  })

  it('explicit-source tag split across two chunks via carry — resolved correctly', () => {
    const chunk1 = 'Claim here [CITE:nasa-image:PI'
    const chunk2 = 'A00001] more text.'
    const { parsed: p1, carry: c1 } = parseInlineTags(chunk1, '', defaultOpts)
    expect(p1.citations).toHaveLength(0)
    expect(c1).toBe('[CITE:nasa-image:PI')

    const { parsed: p2, carry: c2 } = parseInlineTags(chunk2, c1, defaultOpts)
    expect(p2.citations).toHaveLength(1)
    expect(p2.citations[0]).toEqual({ source: 'nasa-image', id: 'PIA00001' })
    expect(p2.text).toContain('more text.')
    expect(c2).toBe('')
  })

  it('backward-compat single-colon [CITE: id] still uses opts.citationSource', () => {
    const { parsed } = parseInlineTags('[CITE: LEGACY_ID]', '', { citationSource: 'svs' })
    expect(parsed.citations).toHaveLength(1)
    expect(parsed.citations[0]).toEqual({ source: 'svs', id: 'LEGACY_ID' })
  })

  it('explicit-source tag with spaces around id — id trimmed correctly', () => {
    const { parsed } = parseInlineTags('[CITE:nasa-image: PIA12345 ]', '', defaultOpts)
    // The regex captures the part after the source colon; trim is applied
    expect(parsed.citations).toHaveLength(1)
    expect(parsed.citations[0]).toEqual({ source: 'nasa-image', id: 'PIA12345' })
  })
})
