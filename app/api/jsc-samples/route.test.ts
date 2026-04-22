import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const APOLLO_17 = { lat: '20.19', lon: '30.77' };    // ~0.1 km from Apollo 17 LM
const INTEGRITY = { lat: '2.66', lon: '-104.92' };    // far-side, >500 km from any station
const SHACKLETON = { lat: '-89.9', lon: '0' };         // south pole, >500 km

interface JscRawSample {
  GENERIC: string;
  SAMPLEID: string | null;
  MISSION: string;
  STATION: string | null;
  ORIGINALWEIGHT: number | null;
  SAMPLETYPE: string | null;
  SAMPLESUBTYPE: string | null;
  GENERICDESCRIPTION: string | null;
}

function makeRawSample(overrides: Partial<JscRawSample> = {}): JscRawSample {
  return {
    GENERIC: '72135',
    SAMPLEID: null,
    MISSION: 'Apollo 17',
    STATION: '2',
    ORIGINALWEIGHT: 336.9,
    SAMPLETYPE: 'Breccia',
    SAMPLESUBTYPE: 'Fragmental',
    GENERICDESCRIPTION: 'coarsely brecciated ilmenite basalt',
    ...overrides,
  };
}

function jscResponse(samples: unknown[]) {
  return { ok: true, json: async () => samples };
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/jsc-samples');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/jsc-samples', () => {
  beforeEach(() => vi.restoreAllMocks());

  describe('parameter validation', () => {
    it('returns 400 when lat is missing', async () => {
      const res = await GET(makeRequest({ lon: '30.77' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lon is missing', async () => {
      const res = await GET(makeRequest({ lat: '20.19' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lat is not a number', async () => {
      const res = await GET(makeRequest({ lat: 'bad', lon: '30.77' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lon is not a number', async () => {
      const res = await GET(makeRequest({ lat: '20.19', lon: 'bad' }));
      expect(res.status).toBe(400);
    });
  });

  describe('out-of-range locations (>500 km from any Apollo station)', () => {
    it('returns 200 with empty results for far-side location (Integrity)', async () => {
      const res = await GET(makeRequest(INTEGRITY));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ results: [], nearestMission: null });
    });

    it('returns 200 with empty results for south pole (Shackleton)', async () => {
      const res = await GET(makeRequest(SHACKLETON));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ results: [], nearestMission: null });
    });

    it('does not call the JSC API for out-of-range coordinates', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await GET(makeRequest(INTEGRITY));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sets Cache-Control on out-of-range response', async () => {
      const res = await GET(makeRequest(INTEGRITY));
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    });
  });

  describe('successful response', () => {
    it('returns results and nearestMission for a near-side location', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([makeRawSample()])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.nearestMission).toBe('Apollo 17');
      expect(body.results).toHaveLength(1);
    });

    it('normalizes sample fields correctly', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([makeRawSample()])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      const sample = body.results[0];
      expect(sample.sampleId).toBe('72135');
      expect(sample.mission).toBe('Apollo 17');
      expect(sample.station).toBe('2');
      expect(sample.weight).toBe(336.9);
      expect(sample.mineralFlags).toEqual(['breccia', 'fragmental']);
      expect(sample.description).toBe('coarsely brecciated ilmenite basalt');
      expect(sample.jscUrl).toBe(
        'https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=72135'
      );
    });

    it('falls back to station from lookup when STATION is null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ STATION: null }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].station).toBeTruthy();
    });

    it('falls back to mission from lookup when MISSION is empty', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ MISSION: '' }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].mission).toBe('Apollo 17');
    });

    it('sets null weight when ORIGINALWEIGHT is null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ ORIGINALWEIGHT: null }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].weight).toBeNull();
    });

    it('sets null description when GENERICDESCRIPTION is null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ GENERICDESCRIPTION: null }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].description).toBeNull();
    });

    it('sets Cache-Control on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([makeRawSample()])));
      const res = await GET(makeRequest(APOLLO_17));
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    });
  });

  describe('sorting', () => {
    it('sorts rocks before soil samples', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ GENERIC: 'SOIL1', SAMPLETYPE: 'Soil', SAMPLESUBTYPE: null, ORIGINALWEIGHT: 500 }),
        makeRawSample({ GENERIC: 'ROCK1', SAMPLETYPE: 'Breccia', SAMPLESUBTYPE: null, ORIGINALWEIGHT: 100 }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].sampleId).toBe('ROCK1');
      expect(body.results[1].sampleId).toBe('SOIL1');
    });

    it('sorts by weight descending within the same sample type', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ GENERIC: 'LIGHT', SAMPLETYPE: 'Breccia', SAMPLESUBTYPE: null, ORIGINALWEIGHT: 50 }),
        makeRawSample({ GENERIC: 'HEAVY', SAMPLETYPE: 'Breccia', SAMPLESUBTYPE: null, ORIGINALWEIGHT: 500 }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].sampleId).toBe('HEAVY');
      expect(body.results[1].sampleId).toBe('LIGHT');
    });

    it('caps results at 10', async () => {
      const samples = Array.from({ length: 15 }, (_, i) =>
        makeRawSample({ GENERIC: `S${i}`, SAMPLETYPE: 'Breccia', SAMPLESUBTYPE: null })
      );
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse(samples)));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results).toHaveLength(10);
    });
  });

  describe('mineral flags', () => {
    it('lowercases type and subtype', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ SAMPLETYPE: 'Breccia', SAMPLESUBTYPE: 'Fragmental' }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].mineralFlags).toEqual(['breccia', 'fragmental']);
    });

    it('deduplicates when type and subtype are identical', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ SAMPLETYPE: 'Basalt', SAMPLESUBTYPE: 'Basalt' }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].mineralFlags).toEqual(['basalt']);
    });

    it('returns empty array when both type and subtype are null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jscResponse([
        makeRawSample({ SAMPLETYPE: null, SAMPLESUBTYPE: null }),
      ])));
      const body = await GET(makeRequest(APOLLO_17)).then((r) => r.json());
      expect(body.results[0].mineralFlags).toEqual([]);
    });
  });

  describe('error responses', () => {
    it('returns TIMEOUT when fetch is aborted', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
      const res = await GET(makeRequest(APOLLO_17));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        error: 'JSC sample data unavailable',
        code: 'TIMEOUT',
        results: [],
        nearestMission: null,
      });
    });

    it('returns UPSTREAM_ERROR when fetch returns non-ok status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
      const res = await GET(makeRequest(APOLLO_17));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        error: 'JSC sample data unavailable',
        code: 'UPSTREAM_ERROR',
        results: [],
        nearestMission: null,
      });
    });

    it('returns UPSTREAM_ERROR when fetch throws a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const res = await GET(makeRequest(APOLLO_17));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        error: 'JSC sample data unavailable',
        code: 'UPSTREAM_ERROR',
        results: [],
        nearestMission: null,
      });
    });
  });
});
