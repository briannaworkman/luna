import { cn } from '@/lib/utils'
import { AGENTS } from '@/lib/constants/agents'
import type { Agent } from '@/lib/constants/agents'

function AgentRow({ agent }: { agent: Agent }) {
  return (
    <div className="h-11 px-4 flex items-center gap-3 border-b border-luna-hairline font-sans font-normal text-[13px] text-luna-fg-3">
      <span
        className="w-2.5 text-center font-mono text-[14px] leading-none text-luna-hairline-2 select-none"
        aria-hidden="true"
      >
        ○
      </span>
      <span className="lowercase">{agent.label}</span>
    </div>
  )
}

export function AgentRail({ className }: { className?: string }) {
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
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="mt-auto px-4 pt-3.5 pb-5 border-t border-luna-hairline">
        <div className="font-mono text-[11px] tracking-[0.08em] text-luna-hairline-2">
          {AGENTS.length} agents
          <span className="mx-1.5">·</span>
          0 active
        </div>
      </div>
    </aside>
  )
}
