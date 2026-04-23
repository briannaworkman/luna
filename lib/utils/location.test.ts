import { describe, it, expect } from 'vitest'
import { formatCoordinates, formatLat, formatLon, displayLocationName } from './location'
import type { LunarLocation } from '@/components/globe/types'

const makeLocation = (overrides: Partial<LunarLocation> & Pick<LunarLocation, 'name' | 'isProposed'>): LunarLocation => ({
  id: 'test',
  lat: 0,
  lon: 0,
  significance: 'Test location',
  coords: '0°N, 0°E',
  region: 'NEAR SIDE',
  ...overrides,
})

describe('formatCoordinates', () => {
  it('formats north latitude and west longitude', () => {
    expect(formatCoordinates(18.84, -86.51)).toBe('18.84°N 86.51°W')
  })

  it('formats south latitude and west longitude with integer degrees', () => {
    expect(formatCoordinates(-56, -180)).toBe('56°S 180°W')
  })

  it('formats north latitude and west longitude (Integrity crater)', () => {
    expect(formatCoordinates(2.66, -104.92)).toBe('2.66°N 104.92°W')
  })

  it('formats zero latitude and zero longitude as N and E', () => {
    expect(formatCoordinates(0, 0)).toBe('0°N 0°E')
  })
})

describe('formatLat', () => {
  it('formats positive latitude with N suffix', () => {
    expect(formatLat(18.84)).toBe('18.84°N')
  })
  it('formats negative latitude with S suffix, using absolute value', () => {
    expect(formatLat(-56)).toBe('56°S')
  })
  it('formats zero as N', () => {
    expect(formatLat(0)).toBe('0°N')
  })
})

describe('formatLon', () => {
  it('formats positive longitude with E suffix', () => {
    expect(formatLon(62)).toBe('62°E')
  })
  it('formats negative longitude with W suffix, using absolute value', () => {
    expect(formatLon(-86.51)).toBe('86.51°W')
  })
  it('formats zero as E', () => {
    expect(formatLon(0)).toBe('0°E')
  })
})

describe('displayLocationName', () => {
  it('appends (proposed) when isProposed is true', () => {
    const location = makeLocation({ name: 'Carroll', isProposed: true })
    expect(displayLocationName(location)).toBe('Carroll (proposed)')
  })

  it('returns name as-is when isProposed is false', () => {
    const location = makeLocation({ name: 'Tycho', isProposed: false })
    expect(displayLocationName(location)).toBe('Tycho')
  })
})
