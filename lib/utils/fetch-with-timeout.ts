export class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

export class UpstreamError extends Error {
  constructor(public readonly statusCode?: number) {
    super('Upstream request failed');
    this.name = 'UpstreamError';
  }
}

export async function fetchJson<T>(url: URL | string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new UpstreamError(res.status);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw new TimeoutError();
    throw new UpstreamError();
  } finally {
    clearTimeout(timer);
  }
}
