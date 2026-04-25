import type { MissionBrief } from '@/lib/types/brief'

interface OverviewTabProps {
  brief: MissionBrief
}

export function OverviewTab({ brief }: OverviewTabProps) {
  const paragraphs = brief.summary.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

  if (!paragraphs.length) {
    return (
      <div className="font-mono text-[13px] text-luna-fg-4 italic py-6">
        Overview not yet available.
      </div>
    )
  }

  return (
    <article className="bg-luna-base-1 border border-luna-hairline rounded-md px-6 py-5 flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="font-sans text-[14px] leading-[1.7] text-luna-fg m-0">
          {p}
        </p>
      ))}
    </article>
  )
}
