# Code Quality Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate structural inconsistencies across the API layer, orchestration core, and UI components without changing any functionality.

**Architecture:** Three independent tracks executed in order: (1) API layer — Zod validation everywhere, fix rate-limit return type, extract generic `SseEmitter<T>` to `lib/sse.ts` so the synthesize route can drop its inline encoder/serializer boilerplate; (2) Orchestration core — collapse three identical specialist wrappers into a declarative config table; (3) UI — merge two confidence badge components into one, fix `JSON.stringify` in `useEffect` deps.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Vitest, React, Tailwind/shadcn

---

## File Map

**Created:**
- `lib/sse.ts` — generic `serializeEvent<T>` and `SseEmitter<T>` (no `createSseResponse` — that stays in `lib/orchestrator/sse.ts` since its error fallbacks are orchestrator-specific)

**Modified (imports from `lib/sse`):**
- `lib/orchestrator/sse.ts` — imports `SseEmitter`, `serializeEvent` from `lib/sse`

**Deleted:**
- `lib/orchestrator/agents/mineralogy.ts`
- `lib/orchestrator/agents/orbit.ts`
- `lib/orchestrator/agents/mission-history.ts`

**Created:**
- `components/ui/confidence-badge.tsx` — single shared confidence badge with tooltip

**Deleted:**
- `components/screen3/ConfidenceBadge.tsx`
- `components/screen4/BriefConfidenceBadge.tsx`

**Modified:**
- `lib/middleware/rate-limit.ts` — return type `Response | null`
- `lib/orchestrator/specialists.ts` — replace if-chain with declarative config table
- `lib/orchestrator/sse.test.ts` — update import to `@/lib/sse`
- `lib/orchestrator/specialists.test.ts` — remove wrapper mocks, test via table lookup
- `lib/orchestrator/agents/mineralogy.test.ts` — migrate to `specialists.ts`
- `lib/orchestrator/agents/orbit.test.ts` — migrate to `specialists.ts`
- `lib/orchestrator/agents/mission-history.test.ts` — migrate to `specialists.ts`
- `app/api/orchestrate/route.ts` — Zod schema, remove casts
- `app/api/synthesize/route.ts` — use `SseEmitter<BriefStreamEvent>` from `lib/sse` to remove inline encoder/sseEvent boilerplate
- `app/api/lroc/route.ts` — Zod schema, remove cast
- `app/api/jsc-samples/route.ts` — Zod schema, remove cast
- `app/api/nasa-images/route.ts` — Zod schema, remove cast
- `app/api/psr-data/route.ts` — Zod schema, remove cast
- `app/api/svs-illumination/route.ts` — Zod schema, remove cast
- `components/screen3/AgentBlock.tsx` — import from `@/components/ui/confidence-badge`
- `components/screen4/FindingItem.tsx` — import from `@/components/ui/confidence-badge`, `.toLowerCase()`
- `components/screen3/useAgentStream.ts` — replace `JSON.stringify` dep with `useMemo` key

---

## Task 1: Create `lib/sse.ts` — generic SSE primitives

`lib/orchestrator/sse.ts` has a hardcoded `TextEncoder`, `TextDecoder`, and serializer that are not orchestrator-specific. Extract the generic parts to `lib/sse.ts` so the synthesize route (Task 3 Step 7) can use `SseEmitter<BriefStreamEvent>` without duplicating those primitives.

`createSseResponse` is **not** moved — its timeout/error fallbacks emit `OrchestratorEvent` shapes and would break if reused for `BriefStreamEvent`. It stays in `lib/orchestrator/sse.ts`.

**Files:**
- Create: `lib/sse.ts`
- Modify: `lib/orchestrator/sse.ts`
- No change to `lib/orchestrator/sse.test.ts` — it still imports from `./sse`

- [ ] **Step 1: Create `lib/sse.ts`**

```ts
// lib/sse.ts

export function serializeEvent<T>(event: T): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export class SseEmitter<T = unknown> {
  private controller: ReadableStreamDefaultController<Uint8Array>
  private encoder = new TextEncoder()
  private _closed = false

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller
  }

  emit(event: T): void {
    if (this._closed) return
    this.controller.enqueue(this.encoder.encode(serializeEvent(event)))
  }

  close(): void {
    if (this._closed) return
    this._closed = true
    this.controller.close()
  }

  get closed(): boolean {
    return this._closed
  }
}
```

- [ ] **Step 2: Update `lib/orchestrator/sse.ts` to import from `lib/sse`**

Replace the inline `serializeEvent` implementation and `SseEmitter` class in `lib/orchestrator/sse.ts` with imports from `lib/sse`. Keep `createSseResponse` in place. Full file after edit:

```ts
import type { OrchestratorEvent } from '@/lib/types/agent'
import { serializeEvent, SseEmitter } from '@/lib/sse'

export { serializeEvent, SseEmitter }

export function createSseResponse(
  handler: (emitter: SseEmitter<OrchestratorEvent>) => Promise<void>,
  timeoutMs = 120_000,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emitter = new SseEmitter<OrchestratorEvent>(controller)

      const timeoutId = setTimeout(() => {
        emitter.emit({
          type: 'agent-error',
          agent: 'data-ingest',
          message: `Request timed out after ${Math.round(timeoutMs / 1000)} seconds`,
        })
        emitter.emit({ type: 'done' })
        emitter.close()
      }, timeoutMs)

      handler(emitter)
        .then(() => {
          clearTimeout(timeoutId)
          emitter.close()
        })
        .catch((err: unknown) => {
          clearTimeout(timeoutId)
          const message = err instanceof Error ? err.message : String(err)
          emitter.emit({ type: 'agent-error', agent: 'data-ingest', message })
          emitter.emit({ type: 'done' })
          emitter.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

- [ ] **Step 3: Run SSE tests to confirm they still pass**

```bash
npx vitest run lib/orchestrator/sse.test.ts
```
Expected: all 7 tests pass. (The test file imports from `./sse` and is unchanged.)

- [ ] **Step 4: Commit**

```bash
git add lib/sse.ts lib/orchestrator/sse.ts
git commit -m "refactor: extract generic SseEmitter and serializeEvent to lib/sse.ts"
```

---

## Task 2: Fix rate-limit return type — eliminate `as unknown as` casts

**Files:**
- Modify: `lib/middleware/rate-limit.ts`
- Modify: `app/api/lroc/route.ts`
- Modify: `app/api/jsc-samples/route.ts`
- Modify: `app/api/nasa-images/route.ts`
- Modify: `app/api/psr-data/route.ts`
- Modify: `app/api/svs-illumination/route.ts`

- [ ] **Step 1: Change `rateLimit` return type in `lib/middleware/rate-limit.ts`**

Change the import line and function signature. The full file after edit:

```ts
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
```

- [ ] **Step 2: Remove the cast from `app/api/lroc/route.ts`**

Change:
```ts
if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<LrocResponse | LrocErrorResponse>
```
to:
```ts
if (rateLimitResponse) return rateLimitResponse
```

- [ ] **Step 3: Remove the cast from `app/api/jsc-samples/route.ts`**

Change:
```ts
if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<JscSamplesResponse | JscSamplesErrorResponse>
```
to:
```ts
if (rateLimitResponse) return rateLimitResponse
```

- [ ] **Step 4: Remove the cast from `app/api/nasa-images/route.ts`**

Change:
```ts
if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<NasaImagesResponse>
```
to:
```ts
if (rateLimitResponse) return rateLimitResponse
```

- [ ] **Step 5: Remove the cast from `app/api/psr-data/route.ts`**

Change:
```ts
if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<PsrDataResponse | PsrDataErrorResponse>
```
to:
```ts
if (rateLimitResponse) return rateLimitResponse
```

- [ ] **Step 6: Remove the cast from `app/api/svs-illumination/route.ts`**

Change:
```ts
if (rateLimitResponse) return rateLimitResponse as unknown as NextResponse<IlluminationWindow[] | IlluminationWindowsErrorResponse>
```
to:
```ts
if (rateLimitResponse) return rateLimitResponse
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/middleware/rate-limit.ts \
  app/api/lroc/route.ts \
  app/api/jsc-samples/route.ts \
  app/api/nasa-images/route.ts \
  app/api/psr-data/route.ts \
  app/api/svs-illumination/route.ts
git commit -m "refactor: fix rateLimit return type to Response | null, remove as-unknown casts"
```

---

## Task 3: Add Zod validation to all API routes

**Files:**
- Modify: `app/api/orchestrate/route.ts`
- Modify: `app/api/lroc/route.ts`
- Modify: `app/api/jsc-samples/route.ts`
- Modify: `app/api/nasa-images/route.ts`
- Modify: `app/api/psr-data/route.ts`
- Modify: `app/api/svs-illumination/route.ts`

- [ ] **Step 1: Replace manual validation in `app/api/orchestrate/route.ts` with Zod**

Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { getLocationById } from '@/components/globe/locations'
import { runOrchestrator } from '@/lib/orchestrator/run'
import { createSseResponse } from '@/lib/orchestrator/sse'

const checkRateLimit = rateLimit(60_000, 10)

const RequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  locationId: z.string().min(1),
  imageAssetIds: z.array(z.string()).max(4),
})

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.') ?? ''
    const error = path ? `${path}: ${issue!.message}` : issue?.message ?? 'Invalid request body'
    return NextResponse.json({ error }, { status: 400 })
  }

  const { query, locationId, imageAssetIds } = parsed.data

  const location = getLocationById(locationId)
  if (!location) {
    return NextResponse.json({ error: 'Unknown locationId' }, { status: 400 })
  }

  const hasImages = imageAssetIds.length > 0

  return createSseResponse(async (emitter) => {
    await runOrchestrator({ query, location, hasImages, imageAssetIds, emit: (e) => emitter.emit(e) })
  }, 120_000)
}
```

- [ ] **Step 2: Add Zod validation to `app/api/lroc/route.ts`**

Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { LrocResponse, LrocErrorResponse } from '@/lib/types/nasa'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchLrocProducts, INSTRUMENT_NAC } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const QuerySchema = z.object({
  lat: z.coerce.number().finite(),
  lon: z.coerce.number().finite(),
})

export async function GET(req: NextRequest): Promise<NextResponse<LrocResponse | LrocErrorResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as NextResponse<LrocResponse | LrocErrorResponse>

  const parsed = QuerySchema.safeParse({
    lat: req.nextUrl.searchParams.get('lat'),
    lon: req.nextUrl.searchParams.get('lon'),
  })

  if (!parsed.success) {
    return NextResponse.json({ wac: [], nac: [] }, { status: 400 })
  }

  const { lat, lon } = parsed.data

  try {
    const products = await fetchLrocProducts(lat, lon)
    const nac = products.filter((p) => p.instrument === INSTRUMENT_NAC)
    const wac = products.filter((p) => p.instrument !== INSTRUMENT_NAC)

    return NextResponse.json(
      { wac, nac },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    )
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.error('[lroc] ODE request timed out', { errorType: 'TIMEOUT', lat, lon })
      return NextResponse.json({ error: 'LROC data unavailable', code: 'TIMEOUT', results: [] })
    }
    if (err instanceof UpstreamError) {
      console.error('[lroc] ODE upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon })
    } else {
      console.error('[lroc] unexpected error', { lat, lon }, err)
    }
    return NextResponse.json({ error: 'LROC data unavailable', code: 'UPSTREAM_ERROR', results: [] })
  }
}
```

> **Note:** The five GET routes that return `NextResponse<SpecificType>` still need a cast after the rate-limit check because the function signature declares a specific generic. The cast is now `as NextResponse<T>` (not `as unknown as`) since `Response` is already the correct supertype — TypeScript just needs the narrowing hint for the declared return type. This is minimal and correct.

- [ ] **Step 3: Add Zod validation to `app/api/jsc-samples/route.ts`**

Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { JscSamplesResponse, JscSamplesErrorResponse } from '@/lib/types/nasa'
import { TimeoutError, UpstreamError } from '@/lib/utils/fetch-with-timeout'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { findNearestStation } from '@/lib/data/apollo-stations'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchJscSamples, MAX_JSC_DISTANCE_KM } from '@/lib/data-sources/fetch-jsc-samples'

const checkRateLimit = rateLimit(60_000, 100)

const QuerySchema = z.object({
  lat: z.coerce.number().finite(),
  lon: z.coerce.number().finite(),
})

export async function GET(req: NextRequest): Promise<NextResponse<JscSamplesResponse | JscSamplesErrorResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as NextResponse<JscSamplesResponse | JscSamplesErrorResponse>

  const parsed = QuerySchema.safeParse({
    lat: req.nextUrl.searchParams.get('lat'),
    lon: req.nextUrl.searchParams.get('lon'),
  })

  if (!parsed.success) {
    return NextResponse.json({ results: [], nearestMission: null }, { status: 400 })
  }

  const { lat, lon } = parsed.data
  const nearest = findNearestStation(lat, lon)

  if (!nearest || nearest.distanceKm > MAX_JSC_DISTANCE_KM) {
    return NextResponse.json(
      { results: [], nearestMission: null },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    )
  }

  try {
    const results = await fetchJscSamples(lat, lon)

    return NextResponse.json(
      { results, nearestMission: nearest.mission },
      { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
    )
  } catch (err) {
    const jscError = (code: 'TIMEOUT' | 'UPSTREAM_ERROR'): JscSamplesErrorResponse => ({
      error: 'JSC sample data unavailable',
      code,
      results: [],
      nearestMission: null,
    })
    if (err instanceof TimeoutError) {
      console.error('[jsc-samples] JSC request timed out', { errorType: 'TIMEOUT', lat, lon, mission: nearest.mission, station: nearest.station })
      return NextResponse.json(jscError('TIMEOUT'))
    }
    if (err instanceof UpstreamError) {
      console.error('[jsc-samples] JSC upstream error', { errorType: 'UPSTREAM_ERROR', statusCode: err.statusCode, lat, lon, mission: nearest.mission, station: nearest.station })
    } else {
      console.error('[jsc-samples] unexpected error', { lat, lon }, err)
    }
    return NextResponse.json(jscError('UPSTREAM_ERROR'))
  }
}
```

- [ ] **Step 4: Add Zod validation to `app/api/nasa-images/route.ts`**

Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { NasaImage, NasaImagesResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchNasaImages } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const SPARSE_THRESHOLD = 2

const QuerySchema = z.object({
  q: z.string().trim().min(1),
})

export async function GET(req: NextRequest): Promise<NextResponse<NasaImagesResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as NextResponse<NasaImagesResponse>

  const parsed = QuerySchema.safeParse({ q: req.nextUrl.searchParams.get('q') })
  if (!parsed.success) {
    return NextResponse.json(
      { images: [], limitedCoverage: true },
      { status: 400 }
    )
  }

  let images: NasaImage[] = []
  try {
    images = await fetchNasaImages(parsed.data.q)
  } catch (err) {
    console.warn('[nasa-images] fetch failed, returning empty', err)
  }
  return NextResponse.json(
    { images, limitedCoverage: images.length < SPARSE_THRESHOLD },
    { headers: { 'Cache-Control': CACHE_CONTROL_1H } }
  )
}
```

- [ ] **Step 5: Add Zod validation to `app/api/psr-data/route.ts`**

Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { PsrDataResponse, PsrDataErrorResponse } from '@/lib/types/nasa'
import { CACHE_CONTROL_1H } from '@/lib/constants/cache'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchPsrData } from '@/lib/data-sources'

const checkRateLimit = rateLimit(60_000, 100)

const QuerySchema = z.object({
  lat: z.coerce.number().finite(),
  lon: z.coerce.number().finite(),
})

export async function GET(req: NextRequest): Promise<NextResponse<PsrDataResponse | PsrDataErrorResponse>> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse as NextResponse<PsrDataResponse | PsrDataErrorResponse>

  const parsed = QuerySchema.safeParse({
    lat: req.nextUrl.searchParams.get('lat'),
    lon: req.nextUrl.searchParams.get('lon'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'lat and lon are required', code: 'INVALID_PARAMS', lampProducts: [], psrSummary: null },
      { status: 400 },
    )
  }

  const data = await fetchPsrData(parsed.data.lat, parsed.data.lon)
  return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_CONTROL_1H } })
}
```

- [ ] **Step 6: Add Zod validation to `app/api/svs-illumination/route.ts`**

Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { IlluminationWindow, IlluminationWindowsErrorResponse } from '@/lib/types/nasa'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { fetchIlluminationWindows } from '@/lib/data-sources'

export const dynamic = 'force-dynamic'

const checkRateLimit = rateLimit(60_000, 100)

const QuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
})

export async function GET(
  request: NextRequest,
): Promise<NextResponse<IlluminationWindow[] | IlluminationWindowsErrorResponse>> {
  const rateLimitResponse = checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse as NextResponse<IlluminationWindow[] | IlluminationWindowsErrorResponse>

  const parsed = QuerySchema.safeParse({
    lat: request.nextUrl.searchParams.get('lat'),
    lon: request.nextUrl.searchParams.get('lon'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'lat must be in [-90, 90] and lon must be in [-180, 180]', code: 'INVALID_PARAMS' as const },
      { status: 400 },
    )
  }

  try {
    const windows = await fetchIlluminationWindows(parsed.data.lat, parsed.data.lon)
    return NextResponse.json(windows, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[svs-illumination] failed to load SVS dataset', err)
    return NextResponse.json(
      { error: 'SVS illumination data unavailable', code: 'FETCH_FAILED' as const },
      { status: 502 },
    )
  }
}
```

- [ ] **Step 7: Simplify `app/api/synthesize/route.ts` using `SseEmitter<BriefStreamEvent>`**

The current route has a private `encoder` and a `sseEvent()` helper that duplicate logic from `lib/sse.ts`. Replace them with `SseEmitter<BriefStreamEvent>`. The `ReadableStream` construction stays — `createSseResponse` is not shared here because its timeout fallback emits orchestrator-specific event shapes. Full file after edit:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { getLocationById } from '@/components/globe/locations'
import { runDataIngest } from '@/lib/orchestrator/data-ingest'
import { deriveDataCompleteness } from '@/lib/synthesize/completeness'
import { runSynthesis } from '@/lib/synthesize/run'
import { SseEmitter } from '@/lib/sse'
import type { BriefStreamEvent } from '@/lib/types/brief'

const checkRateLimit = rateLimit(60_000, 5)

const RequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  locationId: z.string().min(1),
  agentOutputs: z.record(z.string(), z.string()),
  activeAgents: z.array(z.string()),
})

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.') ?? ''
    const error = path ? `${path}: ${issue!.message}` : issue?.message ?? 'Invalid request body'
    return NextResponse.json({ error }, { status: 400 })
  }
  const { query, locationId, agentOutputs, activeAgents } = parsed.data

  const location = getLocationById(locationId)
  if (!location) {
    return NextResponse.json({ error: 'Unknown locationId' }, { status: 400 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emitter = new SseEmitter<BriefStreamEvent>(controller)
      try {
        const dataContext = await runDataIngest({
          location,
          emit: () => undefined,
        })
        const completeness = deriveDataCompleteness(dataContext)
        const generatedAt = new Date().toISOString()

        for await (const event of runSynthesis({
          locationName: dataContext.location.name,
          lat: dataContext.location.lat,
          lon: dataContext.location.lon,
          isProposed: dataContext.location.isProposed,
          query,
          generatedAt,
          completeness,
          activeAgents,
          agentOutputs,
        })) {
          emitter.emit(event)
        }
      } catch (err) {
        emitter.emit({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          partial: undefined,
        })
      } finally {
        emitter.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Run all API route tests**

```bash
npx vitest run app/api
```
Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add app/api/orchestrate/route.ts \
  app/api/synthesize/route.ts \
  app/api/lroc/route.ts \
  app/api/jsc-samples/route.ts \
  app/api/nasa-images/route.ts \
  app/api/psr-data/route.ts \
  app/api/svs-illumination/route.ts
git commit -m "refactor: standardize all API routes on Zod validation and shared createSseResponse"
```

---

## Task 4: Collapse specialist wrappers into declarative table

**Files:**
- Modify: `lib/orchestrator/specialists.ts`
- Delete: `lib/orchestrator/agents/mineralogy.ts`
- Delete: `lib/orchestrator/agents/orbit.ts`
- Delete: `lib/orchestrator/agents/mission-history.ts`
- Modify: `lib/orchestrator/specialists.test.ts`
- Modify: `lib/orchestrator/agents/mineralogy.test.ts`
- Modify: `lib/orchestrator/agents/orbit.test.ts`
- Modify: `lib/orchestrator/agents/mission-history.test.ts`

- [ ] **Step 1: Rewrite `lib/orchestrator/specialists.ts` with config table**

```ts
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'
import type { AgentId } from '@/lib/constants/agents'
import { AGENTS } from '@/lib/constants/agents'
import { runStubAgent } from './stub-agents'
import { runImageryAgent } from './agents/imagery'
import { runSpecialistStream } from './agents/runSpecialistStream'
import { buildMineralogyPrompt } from './agents/mineralogy-prompt'
import { buildOrbitPrompt } from './agents/orbit-prompt'
import { buildMissionHistoryPrompt } from './agents/mission-history-prompt'
import type { CitationSource } from './agents/parseInlineTags'

export interface SpecialistContext {
  dataContext: DataContext
  imageAssetIds: string[]
}

interface ProseSpecialistConfig {
  buildPrompt: (opts: { dataContext: DataContext }) => { system: string; user: string }
  citationSource: CitationSource
  forwardConfidence: boolean
}

const PROSE_SPECIALIST_CONFIG: Partial<Record<AgentId, ProseSpecialistConfig>> = {
  mineralogy:        { buildPrompt: buildMineralogyPrompt,     citationSource: 'jsc-sample',  forwardConfidence: true  },
  orbit:             { buildPrompt: buildOrbitPrompt,          citationSource: 'svs',         forwardConfidence: false },
  'mission-history': { buildPrompt: buildMissionHistoryPrompt, citationSource: 'nasa-image',  forwardConfidence: false },
}

export async function runSpecialist(
  agentId: AgentId,
  context: SpecialistContext,
  emit: (event: OrchestratorEvent) => void,
): Promise<void> {
  const { dataContext, imageAssetIds } = context

  const agent = AGENTS.find((a) => a.id === agentId)
  if (!agent) return

  if (agent.isStub) {
    void runStubAgent(agentId, emit)
    return
  }

  if (agentId === 'imagery') {
    await runImageryAgent({ dataContext, imageAssetIds, emit })
    return
  }

  const config = PROSE_SPECIALIST_CONFIG[agentId]
  if (!config) return

  const { system, user } = config.buildPrompt({ dataContext })
  await runSpecialistStream({
    agent: agentId,
    system,
    user,
    citationSource: config.citationSource,
    forwardConfidence: config.forwardConfidence,
    emit,
  })
}
```

- [ ] **Step 2: Delete the three wrapper files**

```bash
rm lib/orchestrator/agents/mineralogy.ts
rm lib/orchestrator/agents/orbit.ts
rm lib/orchestrator/agents/mission-history.ts
```

- [ ] **Step 3: Update `lib/orchestrator/specialists.test.ts`**

The old test mocked the three wrapper modules. The new test mocks `runSpecialistStream` directly and verifies the config table routes correctly. Full replacement:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DataContext, OrchestratorEvent } from '@/lib/types/agent'

vi.mock('./agents/runSpecialistStream', () => ({
  runSpecialistStream: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./agents/imagery', () => ({ runImageryAgent: vi.fn().mockResolvedValue(undefined) }))

import { runSpecialist } from './specialists'
import { runSpecialistStream } from './agents/runSpecialistStream'
import { runImageryAgent } from './agents/imagery'

const mockRunSpecialistStream = vi.mocked(runSpecialistStream)
const mockRunImageryAgent = vi.mocked(runImageryAgent)

const fakeDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runSpecialist', () => {
  it('routes thermal (stub) — emits a stub chunk', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('thermal', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).toHaveBeenCalledTimes(1)
    const call = emit.mock.calls[0]?.[0]
    expect(call).toBeDefined()
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('thermal')
      expect(call.text).toContain('Thermal analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes topography (stub) — emits a stub chunk', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('topography', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    const call = emit.mock.calls[0]?.[0]
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('topography')
      expect(call.text).toContain('Topography analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes hazards (stub) — emits a stub chunk', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('hazards', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    const call = emit.mock.calls[0]?.[0]
    if (call && call.type === 'agent-chunk') {
      expect(call.agent).toBe('hazards')
      expect(call.text).toContain('Hazards analysis (V2)')
    } else {
      expect(call?.type).toBe('agent-chunk')
    }
  })

  it('routes mineralogy — calls runSpecialistStream with agent=mineralogy, source=jsc-sample, forwardConfidence=true', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mineralogy', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('mineralogy')
    expect(opts?.citationSource).toBe('jsc-sample')
    expect(opts?.forwardConfidence).toBe(true)
    expect(opts?.emit).toBe(emit)
    expect(typeof opts?.system).toBe('string')
    expect(typeof opts?.user).toBe('string')
  })

  it('routes orbit — calls runSpecialistStream with agent=orbit, source=svs, forwardConfidence=false', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('orbit', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('orbit')
    expect(opts?.citationSource).toBe('svs')
    expect(opts?.forwardConfidence).toBe(false)
  })

  it('routes mission-history — calls runSpecialistStream with agent=mission-history, source=nasa-image, forwardConfidence=false', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('mission-history', { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(mockRunSpecialistStream).toHaveBeenCalledTimes(1)
    const opts = mockRunSpecialistStream.mock.calls[0]?.[0]
    expect(opts?.agent).toBe('mission-history')
    expect(opts?.citationSource).toBe('nasa-image')
    expect(opts?.forwardConfidence).toBe(false)
  })

  it('routes imagery — delegates to runImageryAgent with imageAssetIds', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('imagery', { dataContext: fakeDataContext, imageAssetIds: ['AS16-M-0273'] }, emit)
    expect(mockRunImageryAgent).toHaveBeenCalledWith({
      dataContext: fakeDataContext,
      imageAssetIds: ['AS16-M-0273'],
      emit,
    })
  })

  it('unknown agentId — emits nothing and does not throw', async () => {
    const emit = vi.fn<(event: OrchestratorEvent) => void>()
    await runSpecialist('unknown-agent' as Parameters<typeof runSpecialist>[0], { dataContext: fakeDataContext, imageAssetIds: [] }, emit)
    expect(emit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Migrate `lib/orchestrator/agents/mineralogy.test.ts` — remove the wrapper test, keep the prompt tests**

The `runMineralogyAgent` function no longer exists; the wrapper is covered by `specialists.test.ts`. Delete the `runMineralogyAgent` describe block and keep only the `buildMineralogyPrompt` tests. Full replacement:

```ts
import { describe, it, expect } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import { buildMineralogyPrompt } from './mineralogy-prompt'

const baseDataContext: DataContext = {
  location: {
    name: 'Shackleton',
    lat: -89.9,
    lon: 0,
    diameterKm: 21,
    significanceNote: 'Artemis I landing zone candidate, near south pole',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

describe('buildMineralogyPrompt', () => {
  it('jscSamples null — user msg contains "No sample data available"', () => {
    const { user } = buildMineralogyPrompt({ dataContext: { ...baseDataContext, jscSamples: null } })
    expect(user).toContain('No sample data available')
  })

  it('far-side location — user msg contains "No Apollo station within 500 km"', () => {
    const farSideContext: DataContext = {
      ...baseDataContext,
      location: {
        name: 'Far Side',
        lat: 0,
        lon: 180,
        diameterKm: null,
        significanceNote: 'Far side test location',
        isProposed: false,
      },
      jscSamples: null,
    }
    const { user } = buildMineralogyPrompt({ dataContext: farSideContext })
    expect(user).toContain('No Apollo station within 500 km')
  })
})
```

- [ ] **Step 5: Migrate `lib/orchestrator/agents/orbit.test.ts` — remove wrapper test, keep prompt tests**

Full replacement:

```ts
import { describe, it, expect } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import type { IlluminationWindow } from '@/lib/types/nasa'
import { buildOrbitPrompt } from './orbit-prompt'

const baseDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater; bright ray system visible from Earth with naked eye',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

const sampleWindows: IlluminationWindow[] = [
  {
    date: '2026-04-10',
    sunriseUtc: '2026-04-10T06:00:00Z',
    sunsetUtc: '2026-04-10T20:00:00Z',
    illuminatedHours: 14,
    solarElevationDeg: 25,
    permanentlyShadowed: false,
  },
  {
    date: '2026-04-11',
    sunriseUtc: '2026-04-11T06:00:00Z',
    sunsetUtc: '2026-04-11T20:00:00Z',
    illuminatedHours: 14,
    solarElevationDeg: 27,
    permanentlyShadowed: false,
  },
]

describe('buildOrbitPrompt', () => {
  it('illuminationWindows null — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: null } })
    expect(user).toContain('Illumination data unavailable')
  })

  it('illuminationWindows empty array — user msg contains "Illumination data unavailable"', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: [] } })
    expect(user).toContain('Illumination data unavailable')
  })

  it('illuminationWindows with data — user msg contains serialized JSON', () => {
    const { user } = buildOrbitPrompt({ dataContext: { ...baseDataContext, illuminationWindows: sampleWindows } })
    expect(user).toContain(JSON.stringify(sampleWindows))
  })

  it('isProposed location — user msg contains "proposed name"', () => {
    const proposedContext: DataContext = {
      ...baseDataContext,
      location: {
        name: 'Carroll',
        lat: 18.84,
        lon: -86.51,
        diameterKm: null,
        significanceNote: 'Sits near the near/far side boundary.',
        isProposed: true,
      },
    }
    const { user } = buildOrbitPrompt({ dataContext: proposedContext })
    expect(user).toContain('proposed name')
  })
})
```

- [ ] **Step 6: Migrate `lib/orchestrator/agents/mission-history.test.ts` — remove wrapper test, keep prompt tests**

Full replacement:

```ts
import { describe, it, expect } from 'vitest'
import type { DataContext } from '@/lib/types/agent'
import { buildMissionHistoryPrompt } from './mission-history-prompt'

const baseDataContext: DataContext = {
  location: {
    name: 'Tycho',
    lat: -43,
    lon: -11,
    diameterKm: 85,
    significanceNote: 'Most prominent young crater; bright ray system visible from Earth with naked eye',
    isProposed: false,
  },
  nasaImages: null,
  lrocProducts: null,
  jscSamples: null,
  illuminationWindows: null,
}

describe('buildMissionHistoryPrompt', () => {
  it('Carroll location — user msg contains naming story and "pending IAU"', () => {
    const carrollContext: DataContext = {
      location: {
        name: 'Carroll',
        lat: 18.84,
        lon: -86.51,
        diameterKm: null,
        significanceNote: 'Sits near the near/far side boundary — visible from Earth at certain libration angles.',
        isProposed: true,
      },
      nasaImages: null,
      lrocProducts: null,
      jscSamples: null,
      illuminationWindows: null,
    }
    const { user } = buildMissionHistoryPrompt({ dataContext: carrollContext })
    expect(user).toContain('NAMING_STORY')
    expect(user).toContain('Carroll Taylor Wiseman')
    expect(user).toContain('bright spot on the moon')
  })

  it('Integrity location — user msg contains naming story and "distance record"', () => {
    const integrityContext: DataContext = {
      location: {
        name: 'Integrity',
        lat: 2.66,
        lon: -104.92,
        diameterKm: null,
        significanceNote: 'Located just northwest of Orientale basin on the far side of the Moon.',
        isProposed: true,
      },
      nasaImages: null,
      lrocProducts: null,
      jscSamples: null,
      illuminationWindows: null,
    }
    const { user } = buildMissionHistoryPrompt({ dataContext: integrityContext })
    expect(user).toContain('NAMING_STORY')
    expect(user).toContain('distance record')
    expect(user).toContain('Orion spacecraft')
  })

  it('non-proposed location — no NAMING_STORY block in user msg', () => {
    const { user } = buildMissionHistoryPrompt({ dataContext: baseDataContext })
    expect(user).not.toContain('NAMING_STORY')
  })

  it('no NASA images — user msg contains "No NASA image records available"', () => {
    const { user } = buildMissionHistoryPrompt({ dataContext: { ...baseDataContext, nasaImages: null } })
    expect(user).toContain('No NASA image records available')
  })

  it('far-side location — user msg contains "No Apollo station within 500 km"', () => {
    const farSideContext: DataContext = {
      ...baseDataContext,
      location: {
        name: 'Far Side',
        lat: 0,
        lon: 180,
        diameterKm: null,
        significanceNote: 'Far side test location',
        isProposed: false,
      },
      jscSamples: null,
    }
    const { user } = buildMissionHistoryPrompt({ dataContext: farSideContext })
    expect(user).toContain('No Apollo station within 500 km')
  })
})
```

- [ ] **Step 7: Run orchestrator tests**

```bash
npx vitest run lib/orchestrator
```
Expected: all tests pass.

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add lib/orchestrator/specialists.ts \
  lib/orchestrator/specialists.test.ts \
  lib/orchestrator/agents/mineralogy.test.ts \
  lib/orchestrator/agents/orbit.test.ts \
  lib/orchestrator/agents/mission-history.test.ts
git rm lib/orchestrator/agents/mineralogy.ts \
  lib/orchestrator/agents/orbit.ts \
  lib/orchestrator/agents/mission-history.ts
git commit -m "refactor: collapse specialist wrappers into declarative config table in specialists.ts"
```

---

## Task 5: Unified confidence badge component

**Files:**
- Create: `components/ui/confidence-badge.tsx`
- Delete: `components/screen3/ConfidenceBadge.tsx`
- Delete: `components/screen4/BriefConfidenceBadge.tsx`
- Modify: `components/screen3/AgentBlock.tsx`
- Modify: `components/screen4/FindingItem.tsx`

- [ ] **Step 1: Create `components/ui/confidence-badge.tsx`**

```tsx
import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  className?: string
}

const LEVEL_VARIANT = {
  high: 'success',
  medium: 'warning',
  low: 'default',
} as const

const LEVEL_DESCRIPTIONS: Record<ConfidenceLevel, string> = {
  high: 'Backed by Apollo sample data within ~50 km of this location.',
  medium: 'Reasoned by analogy from a nearby Apollo station (more than 50 km, same terrain type).',
  low: 'General regional inference — no direct sample support.',
}

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={LEVEL_VARIANT[level]} className={className}>
          {level}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-luna-fg">
          <span className="uppercase tracking-[0.08em]">{level}</span> confidence
        </div>
        <div className="text-luna-fg-3 mt-0.5">{LEVEL_DESCRIPTIONS[level]}</div>
      </TooltipContent>
    </Tooltip>
  )
}
```

- [ ] **Step 2: Update `components/screen3/AgentBlock.tsx` to import from `@/components/ui/confidence-badge`**

Change line 5 from:
```ts
import { ConfidenceBadge } from './ConfidenceBadge'
```
to:
```ts
import { ConfidenceBadge } from '@/components/ui/confidence-badge'
```
No other changes — the prop interface (`level`) is identical.

- [ ] **Step 3: Update `components/screen4/FindingItem.tsx` to use the shared component**

Replace the `BriefConfidenceBadge` import and usage. `Finding['confidence']` is title-case (`'High' | 'Medium' | 'Low'`), so convert at the call site with `.toLowerCase()`.

Change:
```ts
import { BriefConfidenceBadge } from './BriefConfidenceBadge'
```
to:
```ts
import { ConfidenceBadge, type ConfidenceLevel } from '@/components/ui/confidence-badge'
```

Change the usage:
```tsx
<BriefConfidenceBadge
  confidence={finding.confidence}
  className="mt-[2px]"
/>
```
to:
```tsx
<ConfidenceBadge
  level={finding.confidence.toLowerCase() as ConfidenceLevel}
  className="mt-[2px] shrink-0 whitespace-nowrap inline-flex uppercase"
/>
```

> Note: the `shrink-0 whitespace-nowrap inline-flex uppercase` classes from the old `BriefConfidenceBadge` are carried forward as `className` so the screen4 layout is unchanged.

- [ ] **Step 4: Delete the old components**

```bash
rm components/screen3/ConfidenceBadge.tsx
rm components/screen4/BriefConfidenceBadge.tsx
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/confidence-badge.tsx \
  components/screen3/AgentBlock.tsx \
  components/screen4/FindingItem.tsx
git rm components/screen3/ConfidenceBadge.tsx \
  components/screen4/BriefConfidenceBadge.tsx
git commit -m "refactor: merge ConfidenceBadge and BriefConfidenceBadge into shared ui component"
```

---

## Task 6: Fix `JSON.stringify` in `useAgentStream` deps

**Files:**
- Modify: `components/screen3/useAgentStream.ts`

- [ ] **Step 1: Replace `JSON.stringify` dep with `useMemo` key in `useAgentStream.ts`**

Add `useMemo` to the import (it's already imported in this file alongside `useReducer` and `useEffect`). Change the top of the hook:

Current imports line:
```ts
import { useReducer, useEffect } from 'react'
```
Change to:
```ts
import { useReducer, useEffect, useMemo } from 'react'
```

Inside `useAgentStream`, add the memo before the effect, and update the deps array. Change:
```ts
export function useAgentStream(input: {
  location: LunarLocation
  query: string
  imageAssetIds: string[]
}): AgentStreamState {
  const [state, dispatch] = useReducer(agentStreamReducer, initialAgentStreamState)

  useEffect(() => {
```
to:
```ts
export function useAgentStream(input: {
  location: LunarLocation
  query: string
  imageAssetIds: string[]
}): AgentStreamState {
  const [state, dispatch] = useReducer(agentStreamReducer, initialAgentStreamState)
  const imageAssetKey = useMemo(() => input.imageAssetIds.join(','), [input.imageAssetIds])

  useEffect(() => {
```

And change the deps array at the bottom of the effect from:
```ts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.location.id, input.query, JSON.stringify(input.imageAssetIds)])
```
to:
```ts
  }, [input.location.id, input.query, imageAssetKey])
```

- [ ] **Step 2: Type-check and run reducer tests**

```bash
npx tsc --noEmit && npx vitest run components/screen3/useAgentStream.reducer.test.ts
```
Expected: no type errors, all reducer tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/screen3/useAgentStream.ts
git commit -m "refactor: replace JSON.stringify dep with useMemo key in useAgentStream"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```
Expected: all tests pass with no failures.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: no errors or new warnings.
