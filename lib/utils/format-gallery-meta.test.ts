import { describe, it, expect } from 'vitest'
import { formatShortCaption, formatExpandedCaption } from './format-gallery-meta'
import { formatShortDate } from './date'

describe('formatShortDate', () => {
  it('returns "Mar 2024" for 2024-03-15T00:00:00Z', () => {
    expect(formatShortDate('2024-03-15T00:00:00Z')).toBe('Mar 2024')
  })
  it('returns "Jan 2020" for 2020-01-01T00:00:00Z', () => {
    expect(formatShortDate('2020-01-01T00:00:00Z')).toBe('Jan 2020')
  })
  it('handles date-only strings', () => {
    expect(formatShortDate('2023-07-04')).toBe('Jul 2023')
  })
})

describe('formatShortCaption', () => {
  it('joins instrument and short date with · separator', () => {
    expect(formatShortCaption('LROC NAC', '2024-03-15T00:00:00Z')).toBe('LROC NAC · Mar 2024')
  })
  it('omits Unknown instrument', () => {
    expect(formatShortCaption('Unknown instrument', '2024-03-15T00:00:00Z')).toBe('Mar 2024')
  })
  it('omits missing date', () => {
    expect(formatShortCaption('Apollo', '')).toBe('Apollo')
  })
  it('returns empty string when both missing', () => {
    expect(formatShortCaption('Unknown instrument', '')).toBe('')
  })
})

describe('formatExpandedCaption', () => {
  it('produces full caption in order: assetId · instrument · long date', () => {
    expect(formatExpandedCaption('M1334189784LE', 'LROC NAC', '2024-03-15T00:00:00Z'))
      .toBe('M1334189784LE · LROC NAC · March 15, 2024')
  })
  it('omits Unknown instrument in expanded caption', () => {
    expect(formatExpandedCaption('AS11-40-5931', 'Unknown instrument', '1969-07-20T00:00:00Z'))
      .toBe('AS11-40-5931 · July 20, 1969')
  })
  it('handles missing date', () => {
    expect(formatExpandedCaption('ABC123', 'GRAIL', '')).toBe('ABC123 · GRAIL')
  })
})
