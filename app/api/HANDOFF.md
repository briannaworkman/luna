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
