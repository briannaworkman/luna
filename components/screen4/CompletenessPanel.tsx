import { cn } from '@/lib/utils'
import { COMPLETENESS_SOURCES, type CompletenessStatus } from '@/lib/types/brief'
import { COMPLETENESS_LANDING_URLS } from '@/lib/brief/completenessUrls'
import type { MissionBrief } from '@/lib/types/brief'

interface CompletenessPanelProps {
  dataCompleteness: MissionBrief['dataCompleteness']
}

const STATUS_DOT_CLASS: Record<CompletenessStatus, string> = {
  Confirmed:       'bg-luna-success',
  Partial:         'bg-luna-warning',
  'Analogue only': 'bg-luna-fg-3',
  Incomplete:      'bg-luna-danger',
}

const STATUS_LABEL_CLASS: Record<CompletenessStatus, string> = {
  Confirmed:       'text-luna-success',
  Partial:         'text-luna-warning',
  'Analogue only': 'text-luna-fg-3',
  Incomplete:      'text-luna-danger',
}

export function CompletenessPanel({ dataCompleteness }: CompletenessPanelProps) {
  return (
    <aside
      className="w-[260px] shrink-0 flex flex-col h-full border-l border-luna-hairline bg-luna-base"
      aria-label="Data completeness"
    >
      <div className="px-4 pt-4 pb-2">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
          Data completeness
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {COMPLETENESS_SOURCES.map((source) => {
          const status = (dataCompleteness[source] ?? 'Incomplete') as CompletenessStatus
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
                className={cn(
                  'rounded-full w-2 h-2 shrink-0',
                  STATUS_DOT_CLASS[status],
                )}
                aria-hidden="true"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-luna-fg-2 group-hover:text-luna-fg transition-colors truncate">
                  {source}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] tracking-[0.04em]',
                    STATUS_LABEL_CLASS[status],
                  )}
                >
                  {status}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </aside>
  )
}
