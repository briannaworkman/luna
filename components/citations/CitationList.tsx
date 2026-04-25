import { ExternalLink } from 'lucide-react'
import { INSTRUMENT_LABELS, SOURCE_ICONS } from '@/lib/citations/labels'
import { citationKey } from '@/lib/citations/types'
import { cn } from '@/lib/utils'
import type { ResolvedCitation } from '@/lib/citations/types'

interface CitationListProps {
  citations: ResolvedCitation[]
}

const ROW_BASE = 'flex items-center justify-between px-4 h-12 border-b border-luna-hairline'

export function CitationList({ citations }: CitationListProps) {
  return (
    <>
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
    </>
  )
}
