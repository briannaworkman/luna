'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const activeLabel = TABS.find((t) => t.value === activeFilter)?.label ?? 'All'

  return (
    <>
      {/* Mobile: dropdown */}
      <div className="md:hidden flex-1 min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded border border-luna-cyan text-luna-cyan bg-luna-cyan/[0.07] whitespace-nowrap">
            {activeLabel}
            <ChevronDown className="h-3 w-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-luna-base-2 border-luna-base-3 min-w-[10rem]"
          >
            {TABS.map(({ label, value }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => onFilterChange(value)}
                className={cn(
                  'font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer',
                  activeFilter === value
                    ? 'text-luna-cyan focus:text-luna-cyan focus:bg-luna-cyan/[0.07]'
                    : 'text-luna-fg-3 focus:text-luna-fg-2 focus:bg-luna-base-3',
                )}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: tab strip */}
      <div className="hidden md:flex gap-1 flex-1 min-w-0">
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
    </>
  )
}
