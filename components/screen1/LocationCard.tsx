'use client'

import { cn } from '@/lib/utils'
import type { LunarLocation } from '@/components/globe/types'

function RegionBadge({ region }: { region: string }) {
  const isNear = region.toUpperCase() === 'NEAR SIDE'
  return (
    <span
      className={cn(
        'font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm',
        isNear
          ? 'bg-luna-success/10 text-luna-success'
          : 'bg-luna-violet/10 text-luna-violet',
      )}
    >
      {isNear ? 'Near' : 'Far side'}
    </span>
  )
}

function TypeBadge({ location }: { location: LunarLocation }) {
  if (location.type === 'proposed') {
    return (
      <span className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm bg-luna-warning/10 text-luna-warning">
        proposed
      </span>
    )
  }
  const labels: Record<string, string> = {
    crater: 'Crater',
    apollo: 'Apollo',
    robotic: 'Robotic',
  }
  return (
    <span className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm bg-luna-base-3 text-luna-fg-3 border border-luna-hairline">
      {labels[location.type] ?? location.type}
    </span>
  )
}

interface LocationCardProps {
  location: LunarLocation
  onClick: (location: LunarLocation) => void
}

export function LocationCard({ location, onClick }: LocationCardProps) {
  const displayName = location.missionName
    ? `${location.missionName} — ${location.name}`
    : location.name

  return (
    <button
      type="button"
      onClick={() => onClick(location)}
      className="text-left w-full bg-luna-base-2 border border-luna-hairline rounded-lg p-3.5 hover:border-luna-cyan/30 hover:bg-luna-base-3 transition-colors"
    >
      <div className="text-sm font-medium text-luna-fg leading-snug mb-1.5">
        {displayName}
      </div>
      <div className="text-[12px] text-luna-fg-3 leading-snug mb-2.5 line-clamp-2">
        {location.significance}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <RegionBadge region={location.region} />
        <TypeBadge location={location} />
      </div>
    </button>
  )
}
