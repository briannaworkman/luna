import { cn } from '@/lib/utils'

export type AgentStatus = 'active' | 'complete' | 'error' | 'idle'

interface AgentStatusGlyphProps {
  status: AgentStatus
  /** Size in Tailwind units — applied as wN hN to the pulse ring. Defaults to 4. */
  size?: 3.5 | 4
}

export function AgentStatusGlyph({ status, size = 4 }: AgentStatusGlyphProps) {
  const ringClass = size === 3.5 ? 'w-3.5 h-3.5' : 'w-4 h-4'

  if (status === 'active') {
    return (
      <span
        className={cn('relative inline-flex items-center justify-center', ringClass)}
        aria-hidden="true"
      >
        <span className="absolute inset-0 rounded-full bg-luna-cyan animate-luna-pulse" />
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

  return (
    <span className="font-mono text-[14px] text-luna-hairline-2 leading-none" aria-hidden="true">
      ○
    </span>
  )
}
