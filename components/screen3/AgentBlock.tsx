import { CitationChip } from './CitationChip'
import { ConfidenceBadge } from './ConfidenceBadge'
import type { SingleAgentState } from './useAgentStream'

interface AgentBlockProps {
  agentId: string
  label: string
  state: SingleAgentState
}

function StatusGlyph({ status }: { status: SingleAgentState['status'] }) {
  if (status === 'active') {
    return (
      <span className="relative inline-flex items-center justify-center w-4 h-4" aria-hidden="true">
        <span
          className="absolute inset-0 rounded-full bg-luna-cyan animate-luna-pulse"
        />
        <span className="relative font-mono text-[14px] text-luna-cyan leading-none">◉</span>
      </span>
    )
  }

  if (status === 'complete') {
    return (
      <span className="font-mono text-[14px] text-luna-success leading-none" aria-hidden="true">
        ✓
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="font-mono text-[14px] text-luna-danger leading-none" aria-hidden="true">
        ✗
      </span>
    )
  }

  return null
}

export function AgentBlock({ agentId, label, state }: AgentBlockProps) {
  return (
    <div
      className="bg-luna-base-1 border border-luna-hairline rounded-md px-5 py-4"
      aria-label={`${label} agent output`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
          {label}
        </span>
        <StatusGlyph status={state.status} />
      </div>

      {/* Body */}
      <div className="font-mono text-[13px] text-luna-fg-2 leading-[1.7] whitespace-pre-wrap mt-2">
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
