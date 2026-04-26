'use client'

import { LocationCard } from './LocationCard'
import type { LunarLocation } from '@/components/globe/types'
import { Eyebrow } from '@/components/ui/eyebrow'

interface LocationListViewProps {
  locations: LunarLocation[]
  onLocationSelect: (location: LunarLocation) => void
}

export function LocationListView({ locations, onLocationSelect }: LocationListViewProps) {
  if (locations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Eyebrow as="p" className="text-luna-fg-3">
          No locations match this filter
        </Eyebrow>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 px-8 py-6 max-w-6xl mx-auto w-full">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            onClick={onLocationSelect}
          />
        ))}
      </div>
    </div>
  )
}
