import { describe, it, expect } from 'vitest'
import { getLocationById } from '../locations'

describe('getLocationById', () => {
  it('returns a known location by id', () => {
    const spa = getLocationById('spa')
    expect(spa?.id).toBe('spa')
    expect(spa?.name).toBe('South Pole-Aitken Basin')
  })

  it('returns a proposed location with isProposed flag preserved', () => {
    const carroll = getLocationById('carroll')
    expect(carroll?.id).toBe('carroll')
    expect(carroll?.isProposed).toBe(true)
  })

  it('returns null for an unknown id', () => {
    expect(getLocationById('does-not-exist')).toBeNull()
  })
})
