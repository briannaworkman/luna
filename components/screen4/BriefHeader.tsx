import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MissionBrief } from '@/lib/types/brief'

interface BriefHeaderProps {
  brief: MissionBrief
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

export function BriefHeader({ brief }: BriefHeaderProps) {
  const { high, medium, low } = confidenceSummary(brief)

  return (
    <header className="pb-6 border-b border-luna-hairline">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="font-sans font-medium text-[20px] leading-[1.2] text-luna-fg m-0">
            {brief.locationName}
          </h2>
          <p className="font-sans text-[13px] leading-[1.6] text-luna-fg-2 italic m-0">
            {brief.query}
          </p>
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
        </div>

        {/* Export PDF — disabled in this PR; no print mechanics yet */}
        <div className="shrink-0 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            aria-label="Export PDF (coming soon)"
          >
            <Download size={13} strokeWidth={1.5} aria-hidden="true" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary paragraph */}
      {brief.summary && (
        <p className="font-sans text-[13px] leading-[1.7] text-luna-fg-2 mt-5 m-0">
          {brief.summary}
        </p>
      )}
    </header>
  )
}
