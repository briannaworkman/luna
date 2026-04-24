import { cn } from '@/lib/utils'

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
  const label = INSTRUMENT_LABELS[source]
  return (
    <span
      className={cn(
        'font-mono text-[11px] text-luna-fg-3 bg-luna-base-2 border border-luna-hairline rounded-sm px-1.5 py-0.5',
        className,
      )}
    >
      {label} · {id}
    </span>
  )
}
