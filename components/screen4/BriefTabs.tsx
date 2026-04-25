'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type BriefTab = 'overview' | 'breakdown'
export type BreakdownView = 'topic' | 'agent'

interface BriefTabsProps {
  /** Render-prop receives the active top-level tab and the active breakdown sub-view. */
  children: (activeTab: BriefTab, breakdownView: BreakdownView) => React.ReactNode
}

const TABS: { id: BriefTab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'breakdown', label: 'Breakdown' },
]

const BREAKDOWN_VIEWS: { id: BreakdownView; label: string }[] = [
  { id: 'topic', label: 'By topic' },
  { id: 'agent', label: 'By agent' },
]

export function BriefTabs({ children }: BriefTabsProps) {
  const [activeTab, setActiveTab] = useState<BriefTab>('overview')
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('topic')

  return (
    <div className="flex flex-col">
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

      <div
        role="tabpanel"
        id={`brief-tab-panel-${activeTab}`}
        aria-labelledby={`brief-tab-${activeTab}`}
        className="pt-6 flex flex-col gap-4"
      >
        {activeTab === 'breakdown' && (
          <div
            role="tablist"
            aria-label="Breakdown grouping"
            className="inline-flex self-start rounded-md border border-luna-hairline p-0.5 bg-luna-base-1"
          >
            {BREAKDOWN_VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={breakdownView === id}
                onClick={() => setBreakdownView(id)}
                className={cn(
                  'px-3 py-1 font-mono text-[11px] tracking-[0.06em] uppercase rounded transition-colors',
                  breakdownView === id
                    ? 'bg-luna-base-2 text-luna-fg'
                    : 'text-luna-fg-3 hover:text-luna-fg-2',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {children(activeTab, breakdownView)}
      </div>
    </div>
  )
}
