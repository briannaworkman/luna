# LUNA Foundation Handoff

## What exists

### Project
- Next.js 14 App Router, TypeScript strict mode, Tailwind CSS
- Location: `luna/` in the workdir

### Key files
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — `<html className="dark">` enforces dark mode globally |
| `app/page.tsx` | Clean bare default export — ready for content |
| `app/globals.css` | Tailwind directives + shadcn CSS variables (`:root` and `.dark`) |
| `tailwind.config.ts` | `darkMode: "class"`, full shadcn theme (colors, radius, keyframes) |
| `tsconfig.json` | `strict: true` enabled |
| `components.json` | shadcn/ui config — style: new-york, baseColor: slate, cssVariables: true |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |

### Installed packages
- `tailwindcss-animate` — required by shadcn/ui animations
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn/ui core deps
- `lucide-react` — icon library used by shadcn/ui components

## Conventions every agent must follow

### Dark mode
The `<html>` element has `className="dark"` in `app/layout.tsx`. Do **not** remove it. All UI is dark-only. Never add `prefers-color-scheme` media queries.

### Colors
Use shadcn semantic tokens, never raw hex or Tailwind palette colors:
- `bg-background`, `text-foreground`, `border-border`
- `bg-primary`, `text-primary-foreground`, etc.
See `globals.css` for the full token list.

### Components
Add shadcn/ui components via `npx shadcn@2 add <component>` from the `luna/` directory. Components land in `components/ui/`.

### Utilities
Use `cn()` from `@/lib/utils` for all className merging. Never use `clsx` or `twMerge` directly.

### Border radius
Radius tokens come from CSS variable `--radius` (0.3rem — New York style). Use `rounded-lg`, `rounded-md`, `rounded-sm` — do not hardcode radius values.

### Path alias
`@/` maps to the project root (`luna/`). Use it for all internal imports.

### No Pages Router
App Router only. Never create files under `pages/`.

---

## `/api/nasa-images` — NASA Image & Video Library route

**File:** `app/api/nasa-images/route.ts`
**Types:** `lib/types/nasa.ts` (`NasaImage`, `NasaImagesResponse`) — public contract for Foxtrot/Delta

### Request

```
GET /api/nasa-images?name=<string>&lat=<number>&lon=<number>
```

| Param | Type | Description |
|-------|------|-------------|
| `name` | string | Location name (e.g. "Shackleton", "Carroll") |
| `lat` | number | Selenographic latitude |
| `lon` | number | Selenographic longitude |

### Response

```json
{
  "images": [
    {
      "assetId": "PIA00001",
      "thumbUrl": "https://images-assets.nasa.gov/image/PIA00001/PIA00001~thumb.jpg",
      "fullUrl": "https://images-assets.nasa.gov/image/PIA00001/PIA00001~orig.jpg",
      "instrument": "LRO",
      "date": "2024-03-15T00:00:00Z",
      "nasaUrl": "https://images.nasa.gov/details/PIA00001"
    }
  ],
  "limitedCoverage": false
}
```

- Up to 4 results, sorted by `date` descending (most recent first).
- `limitedCoverage: true` when fewer than 2 results found (triggers gallery coverage banner).
- Returns `{ images: [], limitedCoverage: true }` with HTTP 400 if required params are missing.

### Search strategy

1. **Name-first:** queries `images-api.nasa.gov/search?q=<name>+moon+lunar&media_type=image`
2. **Coordinate fallback:** if fewer than 2 results, runs a region-derived query:
   - `|lon| > 90°` → `"moon far side surface"`
   - `lat > 60°` → `"moon north pole lunar surface"`
   - `lat < -60°` → `"moon south pole lunar surface"`
   - otherwise → `"moon lunar surface"`
3. Merges primary + fallback (deduplicated), sorted by date, top 4.

### Upstream API quirks found in testing

- **NASA Images Library is a media archive, not a selenographic index.** Crater names that match common words (e.g. "Integrity") return unrelated imagery. The route returns whatever the API gives — Foxtrot should treat results as "NASA moon imagery" rather than strict crater photography.
- **"Shackleton moon lunar"** → 0 hits (the crater name doesn't appear in NASA image metadata). Falls back to south-pole region imagery (Artemis III lighting simulations from MSFC).
- **"Carroll moon lunar"** → 2 hits — Artemis 2 astronaut photos of the lunar limb (art002e009279, art002e009284). These are geographically adjacent and legitimate.
- **Date format** from the API is ISO 8601 (`2025-05-09T00:00:00Z`). Passed through as-is.
- **`instrument` field** is derived from keywords (LROC, LRO, Clementine, Apollo, etc.) or falls back to the `center` field (e.g. "JSC", "JPL", "MSFC").
- **Timeout:** 8s per fetch call. Empty result returned on timeout — never a 500.
- **`page_size=10`** is requested from the API per call to give the sort-and-slice room to work. We never request more than 10.

### Tested locations

| Location | lat | lon | Name hits | Fallback used | Coverage |
|----------|-----|-----|-----------|---------------|----------|
| Shackleton | -89.9 | 0 | 0 | Yes (south pole) | false (4 images) |
| Carroll | 18.84 | -86.51 | 2 | No | false (3+ images) |
| Integrity | 2.66 | -104.92 | 867 (unrelated) | No | false (4 images) |
