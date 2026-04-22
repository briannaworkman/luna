import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function makeProduct(id: string, resolution: string, date: string) {
  return {
    Product_name: `${id}.IMG`,
    Map_resolution: resolution,
    Observation_time: date,
    External_url: `https://data.lroc.im-ldi.com/lroc/view_lroc/LRO-L-LROC-3-CDR-V1.0/${id}`,
  };
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
  };
}

function odeEmpty() {
  return {
    ok: true,
    json: async () => ({
      ODEResults: { Status: 'Success', Products: {} },
    }),
  };
}

function odeError() {
  return {
    ok: true,
    json: async () => ({
      ODEResults: { Status: 'ERROR', Error: 'Invalid params' },
    }),
  };
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/lroc');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const SHACKLETON = { lat: '-89.9', lon: '0' };       // near-side south pole
const INTEGRITY = { lat: '2.66', lon: '104.92' };    // far-side

describe('GET /api/lroc', () => {
  beforeEach(() => vi.restoreAllMocks());

  describe('parameter validation', () => {
    it('returns 400 when lat is missing', async () => {
      const res = await GET(makeRequest({ lon: '0' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ wac: [], nac: [] });
    });

    it('returns 400 when lon is missing', async () => {
      const res = await GET(makeRequest({ lat: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lat is not a number', async () => {
      const res = await GET(makeRequest({ lat: 'bad', lon: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lon is not a number', async () => {
      const res = await GET(makeRequest({ lat: '0', lon: 'bad' }));
      expect(res.status).toBe(400);
    });
  });

  describe('response shape', () => {
    it('returns separate wac and nac lists', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(odeResponse([makeProduct('M001LC', '0.5', '2024-01-01T00:00:00Z')]))
        .mockResolvedValueOnce(odeResponse([makeProduct('M001CC', '110', '2024-01-01T00:00:00Z')]))
      );

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body).toHaveProperty('nac');
      expect(body).toHaveProperty('wac');
    });

    it('normalizes product fields correctly', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(odeResponse([makeProduct('M101350392LC', '0.904', '2009-07-04T12:39:00.489Z')]))
        .mockResolvedValueOnce(odeResponse([]))
      );

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      const product = body.nac[0];
      expect(product.productId).toBe('M101350392LC');
      expect(product.resolutionMpp).toBe(0.904);
      expect(product.acquisitionDate).toBe('2009-07-04T12:39:00.489Z');
      expect(product.downloadUrl).toContain('M101350392LC');
      expect(product.instrument).toBe('NAC');
    });

    it('assigns WAC instrument to wac products', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(odeResponse([]))
        .mockResolvedValueOnce(odeResponse([makeProduct('M1419891365CC', '110.347', '2022-10-08T00:00:00Z')]))
      );

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.wac[0].instrument).toBe('WAC');
    });
  });

  describe('sorting', () => {
    it('sorts nac products by resolutionMpp ascending (best first)', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(odeResponse([
          makeProduct('LOW_RES', '5.0', '2024-01-01T00:00:00Z'),
          makeProduct('HIGH_RES', '0.5', '2024-01-01T00:00:00Z'),
          makeProduct('MID_RES', '2.0', '2024-01-01T00:00:00Z'),
        ]))
        .mockResolvedValueOnce(odeResponse([]))
      );

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.nac[0].productId).toBe('HIGH_RES');
      expect(body.nac[1].productId).toBe('MID_RES');
      expect(body.nac[2].productId).toBe('LOW_RES');
    });

    it('sorts wac products by resolutionMpp ascending', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(odeResponse([]))
        .mockResolvedValueOnce(odeResponse([
          makeProduct('WAC_B', '200', '2024-01-01T00:00:00Z'),
          makeProduct('WAC_A', '100', '2024-01-01T00:00:00Z'),
        ]))
      );

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.wac[0].productId).toBe('WAC_A');
      expect(body.wac[1].productId).toBe('WAC_B');
    });
  });

  describe('empty results', () => {
    it('returns empty arrays when both searches return no products', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(odeEmpty()));
      const res = await GET(makeRequest(SHACKLETON));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ wac: [], nac: [] });
    });

    it('returns empty arrays when ODE returns an error status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(odeError()));
      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.nac).toEqual([]);
      expect(body.wac).toEqual([]);
    });

    it('returns empty arrays when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.nac).toEqual([]);
      expect(body.wac).toEqual([]);
    });

    it('returns empty arrays when fetch returns non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.nac).toEqual([]);
      expect(body.wac).toEqual([]);
    });
  });

  describe('single-product response (XML-to-JSON quirk)', () => {
    it('handles a single product returned as an object rather than an array', async () => {
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
        .mockResolvedValueOnce(odeResponse([]))
      );

      const body = await GET(makeRequest(SHACKLETON)).then((r) => r.json());
      expect(body.nac).toHaveLength(1);
      expect(body.nac[0].productId).toBe('SINGLE_NAC');
    });
  });

  describe('far-side location (Integrity)', () => {
    it('returns 200 with results for a far-side location', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(odeResponse([makeProduct('FAR_NAC', '0.6', '2024-01-01T00:00:00Z')]))
        .mockResolvedValueOnce(odeResponse([makeProduct('FAR_WAC', '115', '2024-01-01T00:00:00Z')]))
      );

      const res = await GET(makeRequest(INTEGRITY));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nac).toHaveLength(1);
      expect(body.wac).toHaveLength(1);
    });
  });

  describe('bounding box construction', () => {
    it('sends correct product types to ODE (NAC first, WAC second)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(odeEmpty());
      vi.stubGlobal('fetch', fetchMock);
      await GET(makeRequest(SHACKLETON));

      const calls = fetchMock.mock.calls.map((c) => new URL(String(c[0])));
      const pts = calls.map((u) => u.searchParams.get('pt'));
      expect(pts[0]).toBe('CDRNAC4');
      expect(pts[1]).toBe('CDRWAC4');
    });

    it('converts negative lon to 0-360 for ODE API', async () => {
      const fetchMock = vi.fn().mockResolvedValue(odeEmpty());
      vi.stubGlobal('fetch', fetchMock);
      // Tycho: lat -43, lon -11 → ODE lon should be 349
      await GET(makeRequest({ lat: '-43', lon: '-11' }));

      const calls = fetchMock.mock.calls.map((c) => new URL(String(c[0])));
      const westernlons = calls.map((u) => parseFloat(u.searchParams.get('westernlon') ?? ''));
      // -11 - 0.5 = -11.5 → 348.5
      expect(westernlons[0]).toBeCloseTo(348.5, 1);
    });

    it('clamps minlat to -90 for south pole locations', async () => {
      const fetchMock = vi.fn().mockResolvedValue(odeEmpty());
      vi.stubGlobal('fetch', fetchMock);
      await GET(makeRequest(SHACKLETON)); // lat -89.9

      const calls = fetchMock.mock.calls.map((c) => new URL(String(c[0])));
      const minlats = calls.map((u) => parseFloat(u.searchParams.get('minlat') ?? ''));
      expect(minlats[0]).toBe(-90);
    });
  });

  describe('response headers', () => {
    it('sets Cache-Control header on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(odeEmpty()));
      const res = await GET(makeRequest(SHACKLETON));
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    });
  });
});
