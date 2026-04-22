import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Prevent the module-level warmup from interfering with test fetch mocks.
vi.mock('@/lib/svs-cache', () => ({
  getSvsData: vi.fn(),
}));

// Reset the globalThis cache state between tests so each test starts clean.
function resetCache() {
  (globalThis as Record<string, unknown>).__svsData = undefined;
  (globalThis as Record<string, unknown>).__svsWarmPromise = undefined;
}

function makeSvsEntry(time = '01 Jan 2026 00:00 UT', phase = 91.4) {
  return {
    time,
    phase,
    age: 11.928,
    diameter: 1985.1,
    distance: 361045,
    j2000: { ra: 4.2348, dec: 26.3373 },
    subsolar: { lon: 32.52, lat: -1.346 },
    subearth: { lon: -1.279, lat: -6.556 },
    posangle: 349.893,
  };
}

describe('GET /api/svs-illumination', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetCache();
  });

  it('returns 200 with entries and source on success', async () => {
    const { getSvsData } = await import('@/lib/svs-cache');
    vi.mocked(getSvsData).mockResolvedValue([makeSvsEntry()]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('svs.gsfc.nasa.gov/5587');
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].phase).toBe(91.4);
  });

  it('returns entry fields matching SvsIlluminationEntry shape', async () => {
    const { getSvsData } = await import('@/lib/svs-cache');
    const entry = makeSvsEntry('15 Jun 2026 12:00 UT', 50.0);
    vi.mocked(getSvsData).mockResolvedValue([entry]);

    const body = await GET().then((r) => r.json());
    const e = body.entries[0];
    expect(e.time).toBe('15 Jun 2026 12:00 UT');
    expect(e.phase).toBe(50.0);
    expect(e.subsolar).toEqual({ lon: 32.52, lat: -1.346 });
    expect(e.subearth).toEqual({ lon: -1.279, lat: -6.556 });
    expect(e.j2000).toEqual({ ra: 4.2348, dec: 26.3373 });
    expect(e.posangle).toBe(349.893);
  });

  it('sets Cache-Control: no-store on success', async () => {
    const { getSvsData } = await import('@/lib/svs-cache');
    vi.mocked(getSvsData).mockResolvedValue([makeSvsEntry()]);

    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 502 with FETCH_FAILED when getSvsData throws', async () => {
    const { getSvsData } = await import('@/lib/svs-cache');
    vi.mocked(getSvsData).mockRejectedValue(new Error('SVS fetch failed with status 503'));

    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: 'SVS illumination data unavailable', code: 'FETCH_FAILED' });
  });

  it('does not silently swallow fetch failures (no empty entries array)', async () => {
    const { getSvsData } = await import('@/lib/svs-cache');
    vi.mocked(getSvsData).mockRejectedValue(new Error('network timeout'));

    const body = await GET().then((r) => r.json());
    expect(body).not.toHaveProperty('entries');
    expect(body.code).toBe('FETCH_FAILED');
  });
});
