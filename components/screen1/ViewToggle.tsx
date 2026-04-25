'use client'

import { cn } from '@/lib/utils'

export type ViewMode = 'list' | 'globe'

interface ViewToggleProps {
  activeView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-luna-base-3 border border-luna-hairline rounded p-0.5 gap-0.5 flex-shrink-0">
      {(['list', 'globe'] as const).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
          className={cn(
            'font-mono text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded transition-colors',
            activeView === view
              ? 'bg-luna-cyan text-luna-base font-semibold'
              : 'text-luna-fg-3 hover:text-luna-fg-2',
          )}
        >
          {view}
        </button>
      ))}
    </div>
  )
}
