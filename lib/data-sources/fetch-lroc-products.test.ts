import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchLrocProducts, INSTRUMENT_NAC, INSTRUMENT_WAC } from './fetch-lroc-products'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'

function makeProduct(id: string, resolution: string, date: string) {
  return {
    Product_name: `${id}.IMG`,
    Map_resolution: resolution,
    Observation_time: date,
    External_url: `https://data.lroc.im-ldi.com/lroc/view_lroc/LRO-L-LROC-3-CDR-V1.0/${id}`,
  }
}

function odeResponse(products: unknown[]) {
  return {
    ok: true,
    json: async () => ({
      ODEResults: {
        Status: 'Success',
        Products: { Product: products },
      },
    }),
  }
}

function odeEmpty() {
  return {
    ok: true,
    json: async () => ({
      ODEResults: { Status: 'Success', Products: {} },
    }),
  }
}

function odeError() {
  return {
    ok: true,
    json: async () => ({
      ODEResults: { Status: 'ERROR', Error: 'Invalid params' },
    }),
  }
}

describe('fetchLrocProducts', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('happy path: returns flattened [...wac, ...nac] array', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(odeResponse([makeProduct('M001LC', '0.5', '2024-01-01T00:00:00Z')]))
      .mockResolvedValueOnce(odeResponse([makeProduct('M001CC', '110', '2024-01-01T00:00:00Z')]))
    )

    const result = await fetchLrocProducts(-89.9, 0)
    expect(result.length).toBe(2)
    const instruments = result.map((p) => p.instrument)
    expect(instruments).toContain(INSTRUMENT_NAC)
    expect(instruments).toContain(INSTRUMENT_WAC)
  })

  it('WAC products come before NAC in flattened array', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(odeResponse([makeProduct('NAC_PROD', '0.5', '2024-01-01T00:00:00Z')]))
      .mockResolvedValueOnce(odeResponse([makeProduct('WAC_PROD', '110', '2024-01-01T00:00:00Z')]))
    )

    const result = await fetchLrocProducts(-89.9, 0)
    const first = result[0]
    const second = result[1]
    if (!first || !second) return
    expect(first.instrument).toBe(INSTRUMENT_WAC)
    expect(second.instrument).toBe(INSTRUMENT_NAC)
  })

  it('ODE returns single product (not array) — handled correctly', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ODEResults: {
            Status: 'Success',
            Products: {
              Product: makeProduct('SINGLE_NAC', '0.75', '2023-06-01T00:00:00Z'),
            },
          },
        }),
      })
      .mockResolvedValueOnce(odeEmpty())
    )

    const result = await fetchLrocProducts(-89.9, 0)
    expect(result).toHaveLength(1)
    const first = result[0]
    if (!first) return
    expect(first.productId).toBe('SINGLE_NAC')
    expect(first.instrument).toBe(INSTRUMENT_NAC)
  })

  it('propagates TimeoutError on abort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    await expect(fetchLrocProducts(-89.9, 0)).rejects.toBeInstanceOf(TimeoutError)
  })

  it('propagates UpstreamError when ODE returns Status: ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(odeError()))
    await expect(fetchLrocProducts(-89.9, 0)).rejects.toBeInstanceOf(UpstreamError)
  })

  it('propagates UpstreamError when fetch returns non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchLrocProducts(-89.9, 0)).rejects.toBeInstanceOf(UpstreamError)
  })

  it('returns empty array when both instruments have no products', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(odeEmpty()))
    const result = await fetchLrocProducts(-89.9, 0)
    expect(result).toEqual([])
  })
})
