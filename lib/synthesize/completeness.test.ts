import { describe, it, expect } from 'vitest'
import { deriveDataCompleteness } from './completeness'
import type { DataContext } from '@/lib/types/agent'
import type { LrocProduct } from '@/lib/types/nasa'

function makeNacProduct(n: number): LrocProduct[] {
  return Array.from({ length: n }, (_, i) => ({
    productId: `NAC-${i}`,
    resolutionMpp: 0.5,
    acquisitionDate: '2024-01-01',
    downloadUrl: 'https://example.com',
    instrument: 'LROC NAC',
  }))
}

function makeWacProduct(n: number): LrocProduct[] {
  return Array.from({ length: n }, (_, i) => ({
    productId: `WAC-${i}`,
    resolutionMpp: 100,
    acquisitionDate: '2024-01-01',
    downloadUrl: 'https://example.com',
    instrument: 'LROC WAC',
  }))
}

const baseLocation = {
  name: 'Tycho',
  lat: -43,
  lon: -11,
  diameterKm: 85,
  significanceNote: 'Young crater',
  isProposed: false,
}

function makeCtx(overrides: Partial<DataContext>): DataContext {
  return {
    location: baseLocation,
    nasaImages: [],
    lrocProducts: [],
    jscSamples: [],
    illuminationWindows: [],
    ...overrides,
  }
}

describe('deriveDataCompleteness', () => {
  describe('all null → all Incomplete', () => {
    it('returns Incomplete for all sources when all are null', () => {
      const result = deriveDataCompleteness(
        makeCtx({
          nasaImages: null,
          lrocProducts: null,
          jscSamples: null,
          illuminationWindows: null,
        }),
      )
      expect(result['LROC NAC']).toBe('Incomplete')
      expect(result['LROC WAC']).toBe('Incomplete')
      expect(result['JSC Samples']).toBe('Incomplete')
      expect(result['SVS Illumination']).toBe('Incomplete')
      expect(result['NASA Image Library']).toBe('Incomplete')
    })
  })

  describe('all populated with enough data → all Confirmed', () => {
    it('returns Confirmed for all sources with sufficient data', () => {
      const result = deriveDataCompleteness(
        makeCtx({
          nasaImages: Array.from({ length: 3 }, (_, i) => ({
            assetId: `img-${i}`,
            thumbUrl: '',
            fullUrl: '',
            instrument: 'Camera',
            date: '2024-01-01',
            nasaUrl: 'https://example.com',
          })),
          lrocProducts: [...makeNacProduct(2), ...makeWacProduct(1)],
          jscSamples: Array.from({ length: 3 }, (_, i) => ({
            sampleId: `s-${i}`,
            mission: 'Apollo 17',
            station: 'A',
            weightGrams: 10,
            mineralFlags: [],
            description: null,
            jscUrl: 'https://example.com',
          })),
          illuminationWindows: Array.from({ length: 7 }, (_, i) => ({
            date: `2024-01-0${i + 1}`,
            sunriseUtc: null,
            sunsetUtc: null,
            illuminatedHours: 8,
            solarElevationDeg: 15,
            permanentlyShadowed: false,
          })),
        }),
      )
      expect(result['LROC NAC']).toBe('Confirmed')
      expect(result['LROC WAC']).toBe('Confirmed')
      expect(result['JSC Samples']).toBe('Confirmed')
      expect(result['SVS Illumination']).toBe('Confirmed')
      expect(result['NASA Image Library']).toBe('Confirmed')
    })
  })

  describe('NAC vs WAC instrument distinction', () => {
    it('counts NAC and WAC products separately', () => {
      // 2 NAC, 0 WAC → NAC Confirmed, WAC Analogue only
      const result1 = deriveDataCompleteness(makeCtx({ lrocProducts: makeNacProduct(2) }))
      expect(result1['LROC NAC']).toBe('Confirmed')
      expect(result1['LROC WAC']).toBe('Analogue only')

      // 0 NAC, 1 WAC → NAC Analogue only, WAC Confirmed
      const result2 = deriveDataCompleteness(makeCtx({ lrocProducts: makeWacProduct(1) }))
      expect(result2['LROC NAC']).toBe('Analogue only')
      expect(result2['LROC WAC']).toBe('Confirmed')
    })

    it('handles mixed case instrument labels (case-insensitive)', () => {
      const mixedCase: LrocProduct[] = [
        { productId: 'p1', resolutionMpp: 0.5, acquisitionDate: '2024-01-01', downloadUrl: '', instrument: 'lroc nac' },
        { productId: 'p2', resolutionMpp: 0.5, acquisitionDate: '2024-01-01', downloadUrl: '', instrument: 'lroc nac' },
        { productId: 'p3', resolutionMpp: 100, acquisitionDate: '2024-01-01', downloadUrl: '', instrument: 'LROC WAC' },
      ]
      const result = deriveDataCompleteness(makeCtx({ lrocProducts: mixedCase }))
      expect(result['LROC NAC']).toBe('Confirmed') // ≥2
      expect(result['LROC WAC']).toBe('Confirmed') // ≥1
    })
  })

  describe('NAC threshold boundaries', () => {
    it('returns Analogue only when NAC count is 0', () => {
      const result = deriveDataCompleteness(makeCtx({ lrocProducts: [] }))
      expect(result['LROC NAC']).toBe('Analogue only')
    })

    it('returns Partial when NAC count is 1', () => {
      const result = deriveDataCompleteness(makeCtx({ lrocProducts: makeNacProduct(1) }))
      expect(result['LROC NAC']).toBe('Partial')
    })

    it('returns Confirmed when NAC count is 2', () => {
      const result = deriveDataCompleteness(makeCtx({ lrocProducts: makeNacProduct(2) }))
      expect(result['LROC NAC']).toBe('Confirmed')
    })
  })

  describe('JSC Samples threshold boundaries', () => {
    it('returns Analogue only when samples array is empty', () => {
      const result = deriveDataCompleteness(makeCtx({ jscSamples: [] }))
      expect(result['JSC Samples']).toBe('Analogue only')
    })

    it('returns Partial when samples count is 1', () => {
      const result = deriveDataCompleteness(makeCtx({
        jscSamples: [{ sampleId: 's1', mission: 'A', station: 'A', weightGrams: 1, mineralFlags: [], description: null, jscUrl: '' }],
      }))
      expect(result['JSC Samples']).toBe('Partial')
    })

    it('returns Partial when samples count is 2', () => {
      const result = deriveDataCompleteness(makeCtx({
        jscSamples: [
          { sampleId: 's1', mission: 'A', station: 'A', weightGrams: 1, mineralFlags: [], description: null, jscUrl: '' },
          { sampleId: 's2', mission: 'A', station: 'A', weightGrams: 1, mineralFlags: [], description: null, jscUrl: '' },
        ],
      }))
      expect(result['JSC Samples']).toBe('Partial')
    })

    it('returns Confirmed when samples count is 3', () => {
      const result = deriveDataCompleteness(makeCtx({
        jscSamples: Array.from({ length: 3 }, (_, i) => ({
          sampleId: `s${i}`,
          mission: 'A',
          station: 'A',
          weightGrams: 1,
          mineralFlags: [],
          description: null,
          jscUrl: '',
        })),
      }))
      expect(result['JSC Samples']).toBe('Confirmed')
    })
  })

  describe('SVS Illumination threshold boundaries', () => {
    const makeWindows = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        sunriseUtc: null,
        sunsetUtc: null,
        illuminatedHours: 8,
        solarElevationDeg: 15,
        permanentlyShadowed: false,
      }))

    it('returns Analogue only when windows array is empty', () => {
      expect(deriveDataCompleteness(makeCtx({ illuminationWindows: [] }))['SVS Illumination']).toBe('Analogue only')
    })

    it('returns Partial when windows count is 1', () => {
      expect(deriveDataCompleteness(makeCtx({ illuminationWindows: makeWindows(1) }))['SVS Illumination']).toBe('Partial')
    })

    it('returns Partial when windows count is 6', () => {
      expect(deriveDataCompleteness(makeCtx({ illuminationWindows: makeWindows(6) }))['SVS Illumination']).toBe('Partial')
    })

    it('returns Confirmed when windows count is 7', () => {
      expect(deriveDataCompleteness(makeCtx({ illuminationWindows: makeWindows(7) }))['SVS Illumination']).toBe('Confirmed')
    })
  })

  describe('NASA Image Library threshold boundaries', () => {
    const makeImages = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        assetId: `img-${i}`,
        thumbUrl: '',
        fullUrl: '',
        instrument: 'Camera',
        date: '2024-01-01',
        nasaUrl: '',
      }))

    it('returns Analogue only when images array is empty', () => {
      expect(deriveDataCompleteness(makeCtx({ nasaImages: [] }))['NASA Image Library']).toBe('Analogue only')
    })

    it('returns Partial when images count is 1', () => {
      expect(deriveDataCompleteness(makeCtx({ nasaImages: makeImages(1) }))['NASA Image Library']).toBe('Partial')
    })

    it('returns Partial when images count is 2', () => {
      expect(deriveDataCompleteness(makeCtx({ nasaImages: makeImages(2) }))['NASA Image Library']).toBe('Partial')
    })

    it('returns Confirmed when images count is 3', () => {
      expect(deriveDataCompleteness(makeCtx({ nasaImages: makeImages(3) }))['NASA Image Library']).toBe('Confirmed')
    })
  })

  describe('empty arrays vs null', () => {
    it('treats empty array as Analogue only (not Incomplete)', () => {
      const result = deriveDataCompleteness(makeCtx({
        lrocProducts: [],
        jscSamples: [],
        illuminationWindows: [],
        nasaImages: [],
      }))
      expect(result['LROC NAC']).toBe('Analogue only')
      expect(result['LROC WAC']).toBe('Analogue only')
      expect(result['JSC Samples']).toBe('Analogue only')
      expect(result['SVS Illumination']).toBe('Analogue only')
      expect(result['NASA Image Library']).toBe('Analogue only')
    })

    it('treats null as Incomplete (not Analogue only)', () => {
      const result = deriveDataCompleteness(makeCtx({
        lrocProducts: null,
        jscSamples: null,
        illuminationWindows: null,
        nasaImages: null,
      }))
      expect(result['LROC NAC']).toBe('Incomplete')
      expect(result['LROC WAC']).toBe('Incomplete')
      expect(result['JSC Samples']).toBe('Incomplete')
      expect(result['SVS Illumination']).toBe('Incomplete')
      expect(result['NASA Image Library']).toBe('Incomplete')
    })
  })
})
