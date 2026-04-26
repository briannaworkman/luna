import { ConfidenceBadge, type ConfidenceLevel } from '@/components/ui/confidence-badge'
import { Badge } from '@/components/badge'
import { INSTRUMENT_LABELS } from '@/lib/citations/labels'
import type { Finding } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'
import type { CitationSource } from '@/lib/orchestrator/agents/parseInlineTags'

interface FindingItemProps {
  finding: Finding
  citationLookup: Map<string, ResolvedCitation>
  agentName?: string
}

export function FindingItem({ finding, citationLookup, agentName }: FindingItemProps) {
  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-luna-hairline last:border-b-0">
      <div className="flex items-start gap-2">
        <ConfidenceBadge
          level={finding.confidence.toLowerCase() as ConfidenceLevel}
          className="mt-[2px] shrink-0 whitespace-nowrap inline-flex uppercase"
        />
        <p className="font-sans text-[13px] leading-[1.65] text-luna-fg flex-1 m-0">
          {finding.claim}
        </p>
      </div>

      {finding.corroboratedBy.length > 0 && (
        <div className="flex items-center gap-1.5 ml-[calc(var(--badge-offset,0px)+0.5rem)] pl-7">
          <span className="font-mono text-[11px] text-luna-fg-4 tracking-[0.04em]">
            Corroborated by:
          </span>
          <span className="font-mono text-[11px] text-luna-fg-3">
            {finding.corroboratedBy.join(', ')}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pl-7">
        {finding.citations.map((citId) => {
          const resolved = citationLookup.get(citId.toLowerCase())
          const source = resolved?.source as CitationSource | undefined
          const label = source ? INSTRUMENT_LABELS[source] : 'UNKNOWN'
          const url = resolved?.url ?? null

          const chip = (
            <Badge
              variant={source ? 'cyan' : 'default'}
              className="font-mono text-[10px] tracking-[0.08em]"
            >
              {label} · {citId}
            </Badge>
          )

          if (url) {
            return (
              <a
                key={citId}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                {chip}
              </a>
            )
          }
          return <span key={citId}>{chip}</span>
        })}

        {agentName && (
          <span className="font-mono text-[10px] text-luna-fg-4 tracking-[0.04em] ml-auto">
            {agentName}
          </span>
        )}
      </div>
    </div>
  )
}
