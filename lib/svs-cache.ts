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

import { promises as fs } from 'fs';
import type { SvsIlluminationEntry } from './types/nasa';
import { fetchJson } from './utils/fetch-with-timeout';

const SVS_URL = 'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json';
const CACHE_PATH = '/tmp/svs-mooninfo-2026.json';
const FETCH_TIMEOUT_MS = 30_000; // SVS payload is ~2 MB; well above the default 8s

declare global {
  // eslint-disable-next-line no-var
  var __svsWarmPromise: Promise<SvsIlluminationEntry[]> | null | undefined;
}

async function readDiskCache(): Promise<SvsIlluminationEntry[] | null> {
  try {
    const text = await fs.readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(text) as SvsIlluminationEntry[];
  } catch {
    return null;
  }
}

async function warm(): Promise<SvsIlluminationEntry[]> {
  const disk = await readDiskCache();
  if (disk) return disk;

  const data = await fetchJson<SvsIlluminationEntry[]>(SVS_URL, FETCH_TIMEOUT_MS);
  fs.writeFile(CACHE_PATH, JSON.stringify(data)).catch(() => {});
  return data;
}

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

getSvsData().catch(() => {});
