'use client'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import { BriefHeader } from './BriefHeader'
import { BriefTabs } from './BriefTabs'
import { OverviewTab } from './OverviewTab'
import { ByTopicView } from './ByTopicView'
import { ByAgentView } from './ByAgentView'
import { CompletenessPanel } from './CompletenessPanel'
import { FollowUpChips } from './FollowUpChips'
import { BriefSkeleton } from './BriefSkeleton'
import type { MissionBrief } from '@/lib/types/brief'
import type { ResolvedCitation } from '@/lib/citations/types'
import type { AgentId } from '@/lib/constants/agents'
import type { BriefStreamState } from '@/lib/hooks/useBriefStream'

interface BriefViewProps {
  briefState: BriefStreamState
  activationOrder: readonly AgentId[]
  globalCitations: ResolvedCitation[]
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

  const renderBrief: MissionBrief =
    brief ?? (partial ? partialAsBrief(partial) : EMPTY_BRIEF)

  const isLoading = status === 'loading'
  const isErrorWithoutBrief = status === 'error' && !partial && !brief
  const isPartial = status === 'partial' || (status === 'error' && !brief && partial !== null)
  const validFollowUps =
    status === 'complete' && renderBrief.followUpQueries.every((q) => q.length > 0)

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base overflow-hidden">
      <AgentRail className="h-full" completedAgents={completedAgentSet} />

      <main className="flex-1 overflow-y-auto min-w-0">
        {isLoading ? (
          <div className="w-full max-w-4xl mx-auto px-10 py-10">
            <BriefSkeleton />
          </div>
        ) : isErrorWithoutBrief ? (
          <div className="w-full max-w-4xl mx-auto px-10 py-24 flex flex-col items-center gap-6">
            <p className="font-mono text-[13px] text-luna-danger text-center">
              Brief synthesis failed: {error}
            </p>
            <Button type="button" variant="outline" onClick={onReset}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-6">
            <div className="flex items-center justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onReset}>
                New query
              </Button>
            </div>

            {status === 'error' && (partial || brief) && (
              <div
                className="border border-luna-warning rounded px-4 py-3 font-mono text-[13px] text-luna-warning"
                role="alert"
              >
                Brief was not fully synthesized — partial results shown.
              </div>
            )}

            {isPartial && !error && (
              <div className="font-mono text-[11px] text-luna-fg-4 animate-pulse" aria-live="polite">
                Synthesizing…
              </div>
            )}

            {(renderBrief.locationName || renderBrief.query) && (
              <BriefHeader brief={renderBrief} />
            )}

            {(renderBrief.sections.length > 0 || renderBrief.summary) && (
              <BriefTabs>
                {(activeTab, breakdownView) => {
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
            )}

            {validFollowUps && (
              <FollowUpChips
                questions={renderBrief.followUpQueries as [string, string, string]}
                onFollowUp={onFollowUp}
              />
            )}
          </div>
        )}
      </main>

      {/* S7.2.3: panel always visible. Falls back to 'Incomplete' for any of
          the 5 keys not yet populated by the streaming brief. */}
      <CompletenessPanel dataCompleteness={renderBrief.dataCompleteness} />
    </div>
  )
}
