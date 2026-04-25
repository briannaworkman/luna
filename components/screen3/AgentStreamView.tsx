'use client'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import { LocationHeader } from '@/components/screen2/LocationHeader'
import { OrchestratorBlock } from './OrchestratorBlock'
import { AgentBlock } from './AgentBlock'
import { makeDefaultAgentState, type SingleAgentState, type AgentStreamState } from './useAgentStream'
import { SourceDock } from './SourceDock'
import { AGENTS, isMainPanelAgent } from '@/lib/constants/agents'
import type { AgentId } from '@/lib/constants/agents'
import type { LunarLocation } from '@/components/globe/types'

interface AgentStreamViewProps {
  location: LunarLocation
  query: string
  /** Agent stream state, owned by the parent */
  state: AgentStreamState
  onReset: () => void
  onGenerateBrief: () => void
}

export function AgentStreamView({
  location,
  query,
  state,
  onReset,
  onGenerateBrief,
}: AgentStreamViewProps) {
  // Derive sets for AgentRail — recomputed only when agentStates changes
  const { activeAgents, completedAgents, errorAgents, statusTexts } = useMemo(() => {
    const active = new Set<AgentId>()
    const complete = new Set<AgentId>()
    const error = new Set<AgentId>()
    const texts: Partial<Record<AgentId, string>> = {}

    for (const [id, s] of Object.entries(state.agentStates) as Array<[AgentId, SingleAgentState]>) {
      if (s.status === 'active') active.add(id)
      if (s.status === 'complete') complete.add(id)
      if (s.status === 'error') error.add(id)
      if (s.statusText) texts[id] = s.statusText
    }

    return { activeAgents: active, completedAgents: complete, errorAgents: error, statusTexts: texts }
  }, [state.agentStates])

  const visibleAgents = state.activatedAgents.filter(isMainPanelAgent)

  return (
    <div className="fixed inset-0 top-14 flex bg-luna-base overflow-hidden">
      <AgentRail
        className="h-full"
        activeAgents={activeAgents}
        completedAgents={completedAgents}
        errorAgents={errorAgents}
        statusTexts={statusTexts}
        footerActiveCount={activeAgents.size}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <LocationHeader location={location} />
            </div>
            <div className="pt-1 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
              >
                New query
              </Button>
            </div>
          </div>

          {/* Query display card */}
          <div className="bg-luna-base-1 border border-luna-hairline rounded px-4 py-2">
            <div className="font-mono text-[13px] text-luna-fg-2 leading-[1.7]">
              {query}
            </div>
          </div>

          {/* Stream error banner */}
          {state.streamError && (
            <div
              className="text-luna-danger font-mono text-[13px] border border-luna-danger rounded px-4 py-3"
              role="alert"
            >
              {state.streamError}
            </div>
          )}

          {/* Orchestrator block — hide entirely when a stream error killed the
              session before any rationale or activation decision arrived, so
              the UI doesn't show a ghost "Deciding which agents to activate…"
              placeholder underneath the error banner. */}
          {!(state.streamError && state.preflight === '' && state.activatedAgents.length === 0) && (
            <OrchestratorBlock text={state.preflight} isDone={state.isDone} />
          )}

          {/* Per-agent blocks (exclude data-ingest) */}
          {visibleAgents.map((agentId) => {
              const agentMeta = AGENTS.find((a) => a.id === agentId)
              const label = agentMeta?.label ?? agentId
              const agentState = state.agentStates[agentId] ?? makeDefaultAgentState()
              return (
                <AgentBlock
                  key={agentId}
                  agentId={agentId}
                  label={label}
                  state={agentState}
                />
              )
            })}

          {/* Generate mission brief button — always visible, disabled until stream completes */}
          <div className="flex justify-end pt-2 pb-4">
            <Button
              type="button"
              onClick={onGenerateBrief}
              disabled={!state.isDone}
              className={!state.isDone ? 'opacity-40 cursor-not-allowed' : ''}
            >
              Generate mission brief
            </Button>
          </div>
        </div>
      </main>

      <SourceDock
        citations={state.globalCitations}
        activatedAgentCount={visibleAgents.length}
      />
    </div>
  )
}
