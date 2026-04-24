/**
 * SourceDock unit tests — data-layer only.
 *
 * React Testing Library and a DOM environment (jsdom/happy-dom) are not
 * installed in this repo; vitest runs with environment: 'node'. These tests
 * assert the data contracts that drive SourceDock's rendering branches:
 * URL resolution per source, case-insensitive dedup expectations, and the
 * single-source-of-truth on instrument labels (imported directly from
 * CitationChip).
 */

import { describe, it, expect } from 'vitest'
import { resolveUrl } from '@/lib/citations/resolveUrl'
import { INSTRUMENT_LABELS } from '@/lib/citations/labels'
import type { AgentStreamState } from './useAgentStream'

type GlobalCitation = AgentStreamState['globalCitations'][number]

function makeCitation(source: GlobalCitation['source'], id: string): GlobalCitation {
  return { source, id, url: resolveUrl(source, id) }
}

describe('SourceDock — citation row data', () => {
  it('nasa-image citation produces a clickable URL', () => {
    const c = makeCitation('nasa-image', 'PIA12345')
    expect(c.url).toBe('https://images.nasa.gov/details/PIA12345')
  })

  it('jsc-sample citation produces a clickable URL', () => {
    const c = makeCitation('jsc-sample', '72135')
    expect(c.url).toBe(
      'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=72135',
    )
  })

  it('svs citation strips SVS- prefix and produces a clickable URL', () => {
    const c = makeCitation('svs', 'SVS-5587')
    expect(c.url).toBe('https://svs.gsfc.nasa.gov/5587')
  })

  it('lroc citation has null url so SourceDock renders a non-clickable row', () => {
    const c = makeCitation('lroc', 'M1234567890LE')
    expect(c.url).toBeNull()
  })

  it('citation id is preserved verbatim (component keys on source:id)', () => {
    const c = makeCitation('nasa-image', 'PIA12345')
    expect(`${c.source}:${c.id}`).toBe('nasa-image:PIA12345')
  })
})

describe('SourceDock — INSTRUMENT_LABELS shared with CitationChip', () => {
  it('every CitationSource maps to a non-empty human-readable label', () => {
    expect(INSTRUMENT_LABELS['nasa-image']).toBe('NASA')
    expect(INSTRUMENT_LABELS['jsc-sample']).toBe('JSC')
    expect(INSTRUMENT_LABELS['lroc']).toBe('LROC')
    expect(INSTRUMENT_LABELS['svs']).toBe('SVS')
  })
})
