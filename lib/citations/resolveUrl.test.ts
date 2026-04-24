import { describe, it, expect } from 'vitest'
import { resolveUrl } from './resolveUrl'

describe('resolveUrl', () => {
  it('nasa-image happy path', () => {
    expect(resolveUrl('nasa-image', 'PIA12345')).toBe('https://images.nasa.gov/details/PIA12345')
  })

  it('jsc-sample happy path', () => {
    expect(resolveUrl('jsc-sample', '72135')).toBe(
      'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=72135',
    )
  })

  it('svs with SVS- prefix', () => {
    expect(resolveUrl('svs', 'SVS-5587')).toBe('https://svs.gsfc.nasa.gov/5587')
  })

  it('svs without prefix', () => {
    expect(resolveUrl('svs', '5587')).toBe('https://svs.gsfc.nasa.gov/5587')
  })

  it('svs with lowercase prefix', () => {
    expect(resolveUrl('svs', 'svs-5587')).toBe('https://svs.gsfc.nasa.gov/5587')
  })

  it('svs non-numeric after strip', () => {
    expect(resolveUrl('svs', 'SVS-abc')).toBeNull()
  })

  it('lroc always null', () => {
    expect(resolveUrl('lroc', 'M1234567890LE')).toBeNull()
  })

  it('empty id', () => {
    expect(resolveUrl('nasa-image', '')).toBeNull()
  })

  it('whitespace-only id', () => {
    expect(resolveUrl('nasa-image', '   ')).toBeNull()
  })

  it('id with surrounding whitespace trimmed', () => {
    const url = resolveUrl('jsc-sample', '  72135  ')
    expect(url).not.toBeNull()
    expect(url).toContain('72135')
  })

  it('nasa-image id with spaces is percent-encoded', () => {
    expect(resolveUrl('nasa-image', 'foo bar')).toBe('https://images.nasa.gov/details/foo%20bar')
  })

  it('jsc-sample id with query-injection payload is percent-encoded', () => {
    expect(resolveUrl('jsc-sample', '72135&evil=1')).toBe(
      'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=72135%26evil%3D1',
    )
  })
})
