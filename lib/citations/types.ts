import type { CitationSource } from '@/lib/orchestrator/agents/parseInlineTags'

export interface Citation {
  source: CitationSource
  id: string
}

export interface ResolvedCitation extends Citation {
  url: string | null
}

export function citationKey(c: Citation): string {
  return `${c.source}:${c.id.toLowerCase()}`
}
