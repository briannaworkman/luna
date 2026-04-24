import { cn } from '@/lib/utils'
import { AGENTS } from '@/lib/constants/agents'
import type { Agent, AgentId } from '@/lib/constants/agents'

interface AgentRailProps {
  className?: string
  activeAgents?: Set<AgentId>
  completedAgents?: Set<AgentId>
  errorAgents?: Set<AgentId>
  statusTexts?: Partial<Record<AgentId, string>>
  footerActiveCount?: number
}

function AgentRow({
  agent,
  isActive,
  isComplete,
  isError,
  statusText,
}: {
  agent: Agent
  isActive: boolean
  isComplete: boolean
  isError: boolean
  statusText?: string
}) {
  const hasStatus = Boolean(statusText)
  const rowClass = cn(
    'px-4 flex items-center gap-3 border-b border-luna-hairline font-sans font-normal text-[13px] transition-colors',
    hasStatus ? 'min-h-11 h-auto py-2' : 'h-11',
    isActive && 'text-luna-fg',
    isComplete && 'text-luna-fg-2',
    isError && 'text-luna-danger',
    !isActive && !isComplete && !isError && 'text-luna-fg-3',
  )

  return (
    <div className={rowClass}>
      {/* Status glyph */}
      <span className="shrink-0 w-2.5 text-center font-mono text-[14px] leading-none select-none">
        {isActive && (
          <span className="relative inline-flex items-center justify-center w-3.5 h-3.5" aria-hidden="true">
            <span className="absolute inset-0 rounded-full bg-luna-cyan animate-[luna-pulse_2.4s_infinite_cubic-bezier(0.16,1,0.3,1)]" />
            <span className="relative text-luna-cyan">◉</span>
          </span>
        )}
        {isComplete && (
          <span className="text-luna-success" aria-hidden="true">✓</span>
        )}
        {isError && (
          <span className="text-luna-danger" aria-hidden="true">✗</span>
        )}
        {!isActive && !isComplete && !isError && (
          <span className="text-luna-hairline-2" aria-hidden="true">○</span>
        )}
      </span>

      {/* Label + optional status text */}
      <span className="flex flex-col min-w-0">
        <span className="lowercase leading-tight">{agent.label}</span>
        {hasStatus && (
          <span className="font-mono text-[10px] tracking-[0.02em] text-luna-fg-4 leading-tight truncate max-w-[170px] mt-0.5">
            {statusText}
          </span>
        )}
      </span>
    </div>
  )
}

export function AgentRail({
  className,
  activeAgents = new Set(),
  completedAgents = new Set(),
  errorAgents = new Set(),
  statusTexts = {},
  footerActiveCount = 0,
}: AgentRailProps) {
  return (
    <aside
      className={cn(
        'flex flex-col w-[220px] shrink-0',
        'bg-luna-base-2 border-r border-luna-hairline',
        className,
      )}
      aria-label="Agent status rail"
    >
      <div className="px-4 pt-6 pb-3">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3">
          Agents
        </div>
      </div>

      <div className="flex flex-col">
        {AGENTS.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            isActive={activeAgents.has(agent.id)}
            isComplete={completedAgents.has(agent.id)}
            isError={errorAgents.has(agent.id)}
            statusText={statusTexts[agent.id]}
          />
        ))}
      </div>

      <div className="mt-auto px-4 pt-3.5 pb-5 border-t border-luna-hairline">
        <div className="font-mono text-[11px] tracking-[0.08em] text-luna-hairline-2">
          {AGENTS.length} agents
          <span className="mx-1.5">·</span>
          {footerActiveCount} active
        </div>
      </div>
    </aside>
  )
}
