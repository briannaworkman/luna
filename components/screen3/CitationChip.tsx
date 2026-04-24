import { Badge } from '@/components/badge'

interface CitationChipProps {
  source: 'nasa-image' | 'jsc-sample' | 'lroc' | 'svs'
  id: string
  className?: string
}

const INSTRUMENT_LABELS: Record<CitationChipProps['source'], string> = {
  'nasa-image': 'NASA',
  'jsc-sample': 'JSC',
  'lroc': 'LROC',
  'svs': 'SVS',
}

export function CitationChip({ source, id, className }: CitationChipProps) {
  return (
    <Badge variant="default" className={className}>
      {INSTRUMENT_LABELS[source]} · {id}
    </Badge>
  )
}
