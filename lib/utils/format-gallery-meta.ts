import { formatDate, formatShortDate } from '@/lib/utils/date'

export function formatShortCaption(instrument: string, date: string): string {
  const parts: string[] = []
  if (instrument && instrument !== 'Unknown instrument') parts.push(instrument)
  if (date) parts.push(formatShortDate(date))
  return parts.join(' · ')
}

export function formatExpandedCaption(assetId: string, instrument: string, date: string): string {
  const parts: string[] = []
  if (assetId) parts.push(assetId)
  if (instrument && instrument !== 'Unknown instrument') parts.push(instrument)
  if (date) parts.push(formatDate(date))
  return parts.join(' · ')
}
