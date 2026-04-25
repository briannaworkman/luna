import { describe, it, expect } from 'vitest'
import { COMPLETENESS_LANDING_URLS } from '../completenessUrls'
import { COMPLETENESS_SOURCES } from '@/lib/types/brief'

describe('COMPLETENESS_LANDING_URLS', () => {
  it('has exactly 5 keys matching COMPLETENESS_SOURCES', () => {
    const keys = Object.keys(COMPLETENESS_LANDING_URLS)
    expect(keys).toHaveLength(5)
    for (const source of COMPLETENESS_SOURCES) {
      expect(keys).toContain(source)
    }
  })

  it('all URLs start with https://', () => {
    for (const [source, url] of Object.entries(COMPLETENESS_LANDING_URLS)) {
      expect(url, `${source} URL should start with https://`).toMatch(/^https:\/\//)
    }
  })

  it('SVS Illumination URL points to SVS dataset 5587', () => {
    expect(COMPLETENESS_LANDING_URLS['SVS Illumination']).toContain('svs.gsfc.nasa.gov/5587')
  })

  it('JSC Samples URL points to JSC lunar curator', () => {
    expect(COMPLETENESS_LANDING_URLS['JSC Samples']).toContain('curator.jsc.nasa.gov')
  })

  it('NASA Image Library URL points to images.nasa.gov', () => {
    expect(COMPLETENESS_LANDING_URLS['NASA Image Library']).toContain('images.nasa.gov')
  })
})
