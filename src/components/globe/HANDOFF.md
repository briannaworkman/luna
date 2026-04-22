# Globe Handoff — Beta → Delta

## Location data shape

```typescript
// components/globe/types.ts
interface LunarLocation {
  id: string        // stable slug, e.g. "tycho", "carroll", "integrity"
  name: string      // display name, e.g. "Tycho" | "Carroll (proposed)"
  lat: number       // selenographic latitude, degrees
  lon: number       // selenographic longitude, degrees (negative = West)
  diameter?: string // km string, undefined for proposed craters
  significance: string
  isProposed: boolean  // true for Carroll and Integrity — always show "(proposed)" in UI
  coords: string    // pre-formatted display string, e.g. "18.84°N, 86.51°W"
}
```

All 17 locations are in `components/globe/locations.ts` as the `LOCATIONS` array.

## 3D position formula

```
x = cos(lat_rad) * cos(lon_rad)
y = sin(lat_rad)
z = cos(lat_rad) * sin(lon_rad)
```

Camera sits on the **+x axis** at distance 2.5 from the origin. `lon=0` (near-side prime meridian) faces the camera. Carroll (lon≈−86.5°) sits at the near/far limb; Integrity (lon≈−104.9°) is on the far side.

## Dot state machine

State is tracked via two mutable integers inside the `useEffect` closure:

| Variable | Value | Meaning |
|----------|-------|---------|
| `hoveredIdx` | −1 | no dot hovered |
| `hoveredIdx` | 0–16 | index into `LOCATIONS` / `dotMeshes` |
| `selectedIdx` | −1 | no selection |
| `selectedIdx` | 0–16 | locked selection; auto-rotation paused |

Visual states per dot:
- **idle** — `COLOR_FROST (#e8edf5)`, scale 1.0
- **shadowed** — `COLOR_FROST_4 (#4a5368)`, opacity 0.4, scale 1.0 (dot's world position has negative dot-product with sun direction)
- **hover** — `COLOR_CYAN (#7dd3fc)`, scale 1.3
- **selected** — `COLOR_CYAN (#7dd3fc)`, scale pulses 1.0→1.35 via `Math.sin(pulseT * 2.1)`

## Public API for Delta

`LunarGlobe` accepts one optional prop:

```typescript
onLocationSelect?: (location: LunarLocation | null) => void
```

When a dot is clicked, `onLocationSelect` fires with the full `LunarLocation` object. The globe stops auto-rotating and the dot enters the selected state.

To restore auto-rotation or deselect, the parent would need to control state via a future prop — not yet implemented for V1.

## Files owned by Beta

```
components/globe/
  LunarGlobe.tsx     — Three.js client component
  locations.ts       — 17 LunarLocation records
  types.ts           — shared TypeScript interfaces
public/textures/
  lunar_surface.jpg  — NASA LROC 1K equirectangular texture (public domain)
```

## What Delta needs to know

1. Import the component with `ssr: false` — WebGL can't run server-side.
2. Carroll and Integrity are **always `isProposed: true`** — every tooltip, panel heading, label must show "(proposed)". Never drop it.
3. The `onLocationSelect` callback fires on every dot click. Use it to drive the metadata panel, the image gallery trigger, and the query pre-fill.
4. Dot indices match `LOCATIONS` array order — index 15 = Carroll, index 16 = Integrity.
