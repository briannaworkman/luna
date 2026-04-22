# API Routes — Handoff for Foxtrot

Echo's notes on every route: exact request params, response shape, and real-world quirks found during testing.

---

## `/api/nasa-images`

**Purpose:** Searches the NASA Image & Video Library for lunar imagery by location name and coordinates.

**Request:**
```
GET /api/nasa-images?name=Tycho&lat=-43&lon=-11
```

| Param | Type   | Required | Notes |
|-------|--------|----------|-------|
| name  | string | yes      | Location name for primary search |
| lat   | number | yes      | Selenographic latitude (-90 to 90) |
| lon   | number | yes      | Selenographic longitude (-180 to 180) |

**Response:** `NasaImagesResponse`
```json
{
  "images": [
    {
      "assetId": "PIA12345",
      "thumbUrl": "https://...",
      "fullUrl": "https://...",
      "instrument": "LROC NAC",
      "date": "2024-01-15T00:00:00Z",
      "nasaUrl": "https://images.nasa.gov/details/PIA12345"
    }
  ],
  "limitedCoverage": false
}
```

**`limitedCoverage: true`** when fewer than 2 total images are found.

**Quirks:**
- Far-side locations (|lon| > 90) use a dedicated region query ("moon far side surface") since the name search rarely returns imagery for crew-proposed craters.
- `images.nasa.gov` returns inconsistent date formats — some include time, some don't. `date` is whatever the API returns; consumers should be tolerant.
- Cache-Control: `public, s-maxage=3600, stale-while-revalidate=86400`

---

## `/api/lroc`

**Purpose:** Returns calibrated LROC NAC and WAC image products from the ODE REST API v2 for a given lunar location.

**Request:**
```
GET /api/lroc?lat=-89.9&lon=0
```

| Param | Type   | Required | Notes |
|-------|--------|----------|-------|
| lat   | number | yes      | Selenographic latitude (-90 to 90) |
| lon   | number | yes      | Selenographic longitude (-180 to 180) |

**Response:** `LrocResponse`
```json
{
  "nac": [
    {
      "productId": "M101350392LC",
      "resolutionMpp": 0.904,
      "acquisitionDate": "2009-07-04T12:39:00.489Z",
      "downloadUrl": "https://data.lroc.im-ldi.com/lroc/view_lroc/LRO-L-LROC-3-CDR-V1.0/M101350392LC",
      "instrument": "NAC"
    }
  ],
  "wac": [
    {
      "productId": "M1419891365CC",
      "resolutionMpp": 110.347,
      "acquisitionDate": "2022-10-08T18:03:57.872Z",
      "downloadUrl": "https://data.lroc.im-ldi.com/lroc/view_lroc/LRO-L-LROC-3-CDR-V1.0/M1419891365CC",
      "instrument": "WAC"
    }
  ]
}
```

Both lists are sorted by `resolutionMpp` ascending — best resolution (smallest value) first. Up to 20 products per type are returned.

**Empty arrays** (`{ wac: [], nac: [] }`) are returned when no products exist for the bounding box — this is a normal, non-error result.

**Error responses** (status 200) are returned when the ODE request fails. Shape: `LrocErrorResponse`
```json
{ "error": "LROC data unavailable", "code": "TIMEOUT", "results": [] }
{ "error": "LROC data unavailable", "code": "UPSTREAM_ERROR", "results": [] }
```
- `TIMEOUT` — ODE did not respond within 8 seconds
- `UPSTREAM_ERROR` — ODE returned a non-2xx HTTP status, a network error occurred, or the JSON body contains `Status: "ERROR"`

Server-side `console.error` logs are written on both error paths with `{ errorType, statusCode?, lat, lon }` for diagnostics. No raw ODE error details are forwarded to the client.

**Quirks found during real API testing:**

1. **ODE uses 0–360 longitude.** Selenographic lon (-180 to 180) must be converted: `lon < 0 ? lon + 360 : lon`. Bounding box wrap-around (westernlon > easternlon near 0°) is handled correctly by ODE.

2. **Lat clamping at poles.** Shackleton (lat -89.9) produces `minlat=-90` after subtracting 0.5. The API returns an error for values below -90; the route clamps automatically.

3. **Single-product object quirk.** ODE's JSON (converted from XML) returns `Products.Product` as a single object (not array) when there is exactly one product in the result set. The route normalises this to an array before processing.

4. **Product types used:**
   - NAC: `CDRNAC4` — Calibrated Data Record Narrow Angle Camera
   - WAC: `CDRWAC4` — Calibrated Data Record Wide Angle Camera (Color)
   WAC has ~100–200 m/px resolution; NAC ranges from ~0.5 m/px to ~5 m/px depending on orbit altitude and pointing.

5. **`downloadUrl` is a viewer link**, not a raw file download. It points to `data.lroc.im-ldi.com/lroc/view_lroc/...`. Raw PDS4 data is at `LabelURL` in the ODE response if Foxtrot needs it in the future.

6. **Coverage is global.** Unlike image search APIs, ODE has calibrated data for the entire lunar surface including the far side. Both Shackleton and Integrity return 100 products in a ±0.5° box — the route caps results at 20 per instrument type.

7. **8-second timeout** aborts the fetch. On timeout the route returns `{ code: 'TIMEOUT' }`; on any other network/HTTP failure it returns `{ code: 'UPSTREAM_ERROR' }`. See error responses above.

**Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=86400`

---

## `/api/jsc-samples`

**Purpose:** Returns Apollo lunar sample records from the JSC Curator database for the Apollo mission station nearest to the given coordinates. Provides the Mineralogy agent with primary source data (rock types, weights, descriptions) rather than general knowledge.

**Request:**
```
GET /api/jsc-samples?lat=20.19&lon=30.77
```

| Param | Type   | Required | Notes |
|-------|--------|----------|-------|
| lat   | number | yes      | Selenographic latitude (-90 to 90) |
| lon   | number | yes      | Selenographic longitude (-180 to 180) |

**Response:** `JscSamplesResponse`
```json
{
  "results": [
    {
      "sampleId": "72135",
      "mission": "Apollo 17",
      "station": "2",
      "weight": 336.9,
      "mineralFlags": ["breccia", "fragmental"],
      "description": "coarsely brecciated ilmenite basalt, unstudied",
      "jscUrl": "https://curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample=72135"
    }
  ],
  "nearestMission": "Apollo 17"
}
```

Up to 10 samples are returned, sorted by relevance: non-soil samples (rocks, breccias) first, then by weight descending.

**Empty result** (coordinates >500 km from any Apollo station):
```json
{ "results": [], "nearestMission": null }
```
This is a normal, non-error response for far-side locations (Carroll, Integrity) and south polar sites (Shackleton).

**Error responses** (status 200):
```json
{ "error": "JSC sample data unavailable", "code": "TIMEOUT", "results": [], "nearestMission": null }
{ "error": "JSC sample data unavailable", "code": "UPSTREAM_ERROR", "results": [], "nearestMission": null }
```

**Quirks found during real API testing:**

1. **API documentation is at `/lunar/api/index.cfm`**, not discoverable from the REST root (which returns 401). The correct base URL is `https://curator.jsc.nasa.gov/rest/lunarapi/samples`.

2. **Station names are strings**, not integers. Valid values include numeric strings ("1", "2", "9A"), alpha ("A", "B", "C", "C'", "Bg"), and named ("LM", "ALSEP", "SEP"). The lookup table maps coordinates to the exact station string expected by the API.

3. **Apollo 11 and 12 have only LM and null stations** — all samples collected near the LM area. Querying station "LM" returns results for both missions.

4. **`GENERICDESCRIPTION` is frequently null** for soil samples but populated for rock samples (breccias, basalts). The `mineralFlags` array is always populated from `SAMPLETYPE` + `SAMPLESUBTYPE`.

5. **`ORIGINALWEIGHT` is in grams.** Can be null for some samples.

6. **`jscUrl` points to the full sample catalog page** at `curator.jsc.nasa.gov/lunar/samplecatalog/sampleinfo.cfm?sample={GENERIC}`. The GENERIC number is the primary sample identifier (e.g., "72135" not "72135,47" which is a sub-split).

7. **500 km cutoff**: All 6 Apollo landing sites are near-side, between ±27°N and ±9°S latitude, ±30° longitude. Shackleton (−89.9°, 0°) → 2454 km from Apollo 16 → empty. Integrity (2.66°N, −104.9°W) → 2476 km from Apollo 12 → empty. Near Apollo 17 (20.19°N, 30.77°E) → 0.1 km → full results.

8. **Station coordinate table has ~30 entries** across the 6 missions. Intra-mission stations are within 5–30 km of each other; inter-mission distances are 700–3000 km. The nearest-station logic effectively identifies the mission first, then selects the best-documented station within it.

**Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=86400`

---

## `/api/svs-illumination`

**Purpose:** Returns the full NASA SVS 2026 hourly lunar illumination dataset for the Orbit agent's landing window analysis. The 2MB JSON is fetched from NASA once and served from server-side cache on all subsequent requests.

**Request:**
```
GET /api/svs-illumination
```

No parameters. The dataset covers the entire calendar year 2026 at hourly resolution (8760 entries).

**Response:** `SvsIlluminationResponse`
```json
{
  "entries": [
    {
      "time": "01 Jan 2026 00:00 UT",
      "phase": 91.4,
      "age": 11.928,
      "diameter": 1985.1,
      "distance": 361045,
      "j2000": { "ra": 4.2348, "dec": 26.3373 },
      "subsolar": { "lon": 32.52, "lat": -1.346 },
      "subearth": { "lon": -1.279, "lat": -6.556 },
      "posangle": 349.893
    }
  ],
  "source": "svs.gsfc.nasa.gov/5587"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `time` | string | "DD Mon YYYY HH:MM UT" — not ISO 8601; parse manually |
| `phase` | number | Illuminated fraction 0–100 (100 = full moon) |
| `age` | number | Days since new moon |
| `diameter` | number | Apparent diameter in arcseconds |
| `distance` | number | Earth–Moon distance in km |
| `subsolar.lon` | number | Selenographic longitude of the subsolar point (−180 to +180) |
| `subsolar.lat` | number | Selenographic latitude of the subsolar point |
| `subearth.lon` | number | Selenographic longitude of the subearth point |
| `subearth.lat` | number | Selenographic latitude of the subearth point |
| `posangle` | number | Position angle of the Moon's axis, degrees |

**Determining surface illumination for a landing site:**
For a flat equatorial site at selenographic longitude `L`, the site is illuminated when:
`|subsolar.lon - L| < 90` (wrapping at ±180). For polar sites (|lat| > 80°), local topography dominates and this approximation breaks down — the Orbit agent should apply the appropriate polar illumination model.

**Error response** (status 502):
```json
{ "error": "SVS illumination data unavailable", "code": "FETCH_FAILED" }
```

**Cache-Control:** `no-store` — data is served from server-side memory/disk cache; CDN caching is unnecessary.

**Caching strategy:**
- In-memory singleton via `globalThis` — survives Next.js hot reloads in dev.
- Filesystem backup at `/tmp/svs-mooninfo-2026.json` — survives dev server restarts.
- Warming starts on module load (not on first user request). Cold-start fetch from NASA takes ~3–5 seconds over a typical connection (2 MB file); after that all requests are served from memory in <1ms.
- No TTL — dataset is static for 2026. Invalidation is manual (restart).

**Quirks found during real API testing:**

1. **JSON URL is not the SVS page URL.** The published page at `svs.gsfc.nasa.gov/5587` links to the JSON at `/vis/a000000/a005500/a005587/mooninfo_2026.json`. Use that direct URL.

2. **`time` field is not ISO 8601.** Format is `"DD Mon YYYY HH:MM UT"` (e.g. "15 Jun 2026 12:00 UT"). Parse with `new Date(entry.time.replace(' UT', ' UTC'))`.

3. **`phase` is illuminated fraction (0–100), not phase angle.** Range observed in 2026 dataset: 0.01 – 100.00.

4. **`subsolar.lon` wraps at ±180.** Range: −179.97 to +179.98 in 2026 data. No discontinuity issues if you treat it as a standard selenographic longitude.

5. **Dataset is 8760 entries (365 × 24 hours).** Response payload is ~2 MB uncompressed. Gzip in production reduces this to ~300 KB. The Orbit agent should filter to the relevant time window server-side before passing data to the LLM.

6. **No Shackleton / Integrity specific quirk.** The dataset is geocentric — it describes the Moon's global illumination state, not site-specific illumination. Both near-side (Shackleton, −89.9°, 0°) and far-side (Integrity, 2.66°N, −104.9°W) landing sites use the same dataset; the Orbit agent applies the site longitude against `subsolar.lon` to derive surface illumination.
