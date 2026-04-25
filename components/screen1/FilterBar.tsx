'use client'

import { cn } from '@/lib/utils'
import type { LocationFilter } from './filterLocations'

const TABS: { label: string; value: LocationFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Craters & Basins', value: 'crater' },
  { label: 'Apollo', value: 'apollo' },
  { label: 'Robotic Landers', value: 'robotic' },
  { label: 'Proposed', value: 'proposed' },
]

interface FilterBarProps {
  activeFilter: LocationFilter
  onFilterChange: (filter: LocationFilter) => void
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex gap-1 overflow-x-auto flex-1 min-w-0">
      {TABS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onFilterChange(value)}
          className={cn(
            'font-mono text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded border whitespace-nowrap transition-colors',
            activeFilter === value
              ? 'text-luna-cyan border-luna-cyan bg-luna-cyan/[0.07]'
              : 'text-luna-fg-3 border-transparent hover:text-luna-fg-2 hover:bg-luna-base-3',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
