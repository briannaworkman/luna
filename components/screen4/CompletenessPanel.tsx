import { cn } from '@/lib/utils'
import { COMPLETENESS_SOURCES, type CompletenessStatus } from '@/lib/types/brief'
import { COMPLETENESS_LANDING_URLS } from '@/lib/brief/completenessUrls'
import { CitationList } from '@/components/citations/CitationList'
import type { MissionBrief } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'

interface CompletenessPanelProps {
  dataCompleteness: MissionBrief['dataCompleteness']
  citations: ResolvedCitation[]
  inline?: boolean
}

const STATUS_STYLE: Record<CompletenessStatus, { dot: string; label: string }> = {
  Confirmed:       { dot: 'bg-luna-success', label: 'text-luna-success' },
  Partial:         { dot: 'bg-luna-warning', label: 'text-luna-warning' },
  'Analogue only': { dot: 'bg-luna-fg-3',    label: 'text-luna-fg-3'    },
  Incomplete:      { dot: 'bg-luna-danger',  label: 'text-luna-danger'  },
}

export function CompletenessPanel({ dataCompleteness, citations, inline = false }: CompletenessPanelProps) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-luna-base',
        inline
          ? 'w-full'
          : 'w-[260px] shrink-0 h-full border-l border-luna-hairline overflow-y-auto',
      )}
      aria-label="Data completeness and sources"
    >
      <div className="px-4 pt-4 pb-2">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
          Data completeness
        </span>
      </div>

      {COMPLETENESS_SOURCES.map((source) => {
        const status = (dataCompleteness[source] ?? 'Incomplete') as CompletenessStatus
        const style = STATUS_STYLE[status]
        const url = COMPLETENESS_LANDING_URLS[source]

        return (
          <a
            key={source}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 px-4 h-12 border-b border-luna-hairline',
              'hover:bg-luna-base-2 transition-colors duration-[120ms] ease-out group cursor-pointer',
            )}
            aria-label={`${source}: ${status} — open data source`}
          >
            <span
              className={cn('rounded-full w-2 h-2 shrink-0', style.dot)}
              aria-hidden="true"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-luna-fg-2 group-hover:text-luna-fg transition-colors truncate">
                {source}
              </span>
              <span className={cn('font-mono text-[10px] tracking-[0.04em]', style.label)}>
                {status}
              </span>
            </div>
          </a>
        )
      })}

      {citations.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-2">
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
              Sources
            </span>
          </div>
          <CitationList citations={citations} />
        </>
      )}
    </aside>
  )
}
