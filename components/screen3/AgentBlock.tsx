import { CitationChip } from './CitationChip'
import { ConfidenceBadge } from './ConfidenceBadge'
import { AgentStatusGlyph } from '@/components/agent-rail/AgentStatusGlyph'
import { AGENTS } from '@/lib/constants/agents'
import type { SingleAgentState } from './useAgentStream'

interface AgentBlockProps {
  agentId: string
  label: string
  state: SingleAgentState
}

export function AgentBlock({ agentId, label, state }: AgentBlockProps) {
  const isStub = AGENTS.find((a) => a.id === agentId)?.isStub ?? false

  return (
    <div
      className="bg-luna-base-1 border border-luna-hairline rounded-md px-5 py-4"
      aria-label={`${label} agent output`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
          {label}
          {isStub && (
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-luna-warning bg-luna-warning/10 px-1 py-0 rounded-sm ml-2">
              V2
            </span>
          )}
        </span>
        <AgentStatusGlyph status={state.status} />
      </div>

      {/* Body */}
      <div
        className={`font-mono text-[13px] leading-[1.7] whitespace-pre-wrap mt-2 ${
          isStub ? 'text-luna-fg-3' : 'text-luna-fg-2'
        }`}
      >
        {state.text === '' ? (
          <span className="text-luna-fg-4 italic">Awaiting specialist output…</span>
        ) : (
          state.text
        )}
      </div>

      {/* Error message */}
      {state.errorMessage && (
        <div className="text-luna-danger text-[12px] font-mono mt-2">
          {state.errorMessage}
        </div>
      )}

      {/* Citations */}
      {state.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3" aria-label="Citations">
          {state.citations.map((c, i) => (
            <CitationChip key={`${agentId}-cit-${i}`} source={c.source} id={c.id} />
          ))}
        </div>
      )}

      {/* Confidence badges */}
      {state.confidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5" aria-label="Confidence ratings">
          {state.confidence.map((c, i) => (
            <ConfidenceBadge key={`${agentId}-conf-${i}`} level={c.level} />
          ))}
        </div>
      )}
    </div>
  )
}
