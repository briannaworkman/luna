import type { LunarLocation, LocationType } from '@/components/globe/types'

export type LocationFilter = 'all' | LocationType

export function filterLocations(
  locations: LunarLocation[],
  filter: LocationFilter,
): LunarLocation[] {
  if (filter === 'all') return locations
  return locations.filter((loc) => loc.type === filter)
}
