import type { CitationSource } from '@/lib/orchestrator/agents/parseInlineTags'

export const INSTRUMENT_LABELS: Record<CitationSource, string> = {
  'nasa-image': 'NASA',
  'jsc-sample': 'JSC',
  'lroc': 'LROC',
  'svs': 'SVS',
}

export const SOURCE_DESCRIPTIONS: Record<CitationSource, string> = {
  'nasa-image': 'NASA Image & Video Library asset',
  'jsc-sample': 'Apollo sample from the JSC Lunar Sample Database',
  'lroc': 'Lunar Reconnaissance Orbiter Camera product',
  'svs': 'NASA Scientific Visualization Studio dataset',
}
