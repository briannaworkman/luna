import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPsrData } from './fetch-psr-data'

vi.mock('@/lib/utils/fetch-with-timeout', () => ({
  fetchJson: vi.fn(),
  TimeoutError: class TimeoutError extends Error {},
  UpstreamError: class UpstreamError extends Error {
    statusCode?: number
  },
}))

import { fetchJson } from '@/lib/utils/fetch-with-timeout'
const mockFetchJson = vi.mocked(fetchJson)

describe('fetchPsrData', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('returns lampProducts and psrSummary for Shackleton coordinates', async () => {
    mockFetchJson.mockResolvedValue({
      ODEResults: {
        Status: 'Success',
        Products: {
          Product: [
            {
              Product_name: 'lro_lamp_cdr_001.fits',
              Map_resolution: '100',
              Observation_time: '2010-01-01',
              External_url: 'https://example.com/lamp001.fits',
            },
          ],
        },
      },
    })

    const result = await fetchPsrData(-89.9, 0)
    expect(result.lampProducts).toHaveLength(1)
    expect(result.lampProducts[0]!.productId).toBe('lro_lamp_cdr_001')
    expect(result.psrSummary).not.toBeNull()
    expect(result.psrSummary!.locationId).toBe('shackleton')
  })

  it('returns empty lampProducts when ODE returns no products', async () => {
    mockFetchJson.mockResolvedValue({
      ODEResults: { Status: 'Success', Products: null },
    })
    const result = await fetchPsrData(-85.2, 53.5)
    expect(result.lampProducts).toHaveLength(0)
    expect(result.psrSummary).not.toBeNull()
    expect(result.psrSummary!.locationId).toBe('nobile')
  })

  it('returns null psrSummary for non-PSR coordinates', async () => {
    mockFetchJson.mockResolvedValue({
      ODEResults: { Status: 'Success', Products: null },
    })
    const result = await fetchPsrData(0, 0)
    expect(result.psrSummary).toBeNull()
  })

  it('returns empty lampProducts when ODE throws', async () => {
    mockFetchJson.mockRejectedValue(new Error('network error'))
    const result = await fetchPsrData(-89.9, 0)
    expect(result.lampProducts).toHaveLength(0)
    expect(result.psrSummary).not.toBeNull()
  })
})
