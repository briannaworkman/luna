import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson } from './fetch-with-timeout';

function okResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe('fetchJson', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns parsed JSON on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ items: [1, 2, 3] })));
    const result = await fetchJson<{ items: number[] }>('https://example.com');
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('accepts a URL object in addition to a string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ ok: true })));
    const result = await fetchJson(new URL('https://example.com'));
    expect(result).not.toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await fetchJson('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    const result = await fetchJson('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null when fetch is aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    const result = await fetchJson('https://example.com');
    expect(result).toBeNull();
  });

  it('aborts the request after the specified timeout', async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          capturedSignal!.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        });
      })
    );

    const promise = fetchJson('https://example.com', 500);
    expect(capturedSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    expect(capturedSignal?.aborted).toBe(true);

    const result = await promise;
    expect(result).toBeNull();

    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
