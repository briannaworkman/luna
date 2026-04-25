# Code Quality Cleanup — Design Spec

**Date:** 2026-04-25  
**Scope:** API layer · Orchestration core · UI components  
**Constraint:** No functional changes — all existing behavior is preserved exactly.

---

## Overview

Three layers of the codebase accumulated inconsistencies during feature development. This cleanup addresses them in a single pass:

1. **API layer** — validation strategy, rate-limit cast, SSE duplication
2. **Orchestration core** — three identical specialist wrappers, if-chain dispatch
3. **UI components** — two confidence badge components, JSON.stringify in deps

---

## Section 1 — API Layer

### 1a. Zod validation on all routes

**Problem:** `synthesize/route.ts` uses Zod; `orchestrate/route.ts` uses manual `typeof` checks; the five data routes (`lroc`, `jsc-samples`, `nasa-images`, `psr-data`, `svs-illumination`) have minimal or no validation.

**Change:** Each route gets a Zod schema at the top of the file. Validation rules stay identical — this is a structural change, not a behavioral one. Failed parses extract `issue.path + issue.message` and return `{ error }` with status 400, matching the pattern already in `synthesize`.

**Files changed:**
- `app/api/orchestrate/route.ts` — replace manual checks with Zod schema
- `app/api/lroc/route.ts` — add query-param schema
- `app/api/jsc-samples/route.ts` — add query-param schema
- `app/api/nasa-images/route.ts` — add query-param schema
- `app/api/psr-data/route.ts` — add query-param schema
- `app/api/svs-illumination/route.ts` — add query-param schema

### 1b. Fix rate-limit return type

**Problem:** `rateLimit()` returns `NextResponse | null`, forcing every caller to cast with `as unknown as NextResponse<T>`. This cast appears five times across the codebase.

**Change:** Change `rateLimit()`'s return type to `Response | null`. `Response` is the correct supertype and requires no cast at call sites. Function body unchanged.

**Files changed:**
- `lib/middleware/rate-limit.ts` — return type only
- `app/api/lroc/route.ts`, `app/api/jsc-samples/route.ts`, `app/api/nasa-images/route.ts`, `app/api/psr-data/route.ts`, `app/api/svs-illumination/route.ts` — remove `as unknown as` casts (the two SSE routes already return `Promise<Response>` and need no change)

### 1c. Unify SSE streaming

**Problem:** `synthesize/route.ts` builds a `ReadableStream` inline and defines its own `sseEvent()` helper, duplicating the pattern already encapsulated in `lib/orchestrator/sse.ts`.

**Change:** Move `createSseResponse` to `lib/sse.ts` (neutral location, not tied to orchestrator). Make it generic over event type: `createSseResponse<T>(handler, headers?, timeoutMs?)`. Both `orchestrate` and `synthesize` routes import from `lib/sse.ts`. The synthesize route uses `'no-cache, no-transform'` — passed as a headers override. The inline `sseEvent()` helper in synthesize is deleted.

**Files changed:**
- `lib/sse.ts` — new file with the generic `createSseResponse<T>` and `SseEmitter` implementations
- `lib/orchestrator/sse.ts` — becomes a thin re-export barrel (`export * from '@/lib/sse'`); existing imports and tests require no changes
- `app/api/orchestrate/route.ts` — import `createSseResponse` from `lib/sse.ts`
- `app/api/synthesize/route.ts` — replace inline stream with `createSseResponse`, passing `'no-cache, no-transform'` as headers override

---

## Section 2 — Orchestration Core

### 2a. Collapse specialist wrappers

**Problem:** `runMineralogyAgent`, `runOrbitAgent`, and `runMissionHistoryAgent` are structurally identical — each builds a prompt and calls `runSpecialistStream` with agent-specific config. Three files, zero unique logic.

**Change:** Delete the three wrapper files. Move their configuration into a declarative table in `specialists.ts`:

```ts
const PROSE_SPECIALIST_CONFIG = {
  mineralogy:        { buildPrompt: buildMineralogyPrompt,      citationSource: 'jsc-sample',  forwardConfidence: true  },
  orbit:             { buildPrompt: buildOrbitPrompt,           citationSource: 'svs',         forwardConfidence: false },
  'mission-history': { buildPrompt: buildMissionHistoryPrompt,  citationSource: 'nasa-image',  forwardConfidence: false },
} satisfies Partial<Record<AgentId, ProseSpecialistConfig>>
```

`runSpecialist` looks up config from this table and calls `runSpecialistStream` directly. Imagery keeps its own file (genuinely different: per-image loops, vision calls, synthesis pass).

**Files deleted:**
- `lib/orchestrator/agents/mineralogy.ts`
- `lib/orchestrator/agents/orbit.ts`
- `lib/orchestrator/agents/mission-history.ts`

**Files changed:**
- `lib/orchestrator/specialists.ts` — add config table, remove if-chain

### 2b. Replace if-chain dispatch

**Problem:** `runSpecialist` dispatches to agent runners via sequential `if (agentId === 'x')` blocks.

**Change:** Replaced entirely by the table lookup in 2a. The stub path (`agent.isStub → runStubAgent`) is unchanged.

---

## Section 3 — UI Components

### 3a. Unified confidence badge

**Problem:** Two badge components exist with overlapping logic:
- `components/screen3/ConfidenceBadge.tsx` — lowercase `level: 'high' | 'medium' | 'low'`, includes tooltip
- `components/screen4/BriefConfidenceBadge.tsx` — title-case `confidence: 'High' | 'Medium' | 'Low'`, no tooltip

Both use the same variant mapping (`high → success`, `medium → warning`, `low → default`).

**Change:** Create `components/ui/confidence-badge.tsx` as the single shared component. It accepts lowercase (`'high' | 'medium' | 'low'`) — the existing standard from agent event types. It includes the tooltip from `ConfidenceBadge`. Delete both existing components. Screen4 callers convert title-case strings via `.toLowerCase() as ConfidenceLevel` at the call site.

**Files created:**
- `components/ui/confidence-badge.tsx`

**Files deleted:**
- `components/screen3/ConfidenceBadge.tsx`
- `components/screen4/BriefConfidenceBadge.tsx`

**Files changed:**
- All screen3 and screen4 callers — import from `components/ui/confidence-badge`

### 3b. Fix JSON.stringify in useEffect deps

**Problem:** `useAgentStream` uses `JSON.stringify(input.imageAssetIds)` in the `useEffect` dependency array, with a suppressed lint warning. This is a known antipattern.

**Change:** Derive a stable string key with `useMemo`:

```ts
const imageAssetKey = useMemo(
  () => input.imageAssetIds.join(','),
  [input.imageAssetIds]
)
```

Use `imageAssetKey` in the `useEffect` deps. Remove the `eslint-disable` comment.

**Files changed:**
- `components/screen3/useAgentStream.ts`

---

## Test strategy

All existing tests must continue to pass. Where files are deleted or moved:
- Tests for `mineralogy.ts`, `orbit.ts`, `mission-history.ts` are updated to test via `specialists.ts` (the behavior is the same, the entry point changes)
- SSE tests in `lib/orchestrator/sse.test.ts` are updated to import from `lib/sse.ts`
- No new test files are required — this is structural cleanup, not new behavior

---

## Non-goals

- No changes to prompt content
- No changes to data sources or NASA API integration
- No changes to the `locations.ts` data file
- No changes to routing or page structure
- No new features
