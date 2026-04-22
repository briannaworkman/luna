import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson, TimeoutError, UpstreamError } from './fetch-with-timeout';

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

  it('throws UpstreamError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchJson('https://example.com')).rejects.toBeInstanceOf(UpstreamError);
  });

  it('includes the HTTP status code in UpstreamError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const err = await fetchJson('https://example.com').catch((e) => e);
    expect(err.statusCode).toBe(503);
  });

  it('throws UpstreamError when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(fetchJson('https://example.com')).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws TimeoutError when fetch is aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    await expect(fetchJson('https://example.com')).rejects.toBeInstanceOf(TimeoutError);
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

    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(500);
    expect(capturedSignal?.aborted).toBe(true);
    await assertion;

    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
