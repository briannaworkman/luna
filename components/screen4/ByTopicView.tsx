import { groupFindingsByTopic } from '@/lib/brief/topicMap'
import { FindingItem } from './FindingItem'
import type { MissionBrief } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'

interface ByTopicViewProps {
  brief: MissionBrief
  globalCitations: ResolvedCitation[]
}

export function ByTopicView({ brief, globalCitations }: ByTopicViewProps) {
  const groups = groupFindingsByTopic(brief.sections)

  if (groups.length === 0) {
    return (
      <div className="font-mono text-[13px] text-luna-fg-4 italic py-6">
        No findings available.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ topic, findings }) => (
        <section key={topic} aria-label={topic}>
          <h3 className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4 mb-3">
            {topic}
          </h3>
          <div className="bg-luna-base-1 border border-luna-hairline rounded-md px-5">
            {findings.map((finding, i) => (
              <FindingItem
                key={`${finding.agentId}-${i}`}
                finding={finding}
                globalCitations={globalCitations}
                agentName={finding.agentName}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
