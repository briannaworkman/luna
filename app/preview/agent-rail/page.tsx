import { notFound } from 'next/navigation'
import { AgentRail } from '@/components/agent-rail/AgentRail'
import type { AgentId } from '@/lib/constants/agents'

/**
 * DEV PREVIEW — visual regression reference for AgentRail states.
 * Updated in PR 4 to show idle / active+status / complete+error combos.
 * Visit http://localhost:3000/preview/agent-rail to review.
 */
export default function AgentRailPreview() {
  if (process.env.NODE_ENV === 'production') notFound()

  const activeSet = new Set<AgentId>(['imagery', 'mineralogy'])
  const completedSet = new Set<AgentId>(['orbit', 'data-ingest'])
  const errorSet = new Set<AgentId>(['thermal'])
  const statusTexts: Partial<Record<AgentId, string>> = {
    imagery: 'Fetching LROC NAC products…',
    mineralogy: 'Querying JSC sample database…',
  }

  return (
    <div className="min-h-screen bg-luna-base p-12">
      <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4 mb-8">
        Agent Rail — visual state preview
      </div>

      <div className="flex gap-8 items-start flex-wrap">
        {/* 1. All idle (default) */}
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10px] text-luna-fg-4 uppercase tracking-wider mb-1">
            All idle
          </div>
          <AgentRail />
        </div>

        {/* 2. Active agents with status texts */}
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10px] text-luna-fg-4 uppercase tracking-wider mb-1">
            Active + status texts
          </div>
          <AgentRail
            activeAgents={activeSet}
            statusTexts={statusTexts}
            footerActiveCount={activeSet.size}
          />
        </div>

        {/* 3. Mixed: completed + error */}
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10px] text-luna-fg-4 uppercase tracking-wider mb-1">
            Complete + error
          </div>
          <AgentRail
            completedAgents={completedSet}
            errorAgents={errorSet}
            footerActiveCount={0}
          />
        </div>
      </div>
    </div>
  )
}
