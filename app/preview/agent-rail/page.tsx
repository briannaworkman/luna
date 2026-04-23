import { notFound } from 'next/navigation'
import { AgentRail } from '@/components/agent-rail/AgentRail'

/**
 * DEV PREVIEW — delete this file when PR 3 (Screen 2) is merged.
 * Visit http://localhost:3000/preview/agent-rail to review.
 */
export default function AgentRailPreview() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="min-h-screen bg-luna-base flex items-start gap-0 p-12">
      <div className="border-r border-luna-hairline h-screen pr-0">
        <AgentRail />
      </div>
      <div className="flex-1 p-8">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
          Query composer mounts here (PR 3)
        </p>
      </div>
    </div>
  )
}
