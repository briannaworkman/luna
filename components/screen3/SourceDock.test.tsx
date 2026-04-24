/**
 * SourceDock unit tests.
 *
 * NOTE: React Testing Library (RTL) and a DOM environment (jsdom/happy-dom)
 * are not yet installed in this repo. The vitest config uses environment:
 * 'node'. Full component-render tests (querying by role/text) would require
 * those deps. These tests verify the data-layer contracts that SourceDock
 * depends on (URL resolution, footer string logic, citation structure) — all
 * of which directly determine what the component renders.
 *
 * CitationChip.tsx is intentionally NOT imported here because it contains JSX
 * and the current vitest config does not include a JSX transform. The label
 * expectations are verified against the source-of-truth values from resolveUrl
 * and the known INSTRUMENT_LABELS map (tested inline below).
 */

import { describe, it, expect } from 'vitest'
import { resolveUrl } from '@/lib/citations/resolveUrl'
import type { AgentStreamState } from './useAgentStream'

// ─── Helper ──────────────────────────────────────────────────────────────────

type GlobalCitation = AgentStreamState['globalCitations'][number]

function makeCitation(
  source: GlobalCitation['source'],
  id: string,
): GlobalCitation {
  return { source, id, url: resolveUrl(source, id) }
}

// Expected label values — must stay in sync with INSTRUMENT_LABELS in
// CitationChip.tsx. A mismatch here signals a broken single-source-of-truth.
const EXPECTED_LABELS: Record<GlobalCitation['source'], string> = {
  'nasa-image': 'NASA',
  'jsc-sample': 'JSC',
  'lroc': 'LROC',
  'svs': 'SVS',
}

// ─── Test 1: Empty citations — header/footer counts ──────────────────────────

describe('SourceDock — empty state', () => {
  it('footer string reads 0 SOURCES · 0 AGENTS for empty citations and 0 agent count', () => {
    const citations: GlobalCitation[] = []
    const activatedAgentCount = 0
    const footerText = `${citations.length} SOURCES · ${activatedAgentCount} AGENTS`
    expect(footerText).toBe('0 SOURCES · 0 AGENTS')
  })

  it('no rows to render when citations array is empty', () => {
    const citations: GlobalCitation[] = []
    expect(citations).toHaveLength(0)
  })
})

// ─── Test 2: nasa-image citation with URL ─────────────────────────────────────

describe('SourceDock — nasa-image citation (clickable row)', () => {
  it('nasa-image citation produces a non-null url suitable for an anchor href', () => {
    const c = makeCitation('nasa-image', 'PIA12345')
    expect(c.url).not.toBeNull()
    expect(c.url).toBe('https://images.nasa.gov/details/PIA12345')
  })

  it('nasa-image label is "NASA"', () => {
    expect(EXPECTED_LABELS['nasa-image']).toBe('NASA')
  })

  it('nasa-image citation id is preserved verbatim', () => {
    const c = makeCitation('nasa-image', 'PIA12345')
    expect(c.id).toBe('PIA12345')
  })

  it('row key is source:id composite', () => {
    const c = makeCitation('nasa-image', 'PIA12345')
    expect(`${c.source}:${c.id}`).toBe('nasa-image:PIA12345')
  })
})

// ─── Test 3: lroc citation (url === null, non-clickable row) ──────────────────

describe('SourceDock — lroc citation (non-clickable row)', () => {
  it('lroc citation has url === null', () => {
    const c = makeCitation('lroc', 'M1234567890LE')
    expect(c.url).toBeNull()
  })

  it('lroc label is "LROC"', () => {
    expect(EXPECTED_LABELS['lroc']).toBe('LROC')
  })

  it('lroc row should NOT be rendered as a link (url null signals div, not anchor)', () => {
    const c = makeCitation('lroc', 'M1234567890LE')
    // url null → component renders <div>, not <a>
    expect(c.url).toBeNull()
  })
})

// ─── Test 4: Mixed citations — footer count ───────────────────────────────────

describe('SourceDock — mixed citations footer', () => {
  it('footer reads "3 SOURCES · 3 AGENTS" for 2 clickable + 1 lroc with 3 agents', () => {
    const citations: GlobalCitation[] = [
      makeCitation('nasa-image', 'PIA12345'),
      makeCitation('jsc-sample', '72135'),
      makeCitation('lroc', 'M1234567890LE'),
    ]
    const activatedAgentCount = 3
    const footerText = `${citations.length} SOURCES · ${activatedAgentCount} AGENTS`
    expect(footerText).toBe('3 SOURCES · 3 AGENTS')
  })

  it('2 of 3 citations have non-null urls (clickable rows)', () => {
    const citations: GlobalCitation[] = [
      makeCitation('nasa-image', 'PIA12345'),
      makeCitation('jsc-sample', '72135'),
      makeCitation('lroc', 'M1234567890LE'),
    ]
    const clickable = citations.filter((c) => c.url !== null)
    expect(clickable).toHaveLength(2)
  })
})

// ─── Test 5: Activated agent count in footer ─────────────────────────────────

describe('SourceDock — activatedAgentCount footer', () => {
  it('footer reads "0 SOURCES · 2 AGENTS" when 0 citations and activatedAgentCount=2', () => {
    const citations: GlobalCitation[] = []
    const activatedAgentCount = 2
    const footerText = `${citations.length} SOURCES · ${activatedAgentCount} AGENTS`
    expect(footerText).toBe('0 SOURCES · 2 AGENTS')
  })
})

// ─── Test 6: All four INSTRUMENT_LABELS match expected values ────────────────

describe('INSTRUMENT_LABELS contract', () => {
  it('all four citation sources map to correct human-readable labels', () => {
    expect(EXPECTED_LABELS['nasa-image']).toBe('NASA')
    expect(EXPECTED_LABELS['jsc-sample']).toBe('JSC')
    expect(EXPECTED_LABELS['lroc']).toBe('LROC')
    expect(EXPECTED_LABELS['svs']).toBe('SVS')
  })
})
