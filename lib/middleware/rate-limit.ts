import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

type RateLimitStore = Record<string, RateLimitEntry>;

const store: RateLimitStore = {};

const CLEANUP_INTERVAL = 60_000;

setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    const entry = store[key];
    if (entry && entry.resetAt < now) {
      delete store[key];
    }
  });
}, CLEANUP_INTERVAL);

export function rateLimit(windowMs = 60_000, maxRequests = 100) {
  return (req: NextRequest): Response | null => {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = (forwarded?.split(',')[0]?.trim()) || realIp || 'unknown';

    const key = String(ip);
    const now = Date.now();

    let entry = store[key];
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store[key] = entry;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } },
      );
    }

    return null;
  };
}
