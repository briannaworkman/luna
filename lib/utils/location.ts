import type { LunarLocation } from '@/components/globe/types'

function formatDeg(val: number): string {
  const abs = Math.abs(val)
  return Number.isInteger(abs) ? abs.toString() : abs.toFixed(2)
}

export function formatLat(lat: number): string {
  return `${formatDeg(lat)}°${lat >= 0 ? 'N' : 'S'}`
}

export function formatLon(lon: number): string {
  return `${formatDeg(lon)}°${lon >= 0 ? 'E' : 'W'}`
}

export function formatCoordinates(lat: number, lon: number): string {
  return `${formatLat(lat)} ${formatLon(lon)}`
}

export function displayLocationName(location: LunarLocation): string {
  return location.isProposed ? `${location.name} (proposed)` : location.name
}
