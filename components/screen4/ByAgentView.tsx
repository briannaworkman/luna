import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { FindingItem } from './FindingItem'
import { AGENTS } from '@/lib/constants/agents'
import type { MissionBrief, BriefSection } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'
import type { AgentId } from '@/lib/constants/agents'

interface ByAgentViewProps {
  brief: MissionBrief
  globalCitations: ResolvedCitation[]
  /** Activation order from the agent stream */
  activationOrder: AgentId[]
}

function StubSection({ section }: { section: BriefSection }) {
  return (
    <section aria-label={section.agentName}>
      <div className="bg-luna-base-1 border border-luna-hairline rounded-md px-5 py-4">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4 mb-3">
          {section.agentName}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="warning" className="ml-1">V2</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-luna-fg">Placeholder output</div>
              <div className="text-luna-fg-3 mt-0.5">
                Full analysis for this agent ships in V2.
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="font-mono text-[13px] text-luna-fg-4 italic">
          Full analysis ships in V2.
        </p>
      </div>
    </section>
  )
}

export function ByAgentView({ brief, globalCitations, activationOrder }: ByAgentViewProps) {
  // Build a map of agentId -> section for quick lookup
  const sectionMap = new Map<string, BriefSection>()
  for (const section of brief.sections) {
    sectionMap.set(section.agentId, section)
  }

  // Order: activated agents first, then any brief.sections not in activationOrder,
  // then all stub agents (S7.2.1: stubs are present in "By agent" view with V2 badge,
  // independent of whether they were activated for this query).
  const stubIds = AGENTS.filter((a) => a.isStub).map((a) => a.id)
  const orderedIds = [
    ...activationOrder,
    ...brief.sections
      .map((s) => s.agentId as AgentId)
      .filter((id) => !activationOrder.includes(id)),
    ...stubIds,
  ]

  // De-duplicate while preserving order
  const seen = new Set<string>()
  const deduped = orderedIds.filter((id) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  if (deduped.length === 0) {
    return (
      <div className="font-mono text-[13px] text-luna-fg-4 italic py-6">
        No agent sections available.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {deduped.map((agentId) => {
        const section = sectionMap.get(agentId)
        const agentMeta = AGENTS.find((a) => a.id === agentId)
        const isStub = agentMeta?.isStub ?? false
        const label = agentMeta?.label ?? agentId

        // Stub agents that have a section — render with V2 badge
        if (isStub) {
          const stubSection = section ?? {
            agentId,
            agentName: label,
            findings: [],
          }
          return <StubSection key={agentId} section={stubSection} />
        }

        // Non-stub agent with no section (e.g., data-ingest) — skip
        if (!section) return null

        return (
          <section key={agentId} aria-label={section.agentName}>
            <h3 className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4 mb-3">
              {section.agentName}
            </h3>
            <div className="bg-luna-base-1 border border-luna-hairline rounded-md px-5">
              {section.findings.length === 0 ? (
                <div className="font-mono text-[13px] text-luna-fg-4 italic py-4">
                  No findings recorded.
                </div>
              ) : (
                section.findings.map((finding, i) => (
                  <FindingItem
                    key={i}
                    finding={finding}
                    globalCitations={globalCitations}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
