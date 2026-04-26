import { useMemo } from 'react'
import { groupFindingsByTopic } from '@/lib/brief/topicMap'
import { FindingItem } from './FindingItem'
import { Eyebrow } from '@/components/ui/eyebrow'
import type { MissionBrief } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'

interface ByTopicViewProps {
  brief: MissionBrief
  citationLookup: Map<string, ResolvedCitation>
}

export function ByTopicView({ brief, citationLookup }: ByTopicViewProps) {
  const groups = useMemo(() => groupFindingsByTopic(brief.sections), [brief.sections])

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
          <Eyebrow className="text-luna-fg-4 mb-3">
            {topic}
          </Eyebrow>
          <div className="bg-luna-base-1 border border-luna-hairline rounded-md px-5">
            {findings.map((finding, i) => (
              <FindingItem
                key={`${finding.agentId}-${i}`}
                finding={finding}
                citationLookup={citationLookup}
                agentName={finding.agentName}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
