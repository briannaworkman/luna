import { useMemo } from 'react'
import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { FindingItem } from './FindingItem'
import { Eyebrow } from '@/components/ui/eyebrow'
import { AGENTS, STUB_AGENT_IDS, type AgentId } from '@/lib/constants/agents'
import type { MissionBrief, BriefSection } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'

interface ByAgentViewProps {
  brief: MissionBrief
  citationLookup: Map<string, ResolvedCitation>
  activationOrder: readonly AgentId[]
}

const STUB_IDS = AGENTS.filter((a) => a.isStub).map((a) => a.id)

function StubSection({ section }: { section: BriefSection }) {
  return (
    <section aria-label={section.agentName}>
      <div className="bg-luna-base-1 border border-luna-hairline rounded-md px-5 py-4">
        <Eyebrow className="flex items-center gap-2 text-luna-fg-4 mb-3">
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
        </Eyebrow>
        <p className="font-mono text-[13px] text-luna-fg-4 italic">
          Full analysis ships in V2.
        </p>
      </div>
    </section>
  )
}

export function ByAgentView({ brief, citationLookup, activationOrder }: ByAgentViewProps) {
  const orderedIds = useMemo(() => {
    // Order: activated agents → any sections not in activationOrder → all stubs
    // (S7.2.1: stubs always present in "By agent" view, even if not activated).
    const activated = new Set<AgentId>(activationOrder)
    const orphanSections = brief.sections
      .map((s) => s.agentId as AgentId)
      .filter((id) => !activated.has(id))

    const seen = new Set<string>()
    const out: AgentId[] = []
    for (const id of [...activationOrder, ...orphanSections, ...STUB_IDS]) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
    return out
  }, [brief.sections, activationOrder])

  const sectionMap = useMemo(() => {
    const m = new Map<string, BriefSection>()
    for (const section of brief.sections) m.set(section.agentId, section)
    return m
  }, [brief.sections])

  if (orderedIds.length === 0) {
    return (
      <div className="font-mono text-[13px] text-luna-fg-4 italic py-6">
        No agent sections available.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {orderedIds.map((agentId) => {
        const section = sectionMap.get(agentId)
        const agentMeta = AGENTS.find((a) => a.id === agentId)
        const label = agentMeta?.label ?? agentId

        if (STUB_AGENT_IDS.has(agentId)) {
          const stubSection = section ?? { agentId, agentName: label, findings: [] }
          return <StubSection key={agentId} section={stubSection} />
        }

        if (!section) return null

        return (
          <section key={agentId} aria-label={section.agentName}>
            <Eyebrow className="text-luna-fg-4 mb-3">
              {section.agentName}
            </Eyebrow>
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
                    citationLookup={citationLookup}
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
