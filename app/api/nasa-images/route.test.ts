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

describe('GET /api/nasa-images', () => {
  beforeEach(() => vi.restoreAllMocks());

  describe('parameter validation', () => {
    it('returns 400 when q is missing', async () => {
      const res = await GET(makeRequest({}));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ images: [], limitedCoverage: true });
    });

    it('returns 400 when q is whitespace only', async () => {
      const res = await GET(makeRequest({ q: '   ' }));
      expect(res.status).toBe(400);
    });
  });

  describe('deduplication', () => {
    it('deduplicates Apollo sequential frames, keeping the first in a roll', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        nasaResponse([
          mockItem('as11-40-5931', '2024-01-01T00:00:00Z'),
          mockItem('as11-40-5932', '2024-01-01T00:00:00Z'),
          mockItem('as11-40-5933', '2024-01-01T00:00:00Z'),
        ])
      ));

      const body = await GET(makeRequest({ q: 'Apollo 11' })).then((r) => r.json());
      expect(body.images).toHaveLength(1);
      expect(body.images[0].assetId).toBe('as11-40-5931');
    });

    it('keeps non-Apollo images unaffected', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        nasaResponse([
          mockItem('lroc-001', '2024-01-01T00:00:00Z'),
          mockItem('lroc-002', '2023-06-01T00:00:00Z'),
        ])
      ));

      const body = await GET(makeRequest({ q: 'Tycho' })).then((r) => r.json());
      expect(body.images).toHaveLength(2);
    });
  });

  describe('limitedCoverage flag', () => {
    it('returns 200 with empty images and limitedCoverage: true when search returns nothing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nasaResponse([])));
      const res = await GET(makeRequest({ q: 'Tycho' }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ images: [], limitedCoverage: true });
    });

    it('is false when 2 or more results', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        nasaResponse([mockItem('a', '2024-01-01T00:00:00Z'), mockItem('b', '2023-01-01T00:00:00Z')])
      ));

      const body = await GET(makeRequest({ q: 'Tycho' })).then((r) => r.json());
      expect(body.limitedCoverage).toBe(false);
    });

    it('is true when fewer than 2 results', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        nasaResponse([mockItem('only-one', '2024-01-01T00:00:00Z')])
      ));

      const body = await GET(makeRequest({ q: 'Shackleton' })).then((r) => r.json());
      expect(body.limitedCoverage).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns empty images when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const body = await GET(makeRequest({ q: 'Tycho' })).then((r) => r.json());
      expect(body.images).toEqual([]);
    });

    it('returns empty images when API responds with non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const body = await GET(makeRequest({ q: 'Tycho' })).then((r) => r.json());
      expect(body.images).toEqual([]);
    });
  });

  describe('response headers', () => {
    it('sets Cache-Control on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nasaResponse([mockItem('img-001', '2024-01-01T00:00:00Z')])));
      const res = await GET(makeRequest({ q: 'Tycho' }));
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    });
  });
});
