# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LUNA (Lunar Unified Navigation & Analysis) — a multi-agent lunar research co-pilot powered by Claude Opus 4.7. Full spec: `docs/spec.md`.

**Target user:** Science journalists, space creators, undergraduate planetary science students who want to engage with NASA lunar data without domain expertise.

## Tech Stack

- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui
- **Globe:** Three.js r128 — SphereGeometry + LROC texture + Raycaster
- **AI:** Anthropic SDK — model `claude-opus-4-7` exclusively (do not substitute)
- **Backend:** Next.js API routes (no separate server)
- **Icons:** Lucide only

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Lint
npm run typecheck # Type check (if configured)
```

## Architecture

### Multi-Agent System

An orchestrator agent (`claude-opus-4-7`) receives the user query + location, then selectively invokes only the relevant specialist agents. The selective activation (watching 4 of 8 agents light up) is the core UX payoff — preserve this in all agent-related work.

**Build fully (V1):**
- `Data ingest` — runs first on every query; fetches/normalizes raw NASA API data for downstream agents; invisible in output but shown as active in the agent rail
- `Orbit` — NASA SVS ephemeris + illumination JSON
- `Mineralogy` — JSC Lunar Sample API
- `Imagery` — LROC NAC/WAC via ODE REST API + NASA Image Library; passes real images to Opus 4.7 vision
- `Mission history` — NASA Image Library + JSC Lunar API

**Stub for V1 (present in UI, return placeholder):**
- `Thermal`, `Topography`, `Hazards`

### NASA Data Sources

| API | URL | Auth |
|-----|-----|------|
| NASA Image & Video Library | `images.nasa.gov/docs/` | None |
| JSC Lunar Sample API | `curator.jsc.nasa.gov/rest/lunarapi/` | None |
| LROC via ODE REST API | `oderest.rsl.wustl.edu/live2/` | None |
| NASA SVS (illumination) | `svs.gsfc.nasa.gov/5587` | None |
| NASA Open APIs | `api.nasa.gov` | Free key, rate limited |

All NASA API calls go through Next.js API routes (`/api/nasa-images`, etc.) — never call NASA APIs directly from the client.

### Screen Flow

1. **Globe (Screen 1)** — Three.js globe, 17 interactive dots, auto-rotates when idle, stops on selection
2. **Image Gallery (Screen 1.5)** — Dialog overlay (80–85% viewport), hero image + thumbnail grid, 0–4 images selectable, skippable
3. **Query Input (Screen 2)** — Natural language composer with selected images as thumbnail strip; no attach button (images come exclusively from Screen 1.5)
4. **Agent Reasoning Stream (Screen 3)** — Active agents pulse cyan in left rail; each streams output in real time
5. **Mission Brief (Screen 4)** — Findings grouped by agent, confidence ratings, NASA citations, PDF export

### The 17 Locations

Pre-computed 3D cartesian positions — hardcoded, no runtime math. Conversion: `x = cos(lat) * cos(lon)`, `y = sin(lat)`, `z = cos(lat) * sin(lon)`.

15 Artemis landmarks + 2 crew-proposed craters: **Carroll** (18.84°N, 86.51°W) and **Integrity** (2.66°N, 104.92°W) — always labeled "proposed" in all UI.

## Design System

**Dark mode only. Always.**

| Token | Value | Role |
|-------|-------|------|
| `--color-base` | `#050C1A` | Background |
| `--color-primary` | `#E8EDF5` | Headlines, key actions |
| `--color-secondary` | `#7DD3FC` | Agent status, data labels |

**Typography:**
- `Geist` — all UI chrome, headers, wordmark
- `monospace` — coordinates, agent stream output, confidence scores, citation labels

**Animation rules:** Every animation must earn its place. Active agents pulse. Stream text arrives incrementally. No decorative motion, no floating particles, no glowing orbs.

**Components:** shadcn/ui + Tailwind for structural scaffolding. Plain Tailwind when shadcn adds complexity without value.

## Key Constraints

- Use `claude-opus-4-7` — the 1M context window and high-res vision (2576px) are load-bearing for the agent architecture
- Streaming must be enabled for all agent responses (App Router streaming)
- The Imagery agent only activates when the user has attached images (0 images = Imagery agent stays idle)
- Never show an empty state for far-side locations (Carroll, Integrity) in the image gallery — always show regional imagery with a coverage notice
