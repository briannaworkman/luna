import { describe, it, expect } from 'vitest'
import type { NasaImage } from '@/lib/types/agent'
import {
  buildPerImagePrompt,
  buildSynthesisPrompt,
  IMAGERY_SYSTEM_PROMPT,
  IMAGERY_SYNTHESIS_SYSTEM_PROMPT,
} from './imagery-prompt'
import type { DataContext } from '@/lib/types/agent'

const fakeLocation: DataContext['location'] = {
  name: 'Tycho',
  lat: -43,
  lon: -11,
  diameterKm: 85,
  significanceNote: 'Most prominent young crater',
  isProposed: false,
}

function makeImage(assetId: string): NasaImage {
  return {
    assetId,
    thumbUrl: `https://example.com/${assetId}/thumb.jpg`,
    fullUrl: `https://example.com/${assetId}/full.jpg`,
    instrument: 'LRO WAC',
    date: '2012-01-15T00:00:00Z',
    nasaUrl: `https://images.nasa.gov/details/${assetId}`,
  }
}

describe('buildPerImagePrompt', () => {
  it('single image (total === 1) — headerLine does NOT contain "Image 1 of 1"', () => {
    const image = makeImage('AS16-M-0273')
    const result = buildPerImagePrompt({ location: fakeLocation, image, index: 1, total: 1 })
    expect(result.headerLine).not.toContain('Image 1 of 1')
  })

  it('multi-image (total === 3, index === 2) — headerLine contains "Image 2 of 3"', () => {
    const image = makeImage('AS17-M-1234')
    const result = buildPerImagePrompt({ location: fakeLocation, image, index: 2, total: 3 })
    expect(result.headerLine).toContain('Image 2 of 3')
  })

  it('headerLine contains assetId, instrument, and date', () => {
    const image = makeImage('LRO-NAC-M123456789')
    const result = buildPerImagePrompt({ location: fakeLocation, image, index: 1, total: 2 })
    expect(result.headerLine).toContain('LRO-NAC-M123456789')
    expect(result.headerLine).toContain('LRO WAC')
    expect(result.headerLine).toContain('2012-01-15T00:00:00Z')
  })
})

describe('buildSynthesisPrompt', () => {
  it('user block contains image count AND all assetIds', () => {
    const images = [makeImage('IMG-001'), makeImage('IMG-002'), makeImage('IMG-003')]
    const result = buildSynthesisPrompt({ location: fakeLocation, images })
    expect(result.user).toContain('SYNTHESIZE ACROSS 3 IMAGES')
    expect(result.user).toContain('IMG-001')
    expect(result.user).toContain('IMG-002')
    expect(result.user).toContain('IMG-003')
  })
})

describe('IMAGERY_SYSTEM_PROMPT', () => {
  it('contains required geological terms and citation format', () => {
    // The prompt describes crater morphology as "note their morphology (simple bowl..."
    expect(IMAGERY_SYSTEM_PROMPT).toContain('their morphology')
    expect(IMAGERY_SYSTEM_PROMPT).toContain('ejecta')
    // Section 5 header uses title case: "Albedo variations"
    expect(IMAGERY_SYSTEM_PROMPT).toContain('Albedo')
    expect(IMAGERY_SYSTEM_PROMPT).toContain('[CITE: assetId]')
  })
})

describe('IMAGERY_SYNTHESIS_SYSTEM_PROMPT', () => {
  it('contains synthesis, citation format, and contradictions', () => {
    expect(IMAGERY_SYNTHESIS_SYSTEM_PROMPT.toLowerCase()).toContain('synthesis')
    expect(IMAGERY_SYNTHESIS_SYSTEM_PROMPT).toContain('[CITE:')
    expect(IMAGERY_SYNTHESIS_SYSTEM_PROMPT.toLowerCase()).toContain('contradictions')
  })
})
