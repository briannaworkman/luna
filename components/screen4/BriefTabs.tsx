'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type BriefTab = 'topic' | 'agent'

interface BriefTabsProps {
  children: (activeTab: BriefTab) => React.ReactNode
}

const TABS: { id: BriefTab; label: string }[] = [
  { id: 'topic', label: 'By topic' },
  { id: 'agent', label: 'By agent' },
]

export function BriefTabs({ children }: BriefTabsProps) {
  const [activeTab, setActiveTab] = useState<BriefTab>('topic')

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div
        className="flex gap-0 border-b border-luna-hairline"
        role="tablist"
        aria-label="Brief view options"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`brief-tab-panel-${id}`}
            id={`brief-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={cn(
              'px-4 pb-2.5 pt-1 font-sans text-[13px] font-medium',
              'border-b-2 -mb-px transition-colors',
              activeTab === id
                ? 'border-luna-cyan text-luna-fg'
                : 'border-transparent text-luna-fg-3 hover:text-luna-fg-2',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`brief-tab-panel-${activeTab}`}
        aria-labelledby={`brief-tab-${activeTab}`}
        className="pt-6"
      >
        {children(activeTab)}
      </div>
    </div>
  )
}
