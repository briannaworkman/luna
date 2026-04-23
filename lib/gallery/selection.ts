import type { NasaImage } from '@/lib/types/nasa'

export const MAX_SELECTION = 4

export function continueLabel(count: number): string {
  if (count === 0) return 'Skip to query →'
  if (count === 1) return 'Continue with 1 image →'
  return `Continue with ${count} images →`
}

export function canSelectMore(selected: NasaImage[]): boolean {
  return selected.length < MAX_SELECTION
}

// Add if absent, remove if present. Caller ensures canSelectMore before add.
export function toggleSelection(selected: NasaImage[], image: NasaImage): NasaImage[] {
  const idx = selected.findIndex((i) => i.assetId === image.assetId)
  if (idx >= 0) return [...selected.slice(0, idx), ...selected.slice(idx + 1)]
  return [...selected, image]
}

export function removeFromSelection(selected: NasaImage[], assetId: string): NasaImage[] {
  return selected.filter((i) => i.assetId !== assetId)
}
