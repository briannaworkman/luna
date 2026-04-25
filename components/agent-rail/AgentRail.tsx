import { cn } from '@/lib/utils'
import { AGENTS, isMainPanelAgent } from '@/lib/constants/agents'
import type { Agent, AgentId } from '@/lib/constants/agents'
import { AgentStatusGlyph, type AgentStatus } from './AgentStatusGlyph'

interface AgentRailProps {
  className?: string
  activeAgents?: Set<AgentId>
  completedAgents?: Set<AgentId>
  errorAgents?: Set<AgentId>
  statusTexts?: Partial<Record<AgentId, string>>
  chunkCounts?: Partial<Record<AgentId, number>>
  footerActiveCount?: number
}

function AgentRow({
  agent,
  isActive,
  isComplete,
  isError,
  statusText,
  chunkCount,
}: {
  agent: Agent
  isActive: boolean
  isComplete: boolean
  isError: boolean
  statusText?: string
  chunkCount?: number
}) {
  const showChunkCount = isActive && typeof chunkCount === 'number' && chunkCount > 0 && isMainPanelAgent(agent.id)
  const hasStatus = Boolean(statusText) || showChunkCount
  const status: AgentStatus = isActive
    ? 'active'
    : isComplete
      ? 'complete'
      : isError
        ? 'error'
        : 'idle'
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
      <span className="shrink-0 w-2.5 text-center leading-none select-none">
        <AgentStatusGlyph status={status} size={3.5} />
      </span>

      {/* Label + optional status text + optional chunk counter */}
      <span className="flex flex-col min-w-0">
        <span className="lowercase leading-tight">{agent.label}</span>
        {hasStatus && statusText && (
          <span className="font-mono text-[10px] tracking-[0.02em] text-luna-fg-4 leading-tight truncate max-w-[170px] mt-0.5">
            {statusText}
          </span>
        )}
        {showChunkCount && (
          <span className="font-mono text-[10px] text-luna-fg-4 leading-tight mt-0.5 tabular-nums">
            {chunkCount} tokens
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
  chunkCounts = {},
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
            chunkCount={chunkCounts[agent.id]}
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
