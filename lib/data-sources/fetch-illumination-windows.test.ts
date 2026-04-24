import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchIlluminationWindows } from './fetch-illumination-windows'

vi.mock('@/lib/svs-cache', () => ({
  getSvsData: vi.fn(),
}))

const FAKE_NOW = new Date('2026-04-22T00:00:00Z')

function litEntry(timeStr: string) {
  return {
    time: timeStr,
    phase: 100,
    age: 0,
    diameter: 1800,
    distance: 384400,
    j2000: { ra: 0, dec: 0 },
    subsolar: { lon: 0, lat: 0 },
    subearth: { lon: 0, lat: 0 },
    posangle: 0,
  }
}

function darkEntry(timeStr: string) {
  return {
    ...litEntry(timeStr),
    subsolar: { lon: 180, lat: 0 },
  }
}

describe('fetchIlluminationWindows', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FAKE_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('happy path: returns sorted illumination windows within 30-day window', async () => {
    const { getSvsData } = await import('@/lib/svs-cache')
    vi.mocked(getSvsData).mockResolvedValue([
      litEntry('24 Apr 2026 12:00 UT'),
      litEntry('22 Apr 2026 12:00 UT'),
      litEntry('23 Apr 2026 12:00 UT'),
    ])

    const result = await fetchIlluminationWindows(0, 0)
    expect(Array.isArray(result)).toBe(true)
    const r0 = result[0]
    const r1 = result[1]
    const r2 = result[2]
    if (!r0 || !r1 || !r2) return
    expect(r0.date).toBe('2026-04-22')
    expect(r1.date).toBe('2026-04-23')
    expect(r2.date).toBe('2026-04-24')
  })

  it('lit location: illuminatedHours > 0, sunriseUtc and sunsetUtc populated', async () => {
    const { getSvsData } = await import('@/lib/svs-cache')
    vi.mocked(getSvsData).mockResolvedValue([
      litEntry('22 Apr 2026 10:00 UT'),
      litEntry('22 Apr 2026 11:00 UT'),
      litEntry('22 Apr 2026 12:00 UT'),
    ])

    const result = await fetchIlluminationWindows(0, 0)
    expect(result).toHaveLength(1)
    const w = result[0]
    if (!w) return
    expect(w.illuminatedHours).toBe(3)
    expect(w.sunriseUtc).toBe('2026-04-22T10:00:00.000Z')
    expect(w.sunsetUtc).toBe('2026-04-22T12:00:00.000Z')
    expect(w.permanentlyShadowed).toBe(false)
  })

  it('permanently shadowed polar case: permanentlyShadowed true, nulls sunrise/sunset', async () => {
    const { getSvsData } = await import('@/lib/svs-cache')
    vi.mocked(getSvsData).mockResolvedValue([
      darkEntry('22 Apr 2026 10:00 UT'),
      darkEntry('22 Apr 2026 11:00 UT'),
    ])

    const result = await fetchIlluminationWindows(0, 0)
    expect(result).toHaveLength(1)
    const w = result[0]
    if (!w) return
    expect(w.illuminatedHours).toBe(0)
    expect(w.permanentlyShadowed).toBe(true)
    expect(w.sunriseUtc).toBeNull()
    expect(w.sunsetUtc).toBeNull()
  })

  it('getSvsData throws → error propagates', async () => {
    const { getSvsData } = await import('@/lib/svs-cache')
    vi.mocked(getSvsData).mockRejectedValue(new Error('SVS fetch failed'))

    await expect(fetchIlluminationWindows(0, 0)).rejects.toThrow('SVS fetch failed')
  })

  it('excludes entries outside 30-day window', async () => {
    const { getSvsData } = await import('@/lib/svs-cache')
    vi.mocked(getSvsData).mockResolvedValue([
      litEntry('21 Apr 2026 12:00 UT'),
      litEntry('22 Apr 2026 12:00 UT'),
      litEntry('22 May 2026 00:00 UT'),
    ])

    const result = await fetchIlluminationWindows(0, 0)
    expect(result).toHaveLength(1)
    const first = result[0]
    if (!first) return
    expect(first.date).toBe('2026-04-22')
  })
})
