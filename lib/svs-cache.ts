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
import { tmpdir } from 'os';
import { join } from 'path';
import type { SvsIlluminationEntry } from './types/nasa';
import { fetchJson } from './utils/fetch-with-timeout';

const SVS_URL = 'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json';
const CACHE_PATH = join(tmpdir(), 'svs-mooninfo-2026.json');
const LOCK_PATH = join(tmpdir(), 'svs-mooninfo-2026.lock');
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

async function acquireLock(timeout = 5000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await fs.writeFile(LOCK_PATH, String(process.pid), { flag: 'wx' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

async function releaseLock(): Promise<void> {
  await fs.unlink(LOCK_PATH).catch(() => {});
}

async function warm(): Promise<SvsIlluminationEntry[]> {
  const disk = await readDiskCache();
  if (disk) return disk;

  let locked = false;
  try {
    await acquireLock();
    locked = true;

    // Double-check after acquiring lock
    const diskAgain = await readDiskCache();
    if (diskAgain) return diskAgain;

    const data = await fetchJson<SvsIlluminationEntry[]>(SVS_URL, FETCH_TIMEOUT_MS);
    const tempPath = `${CACHE_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data));
    await fs.rename(tempPath, CACHE_PATH);
    return data;
  } finally {
    if (locked) await releaseLock();
  }
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
