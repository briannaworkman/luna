import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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

const SOURCE_DESCRIPTIONS: Record<CitationChipProps['source'], string> = {
  'nasa-image': 'NASA Image & Video Library asset',
  'jsc-sample': 'Apollo sample from the JSC Lunar Sample Database',
  'lroc': 'Lunar Reconnaissance Orbiter Camera product',
  'svs': 'NASA Scientific Visualization Studio dataset',
}

export function CitationChip({ source, id, className }: CitationChipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="default" className={className}>
          {INSTRUMENT_LABELS[source]} · {id}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-luna-fg">{SOURCE_DESCRIPTIONS[source]}</div>
        <div className="text-luna-fg-3 mt-0.5">ID: {id}</div>
      </TooltipContent>
    </Tooltip>
  )
}
