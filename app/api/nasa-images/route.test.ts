import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function mockItem(id: string, date: string, keywords: string[] = []) {
  return {
    href: `https://images-assets.nasa.gov/image/${id}/collection.json`,
    data: [{ nasa_id: id, date_created: date, title: `Image ${id}`, keywords }],
    links: [
      { href: `https://images-assets.nasa.gov/image/${id}/${id}~thumb.jpg`, rel: 'preview', render: 'image' },
      { href: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`, rel: 'canonical', render: 'image' },
    ],
  };
}

function nasaResponse(items: unknown[]) {
  return { ok: true, json: async () => ({ collection: { items } }) };
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/nasa-images');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const VALID_PARAMS = { name: 'Tycho', lat: '-43', lon: '-11' };

describe('GET /api/nasa-images', () => {
  beforeEach(() => vi.restoreAllMocks());

  describe('parameter validation', () => {
    it('returns 400 when name is missing', async () => {
      const res = await GET(makeRequest({ lat: '0', lon: '0' }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ images: [], limitedCoverage: true });
    });

    it('returns 400 when lat is missing', async () => {
      const res = await GET(makeRequest({ name: 'Tycho', lon: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lon is missing', async () => {
      const res = await GET(makeRequest({ name: 'Tycho', lat: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lat is not a number', async () => {
      const res = await GET(makeRequest({ name: 'Tycho', lat: 'bad', lon: '0' }));
      expect(res.status).toBe(400);
    });
  });

  describe('merging and deduplication', () => {
    it('merges name and region results', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(nasaResponse([mockItem('name-001', '2024-02-01T00:00:00Z')]))
        .mockResolvedValueOnce(nasaResponse([mockItem('region-001', '2023-06-01T00:00:00Z')]))
      );

      const body = await GET(makeRequest(VALID_PARAMS)).then((r) => r.json());
      const ids = body.images.map((img: { assetId: string }) => img.assetId);
      expect(ids).toContain('name-001');
      expect(ids).toContain('region-001');
    });

    it('deduplicates images that appear in both results', async () => {
      const shared = mockItem('shared-001', '2024-01-01T00:00:00Z');
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(nasaResponse([shared, mockItem('name-only', '2024-02-01T00:00:00Z')]))
        .mockResolvedValueOnce(nasaResponse([shared, mockItem('region-only', '2023-06-01T00:00:00Z')]))
      );

      const body = await GET(makeRequest(VALID_PARAMS)).then((r) => r.json());
      const ids = body.images.map((img: { assetId: string }) => img.assetId);
      expect(ids.filter((id: string) => id === 'shared-001')).toHaveLength(1);
      expect(ids).toHaveLength(3);
    });

    it('sorts merged results by date descending', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(nasaResponse([mockItem('old', '2020-01-01T00:00:00Z')]))
        .mockResolvedValueOnce(nasaResponse([mockItem('new', '2024-01-01T00:00:00Z')]))
      );

      const body = await GET(makeRequest(VALID_PARAMS)).then((r) => r.json());
      expect(body.images[0].assetId).toBe('new');
      expect(body.images[1].assetId).toBe('old');
    });
  });

  describe('limitedCoverage flag', () => {
    it('returns 200 with empty images and limitedCoverage: true when both searches return nothing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nasaResponse([])));
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ images: [], limitedCoverage: true });
    });

    it('is false when 2 or more total results', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(nasaResponse([mockItem('a', '2024-01-01T00:00:00Z'), mockItem('b', '2023-01-01T00:00:00Z')]))
        .mockResolvedValueOnce(nasaResponse([]))
      );

      const body = await GET(makeRequest(VALID_PARAMS)).then((r) => r.json());
      expect(body.limitedCoverage).toBe(false);
    });

    it('is true when fewer than 2 total results', async () => {
      const item = mockItem('only-one', '2024-01-01T00:00:00Z');
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(nasaResponse([item]))
        .mockResolvedValueOnce(nasaResponse([item]))
      );

      const body = await GET(makeRequest({ name: 'Shackleton', lat: '-89.9', lon: '0' })).then((r) => r.json());
      expect(body.limitedCoverage).toBe(true);
    });
  });

  describe('region query selection', () => {
    async function captureQueries(params: Record<string, string>) {
      const fetchMock = vi.fn().mockResolvedValue(nasaResponse([]));
      vi.stubGlobal('fetch', fetchMock);
      await GET(makeRequest(params));
      return fetchMock.mock.calls.map((c) => new URL(String(c[0])).searchParams.get('q') ?? '');
    }

    it('uses south-pole query for lat < -60', async () => {
      const urls = await captureQueries({ name: 'Shackleton', lat: '-89.9', lon: '0' });
      expect(urls.some((u) => u.includes('moon south pole lunar surface'))).toBe(true);
    });

    it('uses north-pole query for lat > 60', async () => {
      const urls = await captureQueries({ name: 'SomeNorthCrater', lat: '75', lon: '0' });
      expect(urls.some((u) => u.includes('moon north pole lunar surface'))).toBe(true);
    });

    it('uses far-side query for |lon| > 90', async () => {
      const urls = await captureQueries({ name: 'Integrity', lat: '2.66', lon: '-104.92' });
      expect(urls.some((u) => u.includes('moon far side surface'))).toBe(true);
    });

    it('uses generic lunar query for near-side mid-latitude locations', async () => {
      const urls = await captureQueries(VALID_PARAMS);
      expect(urls.some((u) => u.includes('moon lunar surface'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns empty images when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const body = await GET(makeRequest(VALID_PARAMS)).then((r) => r.json());
      expect(body.images).toEqual([]);
    });

    it('returns empty images when API responds with non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const body = await GET(makeRequest(VALID_PARAMS)).then((r) => r.json());
      expect(body.images).toEqual([]);
    });
  });

  describe('response headers', () => {
    it('sets Cache-Control on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nasaResponse([mockItem('img-001', '2024-01-01T00:00:00Z')])));
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    });
  });
});
