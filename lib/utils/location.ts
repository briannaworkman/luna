import type { LunarLocation } from '@/components/globe/types'

function formatDeg(val: number): string {
  const abs = Math.abs(val)
  return Number.isInteger(abs) ? abs.toString() : abs.toFixed(2)
}

export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${formatDeg(lat)}°${latDir} ${formatDeg(lon)}°${lonDir}`
}

export function displayLocationName(location: LunarLocation): string {
  return location.isProposed ? `${location.name} (proposed)` : location.name
}
