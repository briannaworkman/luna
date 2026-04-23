import { cn } from '@/lib/utils'
import { AGENTS } from '@/lib/constants/agents'
import type { Agent } from '@/lib/constants/agents'

function AgentRow({ agent }: { agent: Agent }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-luna-fg-3 text-[11px] leading-none select-none"
        aria-hidden="true"
      >
        ○
      </span>
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 leading-none">
        {agent.label}
      </span>
    </div>
  )
}

export function AgentRail({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'flex flex-col',
        'w-[180px] shrink-0',
        'px-4 py-4',
        className,
      )}
      aria-label="Agent status rail"
    >
      {AGENTS.map((agent) => (
        <AgentRow key={agent.id} agent={agent} />
      ))}
    </aside>
  )
}
