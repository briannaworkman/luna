import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/svs-cache', () => ({
  getSvsData: vi.fn(),
}));

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/svs-illumination');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// Subsolar at equator/prime-meridian → target (0,0) is fully illuminated (elevation 90°)
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
  };
}

// Subsolar on the opposite hemisphere → target (0,0) is in shadow (elevation −90°)
function darkEntry(timeStr: string) {
  return {
    ...litEntry(timeStr),
    subsolar: { lon: 180, lat: 0 },
  };
}

// Fixed "today" so 30-day window is deterministic
const FAKE_NOW = new Date('2026-04-22T00:00:00Z');

describe('GET /api/svs-illumination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('parameter validation', () => {
    it('returns 400 when lat is missing', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([]);

      const res = await GET(makeRequest({ lon: '0' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('INVALID_PARAMS');
    });

    it('returns 400 when lon is missing', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([]);

      const res = await GET(makeRequest({ lat: '0' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('INVALID_PARAMS');
    });

    it('returns 400 when lat is out of range', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([]);

      const res = await GET(makeRequest({ lat: '91', lon: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lon is out of range', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([]);

      const res = await GET(makeRequest({ lat: '0', lon: '181' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when lat is not a number', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([]);

      const res = await GET(makeRequest({ lat: 'abc', lon: '0' }));
      expect(res.status).toBe(400);
    });
  });

  describe('illumination window computation', () => {
    it('returns a flat array sorted chronologically', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([
        litEntry('24 Apr 2026 12:00 UT'),
        litEntry('22 Apr 2026 12:00 UT'),
        litEntry('23 Apr 2026 12:00 UT'),
      ]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].date).toBe('2026-04-22');
      expect(body[1].date).toBe('2026-04-23');
      expect(body[2].date).toBe('2026-04-24');
    });

    it('sets illuminatedHours and sunriseUtc/sunsetUtc for a lit location', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([
        litEntry('22 Apr 2026 10:00 UT'),
        litEntry('22 Apr 2026 11:00 UT'),
        litEntry('22 Apr 2026 12:00 UT'),
      ]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(body).toHaveLength(1);
      const w = body[0];
      expect(w.date).toBe('2026-04-22');
      expect(w.illuminatedHours).toBe(3);
      expect(w.sunriseUtc).toBe('2026-04-22T10:00:00.000Z');
      expect(w.sunsetUtc).toBe('2026-04-22T12:00:00.000Z');
      expect(w.permanentlyShadowed).toBe(false);
    });

    it('flags permanentlyShadowed and nulls sunrise/sunset for a dark location', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([
        darkEntry('22 Apr 2026 10:00 UT'),
        darkEntry('22 Apr 2026 11:00 UT'),
      ]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(body).toHaveLength(1);
      const w = body[0];
      expect(w.illuminatedHours).toBe(0);
      expect(w.permanentlyShadowed).toBe(true);
      expect(w.sunriseUtc).toBeNull();
      expect(w.sunsetUtc).toBeNull();
    });

    it('reports solarElevationDeg as the peak elevation for the day', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      // subsolar at (0,0) → elevation = 90° for target (0,0)
      vi.mocked(getSvsData).mockResolvedValue([litEntry('22 Apr 2026 12:00 UT')]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(body[0].solarElevationDeg).toBe(90);
    });

    it('includes all required fields on each window', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([litEntry('22 Apr 2026 12:00 UT')]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      const w = body[0];
      expect(w).toHaveProperty('date');
      expect(w).toHaveProperty('sunriseUtc');
      expect(w).toHaveProperty('sunsetUtc');
      expect(w).toHaveProperty('illuminatedHours');
      expect(w).toHaveProperty('solarElevationDeg');
      expect(w).toHaveProperty('permanentlyShadowed');
    });
  });

  describe('30-day window filter', () => {
    it('excludes entries before today', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([
        litEntry('21 Apr 2026 12:00 UT'), // yesterday — excluded
        litEntry('22 Apr 2026 12:00 UT'), // today — included
      ]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(body).toHaveLength(1);
      expect(body[0].date).toBe('2026-04-22');
    });

    it('excludes entries 30+ days from today', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([
        litEntry('22 May 2026 00:00 UT'), // exactly day 30 (windowEnd) — excluded
        litEntry('21 May 2026 23:00 UT'), // last hour of day 29 — included
      ]);

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(body.every((w: { date: string }) => w.date < '2026-05-22')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns 502 with FETCH_FAILED when getSvsData throws', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockRejectedValue(new Error('upstream timeout'));

      const res = await GET(makeRequest({ lat: '0', lon: '0' }));
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.code).toBe('FETCH_FAILED');
    });

    it('does not include entries array in error response', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockRejectedValue(new Error('network error'));

      const body = await GET(makeRequest({ lat: '0', lon: '0' })).then((r) => r.json());
      expect(body).not.toHaveProperty('entries');
    });

    it('sets Cache-Control: no-store on success', async () => {
      const { getSvsData } = await import('@/lib/svs-cache');
      vi.mocked(getSvsData).mockResolvedValue([litEntry('22 Apr 2026 12:00 UT')]);

      const res = await GET(makeRequest({ lat: '0', lon: '0' }));
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });
  });
});
