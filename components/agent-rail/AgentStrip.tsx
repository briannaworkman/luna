'use client'

import { AGENTS } from '@/lib/constants/agents'
import type { AgentId, Agent } from '@/lib/constants/agents'
import { AgentStatusGlyph } from './AgentStatusGlyph'
import type { AgentStatus } from './AgentStatusGlyph'

interface AgentStripProps {
  activeAgents?: Set<AgentId>
  completedAgents?: Set<AgentId>
  errorAgents?: Set<AgentId>
}

export function AgentStrip({
  activeAgents = new Set(),
  completedAgents = new Set(),
  errorAgents = new Set(),
}: AgentStripProps) {
  return (
    <div className="md:hidden flex overflow-x-auto bg-luna-base-2 border-b border-luna-hairline shrink-0">
      {AGENTS.map((agent: Agent) => {
        const status: AgentStatus = activeAgents.has(agent.id)
          ? 'active'
          : completedAgents.has(agent.id)
            ? 'complete'
            : errorAgents.has(agent.id)
              ? 'error'
              : 'idle'
        const isActive = status === 'active'
        const isComplete = status === 'complete'
        return (
          <div
            key={agent.id}
            className={[
              'flex items-center gap-1.5 px-3 py-2.5 border-r border-luna-hairline shrink-0',
              'font-mono text-[10px] tracking-[0.06em] uppercase',
              isActive ? 'text-luna-fg' : isComplete ? 'text-luna-fg-2' : 'text-luna-fg-4',
            ].join(' ')}
          >
            <AgentStatusGlyph status={status} size={3.5} />
            <span>{agent.label}</span>
          </div>
        )
      })}
    </div>
  )
}
