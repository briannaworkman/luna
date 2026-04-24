import type { DataContext } from '@/lib/types/agent'

/**
 * Shared LOCATION header block used by every prose specialist prompt.
 * Keeping this consistent across agents gives the orchestrator one
 * canonical shape for location framing — if we tweak wording (e.g.
 * significance formatting), all specialists stay in sync.
 *
 * Output is exactly 5 lines and a trailing newline so callers can
 * concatenate their own agent-specific blocks below.
 */
export function buildLocationHeader(location: DataContext['location']): string {
  return `LOCATION
Name: ${location.name}${location.isProposed ? ' (proposed name, pending IAU approval)' : ''}
Coordinates: ${location.lat}°, ${location.lon}°
Diameter: ${location.diameterKm !== null ? location.diameterKm + ' km' : 'unknown'}
Significance: ${location.significanceNote}
`
}
