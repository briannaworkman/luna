import type { MissionBrief } from '@/lib/types/brief'

interface BriefHeaderProps {
  brief: MissionBrief
  isLoading?: boolean
  actions?: React.ReactNode
}

function confidenceSummary(brief: MissionBrief) {
  let high = 0
  let medium = 0
  let low = 0

  for (const section of brief.sections) {
    for (const finding of section.findings) {
      if (finding.confidence === 'High') high++
      else if (finding.confidence === 'Medium') medium++
      else if (finding.confidence === 'Low') low++
    }
  }

  return { high, medium, low }
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toUTCString().replace(/GMT$/, 'UTC')
  } catch {
    return iso
  }
}

export function BriefHeader({ brief, isLoading, actions }: BriefHeaderProps) {
  const { high, medium, low } = confidenceSummary(brief)

  return (
    <header className="pb-6 border-b border-luna-hairline">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        {actions && (
          <div className="shrink-0 md:order-last">{actions}</div>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="font-sans font-medium text-[20px] leading-[1.2] text-luna-fg m-0">
            {brief.locationName}
          </h2>
          <p className="font-sans text-[13px] leading-[1.6] text-luna-fg-2 italic m-0">
            {brief.query}
          </p>
          {isLoading ? (
            <span className="font-mono text-[11px] tracking-[0.06em] text-luna-fg-4 animate-pulse">
              Synthesizing brief…
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.06em]">
              <span className="text-luna-fg-4">
                {formatTimestamp(brief.generatedAt)}
              </span>
              <span className="text-luna-fg-4">·</span>
              <span className="text-luna-success">{high} High</span>
              <span className="text-luna-fg-4">·</span>
              <span className="text-luna-warning">{medium} Medium</span>
              <span className="text-luna-fg-4">·</span>
              <span className="text-luna-fg-3">{low} Low</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
