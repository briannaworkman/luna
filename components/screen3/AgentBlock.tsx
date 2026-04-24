'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CitationChip } from './CitationChip'
import { ConfidenceBadge } from './ConfidenceBadge'
import { AgentStatusGlyph } from '@/components/agent-rail/AgentStatusGlyph'
import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { AGENTS } from '@/lib/constants/agents'
import { citationKey } from '@/lib/citations/types'
import type { SingleAgentState } from './useAgentStream'

interface AgentBlockProps {
  agentId: string
  label: string
  state: SingleAgentState
}

export function AgentBlock({ agentId, label, state }: AgentBlockProps) {
  const isStub = AGENTS.find((a) => a.id === agentId)?.isStub ?? false
  const [collapsed, setCollapsed] = useState(false)

  const isActive = state.status === 'active'
  const canCollapse = !isActive

  const seen = new Set<string>()
  const uniqueCitations = state.citations.filter((c) => {
    const key = citationKey(c)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const bodyIsEmpty = state.body.length === 0

  const controlsId = `agent-block-body-${agentId}`

  return (
    <div
      className="bg-luna-base-1 border border-luna-hairline rounded-md px-5 py-4"
      aria-label={`${label} agent output`}
    >
      {/* Header row */}
      {canCollapse ? (
        <button
          type="button"
          className="flex items-center justify-between gap-2 w-full text-left"
          aria-expanded={!collapsed}
          aria-controls={controlsId}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="flex items-center font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
            {label}
            {isStub && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="warning" className="ml-2">V2</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-luna-fg">Placeholder output</div>
                  <div className="text-luna-fg-3 mt-0.5">
                    Full analysis for this agent ships in V2.
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <AgentStatusGlyph status={state.status} />
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-luna-fg-4" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-luna-fg-4" />
            )}
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
            {label}
            {isStub && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="warning" className="ml-2">V2</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-luna-fg">Placeholder output</div>
                  <div className="text-luna-fg-3 mt-0.5">
                    Full analysis for this agent ships in V2.
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </span>
          <AgentStatusGlyph status={state.status} />
        </div>
      )}

      {/* Collapsible content */}
      {!collapsed && (
        <div id={controlsId}>
          {/* Body */}
          <div
            className={`font-mono text-[13px] leading-[1.7] whitespace-pre-wrap mt-2 ${
              isStub ? 'text-luna-fg-3' : 'text-luna-fg-2'
            }`}
          >
            {bodyIsEmpty && state.status !== 'error' ? (
              <span className="text-luna-fg-4 italic">Awaiting specialist output…</span>
            ) : (
              state.body.map((seg, i) => {
                if (seg.kind === 'text') {
                  return <span key={i}>{seg.text}</span>
                }
                return (
                  <ConfidenceBadge
                    key={i}
                    level={seg.level}
                    className="mx-1 align-middle"
                  />
                )
              })
            )}
          </div>

          {/* Error message */}
          {state.errorMessage && (
            <div className="text-luna-danger text-[12px] font-mono mt-2">
              {state.errorMessage}
            </div>
          )}

          {/* Citations — deduped */}
          {uniqueCitations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3" aria-label="Citations">
              {uniqueCitations.map((c, i) => (
                <CitationChip key={`${agentId}-cit-${i}`} source={c.source} id={c.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
