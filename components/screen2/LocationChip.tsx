'use client'
import { cn } from '@/lib/utils'
import { displayLocationName, formatCoordinates } from '@/lib/utils/location'
import type { LunarLocation } from '@/components/globe/types'

export function LocationChip({ location, className }: { location: LunarLocation; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-2',
        'bg-luna-base-2 border border-luna-hairline rounded px-3 py-1.5',
        'select-text',
        className,
      )}
    >
      <span className="font-sans text-[14px] text-luna-fg">{displayLocationName(location)}</span>
      <span className="text-luna-fg-4 text-[11px]">·</span>
      <span className="font-mono text-[11px] text-luna-cyan tracking-[0.02em]">
        {formatCoordinates(location.lat, location.lon)}
      </span>
    </div>
  )
}
