import { describe, it, expect } from 'vitest'
import { buildLocationHeader } from './buildLocationHeader'

describe('buildLocationHeader', () => {
  it('renders every field on its own line', () => {
    const out = buildLocationHeader({
      name: 'Tycho',
      lat: -43,
      lon: -11,
      diameterKm: 85,
      significanceNote: 'Bright ray crater',
      isProposed: false,
    })

    expect(out).toContain('LOCATION\n')
    expect(out).toContain('Name: Tycho\n')
    expect(out).toContain('Coordinates: -43°, -11°\n')
    expect(out).toContain('Diameter: 85 km\n')
    expect(out).toContain('Significance: Bright ray crater\n')
  })

  it('isProposed=true appends the IAU-pending suffix to the name line', () => {
    const out = buildLocationHeader({
      name: 'Carroll',
      lat: 18.84,
      lon: -86.51,
      diameterKm: null,
      significanceNote: 'Near the libration boundary',
      isProposed: true,
    })

    expect(out).toContain('Name: Carroll (proposed name, pending IAU approval)')
  })

  it('diameterKm=null renders as "unknown"', () => {
    const out = buildLocationHeader({
      name: 'Integrity',
      lat: 2.66,
      lon: -104.92,
      diameterKm: null,
      significanceNote: 'Far side',
      isProposed: true,
    })

    expect(out).toContain('Diameter: unknown\n')
  })
})
