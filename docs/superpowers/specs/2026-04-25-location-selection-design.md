# Location Selection Screen — Design Spec

**Date:** 2026-04-25
**Status:** Approved

## Overview

Replace the full-screen 3D globe as the sole entry point for location selection with a **list-first experience**. The list view becomes the default; the globe becomes an opt-in alternative. A persistent filter bar shared across both views lets users narrow by location type. The expanded location set grows beyond the current 17 craters to include Apollo landing sites, robotic landers, and other notable sites.

## Goals

- Make location selection immediately approachable without requiring 3D globe literacy
- Support a significantly larger location catalog organized by type
- Keep the globe available for users who want the spatial/visual experience
- Shared filter state across views so switching views doesn't disrupt context

## Out of Scope (this spec)

- Fully populating the new location types (Apollo, robotic landers) with production data — the data expansion is a follow-on task; this spec covers the UI architecture and data model shape
- Mobile-specific layout optimizations
- Search/autocomplete within the list

---

## Screen Flow Changes

### Before

```
Globe (Screen 1) → click dot → LocationPanel slide-in → "Analyze" → Image Gallery (Screen 1.5) → Query (Screen 2)
```

### After

**List view path (new default):**
```
List view (Screen 1) → click card → Image Gallery (Screen 1.5) → Query (Screen 2)
```

**Globe view path (unchanged):**
```
Globe view (Screen 1) → click dot → LocationPanel slide-in → "Analyze" → Image Gallery (Screen 1.5) → Query (Screen 2)
```

The LocationPanel is **not shown** in list view — the card surface provides enough context (name, significance snippet, region, type) to proceed directly to the image gallery.

---

## UI Components

### View Toggle

- Lives in the top bar, right side
- Two states: **List** (default) | **Globe**
- Styled as a segmented control (pill pair), active state filled cyan on dark background
- Toggling preserves active filter tab and does not reset any selection state

### Filter Bar

- Appears below the top bar in **both** views
- Horizontally scrollable if tab count exceeds viewport width
- Active tab: cyan text, cyan border, faint cyan background
- Inactive tab: muted text, no border, subtle hover state
- Default active tab: **All**

**V1 tabs:**

| Tab label | `type` value | Description |
|---|---|---|
| All | — | Shows all locations |
| Craters & Basins | `crater` | Impact geology — the current 17 locations |
| Apollo | `apollo` | Crewed landing sites (Apollo 11–17, excluding 13) |
| Robotic Landers | `robotic` | Luna, Surveyor, Chang'e, SLIM, Chandrayaan-3, IM-1, etc. |
| Proposed | `proposed` | Carroll and Integrity (always labeled "proposed") |

In globe view, the active filter controls which dots are rendered. Non-matching dots are hidden (not dimmed).

### Location Card (list view only)

Each card shows:
- **Name** — `location.missionName ? "${missionName} — ${name}" : name`
- **Significance snippet** — `location.significance`, single line, truncated with ellipsis
- **Region badge** — NEAR SIDE (green) | FAR SIDE (purple)
- **Type badge** — crater / apollo / robotic / proposed (muted, secondary)

Card interaction: tap/click → opens Image Gallery dialog directly. No intermediate panel.

Proposed locations show the amber "proposed" badge in place of the type badge, consistent with the globe's current labeling behavior.

### Card Grid

- 2-column grid
- Gap: `10px`
- Cards are equal height within a row (CSS grid stretch)
- No pagination in V1 — full list renders and scrolls

---

## Data Model

### `LunarLocation` type changes (`components/globe/types.ts`)

**New required field:**

```ts
type: 'crater' | 'apollo' | 'robotic' | 'proposed'
```

**New optional fields:**

```ts
missionName?: string   // "Apollo 11", "Chang'e 4" — shown in card title for landing sites
siteName?: string      // "Tranquility Base", "Hadley-Apennine"
landingYear?: number   // Shown in significance for landing sites
```

### `locations.ts` backfill

All 17 existing locations get `type: 'crater'` except Carroll and Integrity, which get `type: 'proposed'`. No other fields change.

**Relationship with `isProposed`:** The existing `isProposed: boolean` field is preserved for backward compatibility — `LocationPanel` uses it to show the badge in globe view. For new code, derive proposed status from `type === 'proposed'`. Carroll and Integrity have `isProposed: true` AND `type: 'proposed'`; these are always in sync.

**Category exclusivity:** `type: 'proposed'` is a top-level category. Carroll and Integrity appear only under the "Proposed" filter tab, not under "Craters & Basins". The "All" tab shows every location regardless of type.

New location entries (Apollo, robotic) are added in a follow-on data task. The UI renders whatever is in the array — no special-casing per type beyond badge color and card title formatting.

---

## State Management

A new shared filter state needs to live above both views. Options:

- **URL search param** (`?filter=apollo`) — preserves state on refresh, shareable, works with Next.js router. Recommended.
- React context in the home page component — simpler but lost on refresh.

Recommended: URL search param `filter` with values matching tab keys (`all`, `crater`, `apollo`, `robotic`, `proposed`). Default: `all` (no param in URL).

View toggle state: URL search param `view` with values `list` | `globe`. Default: `list`.

---

## Globe Behavior (unchanged)

The globe dot → LocationPanel → Analyze flow is preserved exactly. The filter bar now appears above the globe and hides dots for non-matching types when a filter is active. The `LocationPanel` component is untouched.

---

## What Gets Built

1. **`components/globe/types.ts`** — add `type`, `missionName`, `siteName`, `landingYear` fields
2. **`components/globe/locations.ts`** — backfill `type` on all 17 existing entries
3. **`components/screen1/LocationCard.tsx`** — new card component
4. **`components/screen1/LocationListView.tsx`** — card grid with filter logic
5. **`components/screen1/FilterBar.tsx`** — shared filter tab bar
6. **`components/screen1/ViewToggle.tsx`** — List | Globe segmented control
7. **`app/page.tsx`** — wire toggle and filter state via URL params; render `LocationListView` or `LunarGlobe` based on `view` param; pass filtered locations to globe
8. **`components/globe/LunarGlobe.tsx`** — accept filtered locations array (or filter predicate) as prop

---

## Design Tokens in Use

All from existing design system — no new tokens needed.

| Token | Usage |
|---|---|
| `--color-base` `#050C1A` | Card background |
| `--color-base-2` `#0A1525` | Card hover / grid background |
| `--color-primary` `#E8EDF5` | Card name |
| `--color-secondary` `#7DD3FC` | Active filter tab, toggle active state |
| `--luna-fg-3` | Significance text, inactive tabs |
| Green `#6BCB77` | Near side badge |
| Purple `#B07FD3` | Far side badge |
| Amber `#F4A340` | Proposed badge |
| Monospace | All badges, filter tabs, toggle labels |
| Geist | Card name, significance |
