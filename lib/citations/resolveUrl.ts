import type { CitationSource } from '@/lib/orchestrator/agents/parseInlineTags'

/**
 * Resolves a (source, id) pair to a NASA URL.
 * Returns null for unresolvable sources (lroc) or malformed inputs.
 * Pure function — no side effects, no async.
 */
export function resolveUrl(source: CitationSource, id: string): string | null {
  const trimmed = id.trim()
  if (trimmed.length === 0) return null

  switch (source) {
    case 'nasa-image':
      return `https://images.nasa.gov/details/${trimmed}`

    case 'jsc-sample':
      return `https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=${trimmed}`

    case 'svs': {
      const numeric = trimmed.replace(/^SVS-/i, '')
      if (!/^\d+$/.test(numeric)) return null
      return `https://svs.gsfc.nasa.gov/${numeric}`
    }

    case 'lroc':
      return null

    default:
      return null
  }
}
