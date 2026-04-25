'use client'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import { BriefHeader } from './BriefHeader'
import { BriefTabs } from './BriefTabs'
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
  activationOrder: AgentId[]
  globalCitations: ResolvedCitation[]
  onFollowUp: (question: string) => void
  onReset: () => void
}

/**
 * Coerces a Partial<MissionBrief> to a renderable MissionBrief shape.
 * Missing arrays default to [], missing strings to ''.
 */
function partialAsBrief(partial: Partial<MissionBrief>): MissionBrief {
  return {
    locationName: partial.locationName ?? '',
    query: partial.query ?? '',
    generatedAt: partial.generatedAt ?? new Date().toISOString(),
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

  // Show skeleton while loading and no partials yet
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 top-14 flex bg-luna-base overflow-hidden">
        <AgentRail className="h-full" completedAgents={completedAgentSet} />
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="w-full max-w-4xl mx-auto px-10 py-10">
            <BriefSkeleton />
          </div>
        </main>
        <CompletenessPanel dataCompleteness={{}} />
      </div>
    )
  }

  // Error with no partial — centered error block
  if (status === 'error' && !partial && !brief) {
    return (
      <div className="fixed inset-0 top-14 flex bg-luna-base overflow-hidden">
        <AgentRail className="h-full" completedAgents={completedAgentSet} />
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="w-full max-w-4xl mx-auto px-10 py-24 flex flex-col items-center gap-6">
            <p className="font-mono text-[13px] text-luna-danger text-center">
              Brief synthesis failed: {error}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
            >
              Try again
            </Button>
          </div>
        </main>
        <CompletenessPanel dataCompleteness={{}} />
      </div>
    )
  }

  // Get renderable brief (complete or partial fallback)
  const renderBrief: MissionBrief =
    brief ?? (partial ? partialAsBrief(partial) : null) ?? partialAsBrief({})

  const isPartial = status === 'partial' || (status === 'error' && !brief && partial !== null)

  const validFollowUps =
    status === 'complete' &&
    renderBrief.followUpQueries.length === 3 &&
    renderBrief.followUpQueries.every((q) => q.length > 0)

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base overflow-hidden">
      {/* Agent rail — all agents shown as completed/idle (no active pulse) */}
      <AgentRail className="h-full" completedAgents={completedAgentSet} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-6">
          {/* Header row: reset button */}
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              New query
            </Button>
          </div>

          {/* Error with partial — inline warning banner */}
          {status === 'error' && (partial || brief) && (
            <div
              className="border border-luna-warning rounded px-4 py-3 font-mono text-[13px] text-luna-warning"
              role="alert"
            >
              Brief was not fully synthesized — partial results shown.
            </div>
          )}

          {/* Partial streaming indicator */}
          {isPartial && !error && (
            <div className="font-mono text-[11px] text-luna-fg-4 animate-pulse" aria-live="polite">
              Synthesizing…
            </div>
          )}

          {/* Brief header */}
          {(renderBrief.locationName || renderBrief.query) && (
            <BriefHeader brief={renderBrief} />
          )}

          {/* Tabs */}
          {renderBrief.sections.length > 0 && (
            <BriefTabs>
              {(activeTab) =>
                activeTab === 'topic' ? (
                  <ByTopicView brief={renderBrief} globalCitations={globalCitations} />
                ) : (
                  <ByAgentView
                    brief={renderBrief}
                    globalCitations={globalCitations}
                    activationOrder={activationOrder}
                  />
                )
              }
            </BriefTabs>
          )}

          {/* Follow-up chips — only on complete, no errors, valid questions */}
          {validFollowUps && (
            <FollowUpChips
              questions={renderBrief.followUpQueries as [string, string, string]}
              onFollowUp={onFollowUp}
            />
          )}
        </div>
      </main>

      {/* Completeness panel — always visible per S7.2.3. Falls back to
          'Incomplete' for any of the 5 keys not yet populated. */}
      <CompletenessPanel dataCompleteness={renderBrief.dataCompleteness} />
    </div>
  )
}
