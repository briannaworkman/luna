# LUNA — Lunar Unified Navigation & Analysis

A multi-agent lunar research co-pilot powered by Claude Opus 4.7. LUNA lets science journalists, space creators, and curious non-specialists ask natural language questions about any location on the Moon and get back a structured research brief — with citations to real NASA data sources — in under a minute.

---

## What it does

Pick a location on the interactive 3D globe. Select relevant imagery. Ask a question like:

> "What do we know about Vavilov Crater geologically? Would it be interesting for a future landing?"

LUNA routes your question to a set of specialist AI agents — Orbit, Mineralogy, Imagery, Mission History, and more — each pulling from live NASA data APIs. Only the agents relevant to your question activate; you watch them work in real time. When they finish, you get a consolidated mission brief with confidence ratings, source links, and follow-up prompts.

---

## Architecture

### Multi-agent system

An orchestrator agent (`claude-opus-4-7`) receives the user query and selected location, decides which specialist agents are relevant, dispatches them concurrently, and streams results back to the UI.

```
User query + globe location
         ↓
Orchestrator (Claude Opus 4.7)
         ↓ selectively dispatches
┌──────────┐  ┌───────────┐  ┌─────────┐  ┌───────────────┐
│  Orbit   │  │Mineralogy │  │ Imagery │  │Mission History│
└──────────┘  └───────────┘  └─────────┘  └───────────────┘
         ↓ streams converge
      Mission Brief
```

**Fully implemented agents:**
- `Data Ingest` — fetches and normalizes raw NASA API data for downstream agents (runs on every query, invisible in output)
- `Orbit` — NASA SVS ephemeris and illumination data
- `Mineralogy` — JSC Lunar Sample API
- `Imagery` — LROC NAC/WAC via ODE REST API + NASA Image Library; passes real images to Opus 4.7 vision
- `Mission History` — NASA Image Library + JSC Lunar API

**Stub agents** (present in UI, return placeholder data):
- `Thermal`, `Topography`, `Hazards`

### Screen flow

1. **Globe / List** — 40 curated lunar sites browsable as an interactive Three.js globe or a searchable list. Globe auto-rotates when idle.
2. **Image Gallery** — Dialog overlay showing LROC imagery for the selected location. Select up to 4 images to attach to your query.
3. **Query Composer** — Natural language input with attached image thumbnails and suggested question chips.
4. **Agent Stream** — Live view of active agents pulsing in the left rail as they stream their findings.
5. **Mission Brief** — Consolidated output with findings grouped by agent and topic, confidence ratings, NASA citations, and follow-up prompts.

### NASA data sources

| API | URL | Auth |
|-----|-----|------|
| NASA Image & Video Library | `images.nasa.gov` | None |
| JSC Lunar Sample API | `curator.jsc.nasa.gov/rest/lunarapi/` | None |
| LROC via ODE REST API | `oderest.rsl.wustl.edu/live2/` | None |
| NASA SVS (illumination) | `svs.gsfc.nasa.gov/5587` | None |
| NASA Open APIs | `api.nasa.gov` | Free key |

All NASA API calls go through Next.js API routes — never directly from the client.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Globe | Three.js r128 — SphereGeometry + LROC texture + Raycaster |
| AI | Anthropic SDK — `claude-opus-4-7` exclusively |
| Icons | Lucide |
| Testing | Vitest |
| Package manager | pnpm |

---

## Running locally

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A NASA API key (free at [api.nasa.gov](https://api.nasa.gov)) — optional but removes rate limits
- An Anthropic API key

### Setup

```bash
# Clone and install
git clone https://github.com/briannaworkman/luna.git
cd luna
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add:
#   ANTHROPIC_API_KEY=your_key_here
#   NASA_API_KEY=your_key_here  (optional, falls back to DEMO_KEY)
```

### Development

```bash
pnpm dev       # Start dev server at http://localhost:3000
pnpm build     # Production build
pnpm lint      # Lint
pnpm typecheck # Type check
pnpm test      # Run tests
pnpm test:watch # Run tests in watch mode
```

---

## The 40 locations

Pre-computed 3D cartesian positions hardcoded in `components/globe/locations.ts`. The set spans four categories:

- **Prominent craters** — SPA Basin, Tycho, Copernicus, Clavius, and others
- **Apollo & robotic mission sites** — all six Apollo landing zones plus Luna, Surveyor, Chang'e, and SLIM sites
- **Artemis South Pole candidates** — Shackleton, Nobile, Haworth, Malapert Massif
- **Geological features** — major maria, Aristarchus Plateau, Reiner Gamma, Vallis Schröteri

Two locations are crew-proposed craters and are always labeled "proposed" in the UI:

- **Carroll** (18.84°N, 86.51°W)
- **Integrity** (2.66°N, 104.92°W)

Far-side locations (Carroll, Integrity) never show an empty image gallery — they fall back to regional imagery with a coverage notice.

---

## Design

Dark mode only. Design tokens, component HTML, and screen-by-screen mockups live in `design-system/` and `prototypes/`. Fonts: Geist for UI chrome, monospace for coordinates, agent output, and citation labels.
