# Location Selection Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-screen globe as the default entry point with a filterable card-grid list view, while keeping the globe accessible via a toggle; filter state is shared across both views.

**Architecture:** A `filterLocations` pure function computes the filtered subset from `LOCATIONS`; `app/page.tsx` owns `view` and `filter` state and passes the computed subset to both `LocationListView` and `LunarGlobe`. A combined control strip (FilterBar + ViewToggle) renders below the fixed TopBar in both views. Clicking a card opens the image gallery directly, skipping the LocationPanel.

**Tech Stack:** Next.js App Router, React, Tailwind CSS (`luna-*` tokens), Vitest (node environment — no jsdom, component tests are not possible), TypeScript strict mode, pnpm.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `components/globe/types.ts` | Add `type`, `missionName`, `siteName`, `landingYear` to `LunarLocation` |
| Modify | `components/globe/locations.ts` | Backfill `type` on all 17 existing entries |
| Create | `components/screen1/filterLocations.ts` | Pure filter function — `filterLocations(locations, filter)` |
| Create | `components/screen1/filterLocations.test.ts` | Unit tests for filter logic |
| Create | `components/screen1/FilterBar.tsx` | Filter tab strip + ViewToggle row |
| Create | `components/screen1/ViewToggle.tsx` | List \| Globe segmented control |
| Create | `components/screen1/LocationCard.tsx` | Single location card |
| Create | `components/screen1/LocationListView.tsx` | 2-col card grid |
| Modify | `components/globe/LunarGlobe.tsx` | Add optional `locations` prop (defaults to LOCATIONS) |
| Modify | `app/page.tsx` | Wire view/filter state, render conditional views |

---

## Task 1: Extend LunarLocation type

**Files:**
- Modify: `components/globe/types.ts`

- [ ] **Step 1: Update the type**

Replace the entire file with:

```ts
export type LocationType = 'crater' | 'apollo' | 'robotic' | 'proposed'

export interface LunarLocation {
  id: string
  name: string
  lat: number
  lon: number
  diameter?: string
  significance: string
  namingStory?: string
  isProposed: boolean
  coords: string
  region: string
  namedBy?: string[]
  citations?: string[]
  suggestedQuestions?: string[]
  type: LocationType
  missionName?: string
  siteName?: string
  landingYear?: number
}

export interface DotState {
  hovered: boolean
  selected: boolean
  shadowed: boolean
}
```

- [ ] **Step 2: Verify TypeScript catches missing `type` fields**

```bash
pnpm typecheck 2>&1 | head -30
```

Expected: errors about `type` missing from every location in `locations.ts`. This is correct — we fix them in Task 2.

---

## Task 2: Backfill `type` on all 17 existing locations

**Files:**
- Modify: `components/globe/locations.ts`
- Modify: `components/globe/locations.test.ts`

- [ ] **Step 1: Add `type: 'crater'` to the 15 Artemis locations**

In `components/globe/locations.ts`, add `type: 'crater'` to each of these location objects (add after `isProposed: false`):

- `spa` — South Pole-Aitken Basin
- `orientale` — Orientale Basin
- `tycho` — Tycho
- `copernicus` — Copernicus
- `clavius` — Clavius
- `bailly` — Bailly
- `petavius` — Petavius
- `langrenus` — Langrenus
- `humboldt` — Humboldt
- `janssen` — Janssen
- `schickard` — Schickard
- `stofler` — Stöfler
- `maginus` — Maginus
- `longomontanus` — Longomontanus
- `vendelinus` — Vendelinus

- [ ] **Step 2: Add `type: 'proposed'` to the two crew-proposed craters**

For `carroll` and `integrity`, add `type: 'proposed'` (these already have `isProposed: true`):

```ts
// Carroll entry — add this field:
type: 'proposed',

// Integrity entry — add this field:
type: 'proposed',
```

- [ ] **Step 3: Verify TypeScript is satisfied**

```bash
pnpm typecheck 2>&1 | head -20
```

Expected: no errors related to `locations.ts`.

- [ ] **Step 4: Write a failing test**

Add to `components/globe/locations.test.ts`:

```ts
it('every location has a valid type', () => {
  const validTypes = new Set<string>(['crater', 'apollo', 'robotic', 'proposed'])
  for (const loc of LOCATIONS) {
    expect(
      validTypes.has(loc.type),
      `${loc.name} has unexpected type: "${loc.type}"`,
    ).toBe(true)
  }
})

it('carroll and integrity have type "proposed"', () => {
  const carroll = LOCATIONS.find(l => l.id === 'carroll')
  const integrity = LOCATIONS.find(l => l.id === 'integrity')
  expect(carroll?.type).toBe('proposed')
  expect(integrity?.type).toBe('proposed')
})

it('all non-proposed locations have type "crater" in V1 dataset', () => {
  for (const loc of LOCATIONS.filter(l => l.type !== 'proposed')) {
    expect(loc.type, `${loc.name} should be "crater"`).toBe('crater')
  }
})
```

- [ ] **Step 5: Run the new tests**

```bash
pnpm test -- components/globe/locations.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/globe/types.ts components/globe/locations.ts components/globe/locations.test.ts
git commit -m "feat: add type field to LunarLocation, backfill all 17 locations"
```

---

## Task 3: Filter logic utility

**Files:**
- Create: `components/screen1/filterLocations.ts`
- Create: `components/screen1/filterLocations.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `components/screen1/filterLocations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterLocations } from './filterLocations'
import type { LunarLocation } from '@/components/globe/types'

function makeLocation(overrides: Partial<LunarLocation>): LunarLocation {
  return {
    id: 'test',
    name: 'Test',
    lat: 0,
    lon: 0,
    significance: 'sig',
    isProposed: false,
    coords: '0°N, 0°W',
    region: 'NEAR SIDE',
    type: 'crater',
    suggestedQuestions: ['q1', 'q2', 'q3'],
    ...overrides,
  }
}

const locations: LunarLocation[] = [
  makeLocation({ id: 'a', type: 'crater' }),
  makeLocation({ id: 'b', type: 'apollo' }),
  makeLocation({ id: 'c', type: 'robotic' }),
  makeLocation({ id: 'd', type: 'proposed', isProposed: true }),
]

describe('filterLocations', () => {
  it('returns all locations when filter is "all"', () => {
    expect(filterLocations(locations, 'all')).toHaveLength(4)
  })

  it('returns only craters when filter is "crater"', () => {
    const result = filterLocations(locations, 'crater')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('a')
  })

  it('returns only apollo when filter is "apollo"', () => {
    const result = filterLocations(locations, 'apollo')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('b')
  })

  it('returns only robotic when filter is "robotic"', () => {
    const result = filterLocations(locations, 'robotic')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('c')
  })

  it('returns only proposed when filter is "proposed"', () => {
    const result = filterLocations(locations, 'proposed')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('d')
  })

  it('returns empty array when no locations match', () => {
    expect(filterLocations([], 'crater')).toHaveLength(0)
  })

  it('"all" filter returns locations in original order', () => {
    const result = filterLocations(locations, 'all')
    expect(result.map(l => l.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm test -- components/screen1/filterLocations.test.ts
```

Expected: FAIL — `Cannot find module './filterLocations'`

- [ ] **Step 3: Create the implementation**

Create `components/screen1/filterLocations.ts`:

```ts
import type { LunarLocation, LocationType } from '@/components/globe/types'

export type LocationFilter = 'all' | LocationType

export function filterLocations(
  locations: LunarLocation[],
  filter: LocationFilter,
): LunarLocation[] {
  if (filter === 'all') return locations
  return locations.filter((loc) => loc.type === filter)
}
```

- [ ] **Step 4: Run to verify they pass**

```bash
pnpm test -- components/screen1/filterLocations.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/screen1/filterLocations.ts components/screen1/filterLocations.test.ts
git commit -m "feat: add filterLocations utility with full test coverage"
```

---

## Task 4: FilterBar component

**Files:**
- Create: `components/screen1/FilterBar.tsx`

- [ ] **Step 1: Create the component**

Create `components/screen1/FilterBar.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'
import type { LocationFilter } from './filterLocations'

const TABS: { label: string; value: LocationFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Craters & Basins', value: 'crater' },
  { label: 'Apollo', value: 'apollo' },
  { label: 'Robotic Landers', value: 'robotic' },
  { label: 'Proposed', value: 'proposed' },
]

interface FilterBarProps {
  activeFilter: LocationFilter
  onFilterChange: (filter: LocationFilter) => void
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex gap-1 overflow-x-auto px-5 py-2.5 border-b border-luna-hairline flex-shrink-0">
      {TABS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onFilterChange(value)}
          className={cn(
            'font-mono text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded border whitespace-nowrap transition-colors',
            activeFilter === value
              ? 'text-luna-cyan border-luna-cyan bg-luna-cyan/[0.07]'
              : 'text-luna-fg-3 border-transparent hover:text-luna-fg-2 hover:bg-luna-base-3',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
pnpm typecheck 2>&1 | grep FilterBar
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add components/screen1/FilterBar.tsx
git commit -m "feat: add FilterBar component"
```

---

## Task 5: ViewToggle component

**Files:**
- Create: `components/screen1/ViewToggle.tsx`

- [ ] **Step 1: Create the component**

Create `components/screen1/ViewToggle.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'

export type ViewMode = 'list' | 'globe'

interface ViewToggleProps {
  activeView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-luna-base-3 border border-luna-hairline rounded p-0.5 gap-0.5 flex-shrink-0">
      {(['list', 'globe'] as const).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
          className={cn(
            'font-mono text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded transition-colors',
            activeView === view
              ? 'bg-luna-cyan text-luna-base font-semibold'
              : 'text-luna-fg-3 hover:text-luna-fg-2',
          )}
        >
          {view}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
pnpm typecheck 2>&1 | grep ViewToggle
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/screen1/ViewToggle.tsx
git commit -m "feat: add ViewToggle component"
```

---

## Task 6: LocationCard component

**Files:**
- Create: `components/screen1/LocationCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/screen1/LocationCard.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'
import type { LunarLocation } from '@/components/globe/types'

function RegionBadge({ region }: { region: string }) {
  const isNear = region === 'NEAR SIDE'
  return (
    <span
      className={cn(
        'font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm',
        isNear
          ? 'bg-luna-success/10 text-luna-success'
          : 'bg-luna-violet/10 text-luna-violet',
      )}
    >
      {isNear ? 'Near' : 'Far side'}
    </span>
  )
}

function TypeBadge({ location }: { location: LunarLocation }) {
  if (location.type === 'proposed') {
    return (
      <span className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm bg-luna-warning/10 text-luna-warning">
        proposed
      </span>
    )
  }
  const labels: Record<string, string> = {
    crater: 'Crater',
    apollo: 'Apollo',
    robotic: 'Robotic',
  }
  return (
    <span className="font-mono text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm bg-luna-base-3 text-luna-fg-3 border border-luna-hairline">
      {labels[location.type] ?? location.type}
    </span>
  )
}

interface LocationCardProps {
  location: LunarLocation
  onClick: (location: LunarLocation) => void
}

export function LocationCard({ location, onClick }: LocationCardProps) {
  const displayName = location.missionName
    ? `${location.missionName} — ${location.name}`
    : location.name

  return (
    <button
      type="button"
      onClick={() => onClick(location)}
      className="text-left w-full bg-luna-base-2 border border-luna-hairline rounded-lg p-3.5 hover:border-luna-cyan/30 hover:bg-luna-base-3 transition-colors"
    >
      <div className="text-sm font-medium text-luna-fg leading-snug mb-1.5">
        {displayName}
      </div>
      <div className="text-[12px] text-luna-fg-3 leading-snug mb-2.5 line-clamp-2">
        {location.significance}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <RegionBadge region={location.region} />
        <TypeBadge location={location} />
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
pnpm typecheck 2>&1 | grep LocationCard
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/screen1/LocationCard.tsx
git commit -m "feat: add LocationCard component"
```

---

## Task 7: LocationListView component

**Files:**
- Create: `components/screen1/LocationListView.tsx`

- [ ] **Step 1: Create the component**

Create `components/screen1/LocationListView.tsx`:

```tsx
'use client'

import { LocationCard } from './LocationCard'
import type { LunarLocation } from '@/components/globe/types'

interface LocationListViewProps {
  locations: LunarLocation[]
  onLocationSelect: (location: LunarLocation) => void
}

export function LocationListView({ locations, onLocationSelect }: LocationListViewProps) {
  if (locations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3">
          No locations match this filter
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2.5 p-5">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            onClick={onLocationSelect}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
pnpm typecheck 2>&1 | grep LocationListView
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/screen1/LocationListView.tsx
git commit -m "feat: add LocationListView component"
```

---

## Task 8: Modify LunarGlobe to accept filtered locations

**Files:**
- Modify: `components/globe/LunarGlobe.tsx`

`LunarGlobe` currently imports and uses `LOCATIONS` directly. Add an optional `locations` prop so the parent can pass a filtered subset. Default to `LOCATIONS` when not provided.

- [ ] **Step 1: Update the props interface (line 88)**

Change:

```ts
interface LunarGlobeProps {
  onLocationSelect?: (location: LunarLocation | null) => void
  /** Populated by the component — call to programmatically deselect and resume rotation */
  deselectRef?: React.MutableRefObject<(() => void) | null>
}
```

To:

```ts
interface LunarGlobeProps {
  onLocationSelect?: (location: LunarLocation | null) => void
  /** Populated by the component — call to programmatically deselect and resume rotation */
  deselectRef?: React.MutableRefObject<(() => void) | null>
  /** Filtered location set to render — defaults to all LOCATIONS */
  locations?: LunarLocation[]
}
```

- [ ] **Step 2: Destructure the new prop and resolve the local variable (line 94)**

Change:

```ts
export function LunarGlobe({ onLocationSelect, deselectRef }: LunarGlobeProps) {
```

To:

```ts
export function LunarGlobe({ onLocationSelect, deselectRef, locations: locationsProp }: LunarGlobeProps) {
  const locations = locationsProp ?? LOCATIONS
```

Add the `const locations = ...` line immediately after the opening brace, before the `useRef` calls.

- [ ] **Step 3: Replace the 4 `LOCATIONS` references inside the `useEffect` with `locations`**

The file currently references `LOCATIONS` directly at these points inside the big `useEffect`:

1. `for (let i = 0; i < LOCATIONS.length; i++)` → `for (let i = 0; i < locations.length; i++)`
2. `const loc = LOCATIONS[i]!` → `const loc = locations[i]!`
3. `tooltip.textContent = LOCATIONS[hoveredIdx]!.name` → `tooltip.textContent = locations[hoveredIdx]!.name`
4. `onSelectRef.current?.(LOCATIONS[idx] ?? null)` → `onSelectRef.current?.(locations[idx] ?? null)`

Find each with:
```bash
grep -n "LOCATIONS\[" /Users/briannaworkman/Documents/GitHub/luna/components/globe/LunarGlobe.tsx
```

- [ ] **Step 4: Add `locations` to the `useEffect` dependency array**

The big Three.js `useEffect` at the end has a comment:
```ts
// deselectRef is intentionally not in the dependency array: it's written once at setup
```

Find the dependency array of this effect (it will look like `}, [])` or similar) and add `locations`:

```ts
}, [locations]) // eslint-disable-line react-hooks/exhaustive-deps
```

This ensures the Three.js scene rebuilds when the filtered set changes. The cleanup function already handles renderer disposal, so remounting is safe.

- [ ] **Step 5: Verify type-checks pass**

```bash
pnpm typecheck 2>&1 | grep -E "LunarGlobe|globe/LunarGlobe"
```

Expected: no output.

- [ ] **Step 6: Verify existing tests still pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/globe/LunarGlobe.tsx
git commit -m "feat: LunarGlobe accepts optional filtered locations prop"
```

---

## Task 9: Wire page.tsx — view/filter state + conditional render

**Files:**
- Modify: `app/page.tsx`

This is the final wiring step. The page gains `view` and `filter` state, renders the control strip (FilterBar + ViewToggle), and conditionally renders either `LocationListView` or `LunarGlobe`.

**Current layout:**
- `<main className="fixed inset-0 overflow-hidden bg-luna-base">` — globe fills full screen, TopBar (h-14, fixed) overlaps the top

**New layout:**
- `<main className="fixed inset-x-0 bottom-0 top-14 flex flex-col bg-luna-base">` — starts below the fixed TopBar (top-14 = 56px = h-14)
- Control strip (FilterBar + ViewToggle side by side)
- Content area below (list or globe, fills remaining height)

- [ ] **Step 1: Add imports**

`useState` is already in the React import line — do not duplicate it. Add only these new module imports to `app/page.tsx`:

```ts
import { FilterBar } from '@/components/screen1/FilterBar'
import { ViewToggle, type ViewMode } from '@/components/screen1/ViewToggle'
import { LocationListView } from '@/components/screen1/LocationListView'
import { filterLocations, type LocationFilter } from '@/components/screen1/filterLocations'
import { LOCATIONS } from '@/components/globe/locations'
```

- [ ] **Step 2: Add view and filter state inside `Home`**

After the existing `const [selectedLocation, setSelectedLocation] = useState...` line, add:

```ts
const [view, setView] = useState<ViewMode>('list')
const [filter, setFilter] = useState<LocationFilter>('all')

const filteredLocations = filterLocations(LOCATIONS, filter)
```

- [ ] **Step 3: Add `handleCardSelect` and `handleViewChange` callbacks**

After the existing `handleResearch` callback, add:

```ts
const handleCardSelect = useCallback(
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
```

- [ ] **Step 4: Replace the JSX return**

Replace the entire `return (...)` block with:

```tsx
return (
  <>
    <Suspense fallback={null}>
      <HintBanner />
    </Suspense>
    <main className="fixed inset-x-0 bottom-0 top-14 flex flex-col bg-luna-base">
      {/* Control strip: filters left, view toggle right */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-luna-hairline flex-shrink-0">
        <FilterBar activeFilter={filter} onFilterChange={setFilter} />
        <ViewToggle activeView={view} onViewChange={handleViewChange} />
      </div>

      {view === 'list' ? (
        <LocationListView
          locations={filteredLocations}
          onLocationSelect={handleCardSelect}
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
            onResearch={handleResearch}
          />
        </div>
      )}
    </main>
  </>
)
```

- [ ] **Step 5: Fix the FilterBar — remove its own border-b and padding**

The control strip `div` in Step 4 already provides `px-5 py-2.5 border-b`. The FilterBar component currently adds its own `border-b` and `px-5`. Update `components/screen1/FilterBar.tsx` to remove the border and outer padding since the parent provides them:

Change the outer `div` in FilterBar from:

```tsx
<div className="flex gap-1 overflow-x-auto px-5 py-2.5 border-b border-luna-hairline flex-shrink-0">
```

To:

```tsx
<div className="flex gap-1 overflow-x-auto flex-1 min-w-0">
```

- [ ] **Step 6: Verify full type-check passes**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 7: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 8: Start the dev server and verify in browser**

```bash
pnpm dev
```

Open `http://localhost:3000` and verify:

1. **List view is the default** — card grid appears immediately, no globe
2. **All 17 locations appear** in "All" tab (15 craters + 2 proposed)
3. **"Craters & Basins" tab** shows 15 locations (none proposed)
4. **"Proposed" tab** shows Carroll and Integrity only, both with amber proposed badge
5. **"Apollo" and "Robotic Landers" tabs** show empty state (no data yet — expected)
6. **Clicking a card** opens the image gallery dialog directly
7. **Toggle to Globe** — globe renders with filtered dots, TopBar still shows LUNA wordmark
8. **Filter changes in Globe view** — dot count updates to match filter
9. **Globe dot click** — LocationPanel slides in; "Analyze" button opens image gallery
10. **Toggle back to List** — filter state preserved, selected location cleared

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx components/screen1/FilterBar.tsx
git commit -m "feat: wire location selection — list default, shared filter, globe toggle"
```

---

## Definition of Done

- [ ] `pnpm typecheck` exits with zero errors
- [ ] `pnpm test` all tests pass
- [ ] List view is the default on page load
- [ ] Filter tabs work in both list and globe views
- [ ] Card tap goes directly to image gallery (no LocationPanel)
- [ ] Globe dot → LocationPanel → Analyze flow unchanged
- [ ] "Apollo" and "Robotic Landers" tabs render the empty state message (data expansion is a follow-on task)
- [ ] Carroll and Integrity show amber "proposed" badge in cards
