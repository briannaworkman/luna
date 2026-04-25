import { describe, it, expect } from 'vitest'
import { filterLocations } from './filterLocations'
import type { LunarLocation } from '@/components/globe/types'

function makeLocation(overrides: Partial<LunarLocation>): LunarLocation {
  return {
    id: 'test',
    name: 'Test',
    lat: 0,
    lon: 0,
    significance: 'sig',
    isProposed: false,
    coords: '0°N, 0°W',
    region: 'NEAR SIDE',
    type: 'crater',
    suggestedQuestions: ['q1', 'q2', 'q3'],
    ...overrides,
  }
}

const locations: LunarLocation[] = [
  makeLocation({ id: 'a', type: 'crater' }),
  makeLocation({ id: 'b', type: 'apollo' }),
  makeLocation({ id: 'c', type: 'robotic' }),
  makeLocation({ id: 'd', type: 'proposed', isProposed: true }),
]

describe('filterLocations', () => {
  it('returns all locations when filter is "all"', () => {
    expect(filterLocations(locations, 'all')).toHaveLength(4)
  })

  it('returns only craters when filter is "crater"', () => {
    const result = filterLocations(locations, 'crater')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('a')
  })

  it('returns only apollo when filter is "apollo"', () => {
    const result = filterLocations(locations, 'apollo')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('b')
  })

  it('returns only robotic when filter is "robotic"', () => {
    const result = filterLocations(locations, 'robotic')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('c')
  })

  it('returns only proposed when filter is "proposed"', () => {
    const result = filterLocations(locations, 'proposed')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('d')
  })

  it('returns empty array when no locations match', () => {
    expect(filterLocations([], 'crater')).toHaveLength(0)
  })

  it('"all" filter returns locations in original order', () => {
    const result = filterLocations(locations, 'all')
    expect(result.map(l => l.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('"all" filter returns the same array reference', () => {
    expect(filterLocations(locations, 'all')).toBe(locations)
  })
})
