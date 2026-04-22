/**
 * Server-side cache for the NASA SVS 2026 lunar illumination dataset.
 *
 * Strategy:
 * 1. In-memory singleton via globalThis — survives Next.js hot reloads in dev.
 * 2. Filesystem backup at /tmp/svs-mooninfo-2026.json — survives dev server restarts.
 * 3. Warming starts on module load so the first user request hits cached data.
 *
 * No TTL: the 2026 dataset is static. Invalidation is manual (restart).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { SvsIlluminationEntry } from './types/nasa';

const SVS_URL =
  'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json';
const CACHE_PATH = '/tmp/svs-mooninfo-2026.json';
const FETCH_TIMEOUT_MS = 30_000; // 2 MB file; allow longer than the standard 8s

// globalThis keys let the singleton survive Next.js module re-evaluation during hot reload.
declare global {
  // eslint-disable-next-line no-var
  var __svsData: SvsIlluminationEntry[] | undefined;
  // eslint-disable-next-line no-var
  var __svsWarmPromise: Promise<SvsIlluminationEntry[]> | null | undefined;
}

function readDiskCache(): SvsIlluminationEntry[] | null {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as SvsIlluminationEntry[];
    }
  } catch {
    // Corrupt or unreadable — fall through to network fetch.
  }
  return null;
}

async function fetchFromSvs(): Promise<SvsIlluminationEntry[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(SVS_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`SVS fetch failed with status ${res.status}`);
  }
  const data = (await res.json()) as SvsIlluminationEntry[];
  // Persist to disk so a subsequent dev server restart skips the network fetch.
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(data));
  } catch {
    // Write failure is non-fatal; in-memory cache still serves requests.
  }
  return data;
}

async function warm(): Promise<SvsIlluminationEntry[]> {
  if (globalThis.__svsData) return globalThis.__svsData;

  const disk = readDiskCache();
  if (disk) {
    globalThis.__svsData = disk;
    return disk;
  }

  const data = await fetchFromSvs();
  globalThis.__svsData = data;
  return data;
}

/**
 * Returns the cached SVS illumination entries, waiting for warming if needed.
 * Throws if the dataset could not be fetched and no disk cache exists.
 */
export async function getSvsData(): Promise<SvsIlluminationEntry[]> {
  if (!globalThis.__svsWarmPromise) {
    globalThis.__svsWarmPromise = warm().catch((err) => {
      // Clear so the next request retries rather than re-throwing forever.
      globalThis.__svsWarmPromise = null;
      throw err;
    });
  }
  return globalThis.__svsWarmPromise;
}

// Kick off warming immediately on module load — do not wait for the first request.
getSvsData().catch(() => {
  // Errors are surfaced per-request via getSvsData(); suppress the unhandled promise here.
});
