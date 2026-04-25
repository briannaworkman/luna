'use client'
import { useMemo } from 'react'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import { AgentStrip } from '@/components/agent-rail/AgentStrip'
import { BriefHeader } from './BriefHeader'
import { BriefTabs } from './BriefTabs'
import { OverviewTab } from './OverviewTab'
import { ByTopicView } from './ByTopicView'
import { ByAgentView } from './ByAgentView'
import { CompletenessPanel } from './CompletenessPanel'
import { FollowUpChips } from './FollowUpChips'
import { BriefSkeleton } from './BriefSkeleton'
import { BriefActionsMenu } from './BriefActionsMenu'
import type { MissionBrief } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'
import type { AgentId } from '@/lib/constants/agents'
import type { BriefStreamState } from '@/lib/hooks/useBriefStream'

interface BriefViewProps {
  briefState: BriefStreamState
  activationOrder: readonly AgentId[]
  globalCitations: ResolvedCitation[]
  locationName: string
  query: string
  onFollowUp: (question: string) => void
  onReset: () => void
}

const EMPTY_BRIEF: MissionBrief = {
  locationName: '',
  query: '',
  generatedAt: '',
  summary: '',
  sections: [],
  followUpQueries: ['', '', ''],
  dataCompleteness: {},
}

function partialAsBrief(partial: Partial<MissionBrief>): MissionBrief {
  return {
    locationName: partial.locationName ?? '',
    query: partial.query ?? '',
    generatedAt: partial.generatedAt ?? '',
    summary: partial.summary ?? '',
    sections: partial.sections ?? [],
    followUpQueries: (partial.followUpQueries?.length === 3
      ? partial.followUpQueries
      : ['', '', '']) as [string, string, string],
    dataCompleteness: partial.dataCompleteness ?? {},
  }
}

export function BriefView({
  briefState,
  activationOrder,
  globalCitations,
  locationName,
  query,
  onFollowUp,
  onReset,
}: BriefViewProps) {
  const { status, brief, partial, error } = briefState

  const completedAgentSet = useMemo(() => new Set(activationOrder), [activationOrder])
  const citationLookup = useMemo(() => {
    const m = new Map<string, ResolvedCitation>()
    for (const c of globalCitations) m.set(c.id.toLowerCase(), c)
    return m
  }, [globalCitations])

  const renderBrief: MissionBrief = useMemo(() => {
    const base = brief ?? (partial ? partialAsBrief(partial) : EMPTY_BRIEF)
    return {
      ...base,
      locationName: base.locationName || locationName,
      query: base.query || query,
    }
  }, [brief, partial, locationName, query])

  const isLoading = status === 'loading'
  const isErrorWithoutBrief = status === 'error' && !partial && !brief
  const isPartial = status === 'partial' || (status === 'error' && !brief && partial !== null)
  const validFollowUps =
    status === 'complete' && renderBrief.followUpQueries.every((q) => q.length > 0)

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base overflow-hidden">
      <div className="hidden md:flex h-full">
        <AgentRail className="h-full" completedAgents={completedAgentSet} />
      </div>

      <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">
        <AgentStrip completedAgents={completedAgentSet} />

        {isLoading ? (
          <div className="w-full max-w-4xl mx-auto px-4 md:px-10 py-10 flex flex-col gap-6">
            <BriefHeader
              brief={{ ...EMPTY_BRIEF, locationName, query }}
              isLoading
              actions={<BriefActionsMenu onReset={onReset} />}
            />
            <BriefTabs>
              {() => <BriefSkeleton />}
            </BriefTabs>
          </div>
        ) : isErrorWithoutBrief ? (
          <div className="w-full max-w-4xl mx-auto px-4 md:px-10 py-24 flex flex-col items-center gap-6">
            <p className="font-mono text-[13px] text-luna-danger text-center">
              Brief synthesis failed: {error}
            </p>
            <BriefActionsMenu onReset={onReset} />
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto px-4 md:px-10 py-10 flex flex-col gap-6">
            {status === 'error' && (partial || brief) && (
              <div
                className="border border-luna-warning rounded px-4 py-3 font-mono text-[13px] text-luna-warning"
                role="alert"
              >
                Brief was not fully synthesized — partial results shown.
              </div>
            )}

            <BriefHeader
              brief={renderBrief}
              isLoading={isPartial && !error}
              actions={<BriefActionsMenu onReset={onReset} />}
            />

            <BriefTabs>
              {(activeTab, breakdownView) => {
                if (isPartial && !error && !renderBrief.sections.length && !renderBrief.summary) {
                  return <BriefSkeleton />
                }
                if (activeTab === 'overview') {
                  return <OverviewTab brief={renderBrief} />
                }
                return breakdownView === 'topic' ? (
                  <ByTopicView brief={renderBrief} citationLookup={citationLookup} />
                ) : (
                  <ByAgentView
                    brief={renderBrief}
                    citationLookup={citationLookup}
                    activationOrder={activationOrder}
                  />
                )
              }}
            </BriefTabs>

            {validFollowUps && (
              <FollowUpChips
                questions={renderBrief.followUpQueries as [string, string, string]}
                onFollowUp={onFollowUp}
              />
            )}

            {/* Mobile completeness + sources — inline below content */}
            <div className="md:hidden border-t border-luna-hairline pt-4 pb-8">
              <CompletenessPanel
                dataCompleteness={renderBrief.dataCompleteness}
                citations={globalCitations}
                inline
              />
            </div>
          </div>
        )}
      </main>

      <div className="hidden md:flex h-full">
        <CompletenessPanel
          dataCompleteness={renderBrief.dataCompleteness}
          citations={globalCitations}
        />
      </div>
    </div>
  )
}
