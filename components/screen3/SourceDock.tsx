import { ExternalLink } from 'lucide-react'
import { INSTRUMENT_LABELS, SOURCE_ICONS } from '@/lib/citations/labels'
import { citationKey } from '@/lib/citations/types'
import { cn } from '@/lib/utils'
import type { AgentStreamState } from '@/components/screen3/useAgentStream'

interface SourceDockProps {
  citations: AgentStreamState['globalCitations']
  activatedAgentCount: number
}

const ROW_BASE =
  'animate-dock-row-in flex items-center justify-between px-4 h-12 border-b border-luna-hairline'

export function SourceDock({ citations, activatedAgentCount }: SourceDockProps) {
  return (
    <aside className="w-[260px] shrink-0 flex flex-col h-full border-l border-luna-hairline bg-luna-base">
      <div className="px-4 pt-4 pb-2">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
          Sources
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {citations.map((c) => {
          const key = citationKey(c)
          const SourceIcon = SOURCE_ICONS[c.source]
          const inner = (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <SourceIcon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    c.url !== null
                      ? 'text-luna-cyan-dim group-hover:text-luna-cyan transition-colors duration-[120ms] ease-out'
                      : 'text-luna-fg-4',
                  )}
                  aria-hidden="true"
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-luna-cyan truncate">
                    {INSTRUMENT_LABELS[c.source]}
                  </span>
                  <span className="font-mono text-[11px] text-luna-fg-3 truncate">
                    {c.id}
                  </span>
                </div>
              </div>
              <ExternalLink
                className={cn(
                  'w-3 h-3 shrink-0',
                  c.url !== null
                    ? 'text-luna-fg-3 group-hover:text-luna-cyan transition-colors duration-[120ms] ease-out'
                    : 'text-luna-fg-4',
                )}
              />
            </>
          )

          if (c.url !== null) {
            return (
              <a
                key={key}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  ROW_BASE,
                  'cursor-pointer select-none hover:bg-luna-base-2 group transition-colors duration-[120ms] ease-out',
                )}
              >
                {inner}
              </a>
            )
          }

          return (
            <div key={key} className={cn(ROW_BASE, 'cursor-default')}>
              {inner}
            </div>
          )
        })}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-luna-hairline">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-luna-fg-3">
          {citations.length} SOURCES · {activatedAgentCount} AGENTS
        </span>
      </div>
    </aside>
  )
}
