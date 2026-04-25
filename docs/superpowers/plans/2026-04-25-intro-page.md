# Intro Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen atmospheric intro page at `/` and move the existing globe/list view to `/explore`.

**Architecture:** The current `app/page.tsx` (globe view) moves to `app/explore/page.tsx` with two internal navigation strings updated. A new `app/page.tsx` is created as a pure server component — no state, no client code, just markup and a `<Link>` to `/explore`. The TopBar needs no changes.

**Tech Stack:** Next.js App Router, React server components, Tailwind CSS (luna design tokens), `next/link`

---

## File Map

| Action | File | Notes |
|--------|------|-------|
| Create | `app/explore/page.tsx` | Current `app/page.tsx` content, with one navigation fix |
| Create | `app/page.tsx` | New intro page (server component) |
| Modify | `components/screen2/QueryComposer.tsx:57` | `router.push('/')` → `router.push('/explore')` |

---

## Task 1: Move globe view to /explore

**Files:**
- Create: `app/explore/page.tsx`
- Modify: `components/screen2/QueryComposer.tsx`

- [ ] **Step 1: Create the explore directory and move the page**

```bash
mkdir -p app/explore
```

Then create `app/explore/page.tsx` with the full contents below (this is the current `app/page.tsx` with one line changed — `router.replace('/')` on line 32 becomes `router.replace('/explore')`):

```tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { LocationPanel } from '@/components/globe/LocationPanel'
import { useOpenGallery } from '@/providers/LocationSelectionProvider'
import type { LunarLocation } from '@/components/globe/types'
import { FilterBar } from '@/components/screen1/FilterBar'
import { ViewToggle, type ViewMode } from '@/components/screen1/ViewToggle'
import { LocationListView } from '@/components/screen1/LocationListView'
import { filterLocations, type LocationFilter } from '@/components/screen1/filterLocations'
import { LOCATIONS } from '@/components/globe/locations'

const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

const HINT_MESSAGES: Record<string, string> = {
  'select-location': 'Select a location to begin.',
}

function HintBanner() {
  const router = useRouter()
  const search = useSearchParams()
  const hint = search.get('hint')
  const message = hint ? HINT_MESSAGES[hint] : null

  const dismiss = useCallback(() => {
    router.replace('/explore')
  }, [router])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(dismiss, 4500)
    return () => clearTimeout(t)
  }, [message, dismiss])

  if (!message) return null

  return (
    <div
      role="status"
      className="fixed top-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded bg-luna-base-2 border border-luna-hairline font-mono text-[11px] tracking-[0.14em] uppercase text-luna-cyan shadow-lg"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss hint"
        className="text-luna-fg-3 hover:text-luna-fg transition-colors"
      >
        <X size={12} strokeWidth={1.5} />
      </button>
    </div>
  )
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LunarLocation | null>(null)
  const deselectRef = useRef<(() => void) | null>(null)
  const openGallery = useOpenGallery()

  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<LocationFilter>('all')

  const filteredLocations = useMemo(
    () => filterLocations(LOCATIONS, filter),
    [filter],
  )

  const handleLocationSelect = useCallback((location: LunarLocation | null) => {
    setSelectedLocation(location)
  }, [])

  const handlePanelClose = useCallback(() => {
    deselectRef.current?.()
    setSelectedLocation(null)
  }, [])

  const handleOpenGallery = useCallback(
    (location: LunarLocation) => {
      openGallery(location, 'navigate')
    },
    [openGallery],
  )

  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView)
    if (newView === 'list') {
      deselectRef.current?.()
      setSelectedLocation(null)
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <HintBanner />
      </Suspense>
      <main className="fixed inset-x-0 bottom-0 top-14 flex flex-col bg-luna-base">
        {/* Control strip: filters left, view toggle right */}
        <div className="border-b border-luna-hairline flex-shrink-0">
          <div className="flex items-center gap-3 px-8 py-2.5 max-w-6xl mx-auto">
            <FilterBar activeFilter={filter} onFilterChange={setFilter} />
            <ViewToggle activeView={view} onViewChange={handleViewChange} />
          </div>
        </div>

        {view === 'list' ? (
          <LocationListView
            locations={filteredLocations}
            onLocationSelect={handleOpenGallery}
          />
        ) : (
          <div className="flex-1 relative">
            <LunarGlobe
              locations={filteredLocations}
              onLocationSelect={handleLocationSelect}
              deselectRef={deselectRef}
            />
            <LocationPanel
              location={selectedLocation}
              onClose={handlePanelClose}
              onResearch={handleOpenGallery}
            />
          </div>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 2: Update QueryComposer navigation**

In `components/screen2/QueryComposer.tsx` line 57, change:

```ts
router.push('/')
```

to:

```ts
router.push('/explore')
```

- [ ] **Step 3: Verify with lint**

```bash
npm run lint
```

Expected: no errors. Fix any that appear before continuing.

- [ ] **Step 4: Start dev server and verify /explore loads**

```bash
npm run dev
```

Navigate to `http://localhost:3000/explore`. The globe/list view should load exactly as before. Navigate to `http://localhost:3000` — the old globe view still shows here (the old `app/page.tsx` hasn't been replaced yet; that happens in Task 2 — this is expected).

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/explore/page.tsx components/screen2/QueryComposer.tsx
git commit -m "feat: move globe view to /explore"
```

---

## Task 2: Create the intro page at /

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Create the intro page**

Create `app/page.tsx` with the following content:

```tsx
import Link from 'next/link'

const STARS: { w: number; h: number; top: string; left: string; opacity: number; cyan?: true }[] = [
  { w: 2, h: 2, top: '9%',  left: '7%',  opacity: 0.45 },
  { w: 1, h: 1, top: '16%', left: '22%', opacity: 0.35 },
  { w: 2, h: 2, top: '11%', left: '38%', opacity: 0.4,  cyan: true },
  { w: 1, h: 1, top: '7%',  left: '55%', opacity: 0.5  },
  { w: 2, h: 2, top: '19%', left: '71%', opacity: 0.3  },
  { w: 1, h: 1, top: '13%', left: '84%', opacity: 0.45 },
  { w: 2, h: 2, top: '30%', left: '5%',  opacity: 0.3  },
  { w: 1, h: 1, top: '35%', left: '91%', opacity: 0.4,  cyan: true },
  { w: 2, h: 2, top: '72%', left: '11%', opacity: 0.25 },
  { w: 1, h: 1, top: '80%', left: '30%', opacity: 0.3  },
  { w: 2, h: 2, top: '76%', left: '61%', opacity: 0.2  },
  { w: 1, h: 1, top: '85%', left: '78%', opacity: 0.25 },
  { w: 2, h: 2, top: '68%', left: '88%', opacity: 0.3,  cyan: true },
]

const ARC_RINGS = [
  { size: 320, opacity: 0.12 },
  { size: 440, opacity: 0.06 },
  { size: 560, opacity: 0.03 },
]

const BULLETS = [
  'Pick from 17 Artemis candidate landing sites on an interactive globe',
  'Ask any question — specialist agents pull from real NASA sources in real time',
  'Get a cited research brief in under a minute',
]

export default function IntroPage() {
  return (
    <main className="fixed inset-x-0 bottom-0 top-14 flex items-center justify-center overflow-hidden bg-luna-base">
      {/* Radial gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, #0D1E3A 0%, #050C1A 62%)' }}
      />

      {/* Star field */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.w,
              height: s.h,
              top: s.top,
              left: s.left,
              opacity: s.opacity,
              background: s.cyan ? 'var(--luna-cyan)' : 'var(--luna-fg)',
            }}
          />
        ))}
      </div>

      {/* Lunar arc rings */}
      <div className="pointer-events-none absolute -bottom-[120px] -right-[120px]">
        {ARC_RINGS.map(({ size, opacity }) => (
          <div
            key={size}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size,
              height: size,
              border: `1px solid rgba(125, 211, 252, ${opacity})`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex max-w-[520px] flex-col items-center px-6 text-center">
        {/* Location dots */}
        <div className="mb-7 flex items-center gap-2.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ border: '1px solid rgba(125, 211, 252, 0.35)', opacity: 0.4 }}
          />
          <div className="h-1.5 w-1.5 rounded-full border border-luna-cyan opacity-70" />
          <div
            className="h-1.5 w-1.5 rounded-full bg-luna-cyan"
            style={{ boxShadow: '0 0 6px rgba(125, 211, 252, 0.5)' }}
          />
          <div className="h-1.5 w-1.5 rounded-full border border-luna-cyan opacity-70" />
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ border: '1px solid rgba(125, 211, 252, 0.35)', opacity: 0.4 }}
          />
        </div>

        <h1
          className="mb-4 font-sans font-semibold leading-[1.06] tracking-[-0.025em] text-luna-fg"
          style={{ fontSize: 'clamp(34px, 5vw, 50px)' }}
        >
          The gap between curiosity
          <br />
          and NASA data, closed.
        </h1>

        <p className="mb-8 text-[15px] tracking-[-0.01em] text-luna-fg-3">
          A multi-agent co-pilot for NASA&apos;s lunar data.
        </p>

        <ul className="mb-10 flex w-full max-w-[380px] flex-col items-start gap-2.5">
          {BULLETS.map((text) => (
            <li key={text} className="flex items-start gap-3 text-[14px] leading-snug text-luna-fg-2">
              <span className="mt-px flex-shrink-0 font-mono text-luna-cyan">—</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/explore"
          className="inline-flex items-center rounded-[3px] bg-luna-fg px-7 py-[11px] font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-luna-base transition-opacity hover:opacity-[0.88]"
        >
          Get Started →
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify with lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify the full flow**

```bash
npm run dev
```

Check all three paths:
1. `http://localhost:3000` — intro page renders: dots, headline, subline, 3 bullets, white CTA button
2. Click "Get Started →" — navigates to `http://localhost:3000/explore` — globe/list view loads correctly
3. Click "LUNA" in the TopBar from `/explore` — returns to `http://localhost:3000` (the intro page)

Stop the dev server.

- [ ] **Step 4: Run build to catch any TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add intro page at /"
```
