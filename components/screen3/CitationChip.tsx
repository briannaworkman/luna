import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { resolveUrl } from '@/lib/citations/resolveUrl'
import { INSTRUMENT_LABELS, SOURCE_DESCRIPTIONS } from '@/lib/citations/labels'
import type { CitationSource } from '@/lib/orchestrator/agents/parseInlineTags'

interface CitationChipProps {
  source: CitationSource
  id: string
  className?: string
}

export function CitationChip({ source, id, className }: CitationChipProps) {
  const url = resolveUrl(source, id)
  const badge = (
    <Badge variant="default" className={className}>
      {INSTRUMENT_LABELS[source]} · {id}
    </Badge>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {url !== null ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-sm">
            {badge}
          </a>
        ) : (
          badge
        )}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-luna-fg">{SOURCE_DESCRIPTIONS[source]}</div>
        <div className="text-luna-fg-3 mt-0.5">ID: {id}</div>
      </TooltipContent>
    </Tooltip>
  )
}
