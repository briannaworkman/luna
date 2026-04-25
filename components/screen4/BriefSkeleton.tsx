import { Loader2 } from 'lucide-react'

export function BriefSkeleton() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-24"
      role="status"
      aria-label="Synthesizing brief"
    >
      <Loader2
        size={20}
        strokeWidth={1.5}
        className="text-luna-cyan animate-spin"
        aria-hidden="true"
      />
      <span className="font-mono text-[13px] text-luna-fg-4">
        Synthesizing brief…
      </span>
    </div>
  )
}
