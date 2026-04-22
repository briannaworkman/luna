# LUNA — Lunar Unified Navigation & Analysis
### Claude Code Hackathon · Opus 4.7 · Project Spec

---

## Project Overview

LUNA is a multi-agent lunar research co-pilot powered by Claude Opus 4.7. It targets **curious non-specialists** — science journalists, space creators, Substack writers, and undergraduate planetary science students — who followed Artemis II obsessively and want to go deeper than press releases, but hit a wall when they try to engage with actual NASA data.

**The core workflow LUNA makes possible:**

> "The Artemis II crew photographed Vavilov Crater and proposed naming a nearby crater 'Integrity' after their spacecraft. What do we actually know about that region geologically, and would it be interesting for a future landing?"

Today, answering that requires 4+ specialized tools and half a day of research. LUNA answers it in under a minute, with citations to real NASA sources.

---

## Why Now

- Artemis II splashed down **April 10, 2026** — the crew captured **7,000+ lunar surface images** during their April 6 flyby, the first humans near the Moon in 54 years
- That imagery is publicly released and **has never been fed into an AI reasoning system**
- Artemis III site selection is actively underway — real demand for reasoning tools over lunar terrain data
- Claude Opus 4.7 ships with best-in-class tool use, 1M token context, and high-res vision (2576px) — the first model capable of doing this well

---

## Target User

**Primary:** Science journalists, space YouTubers, Substack writers, undergraduate planetary science students

**Why not NASA engineers?** They already have LROC QuickMap, PDS search interfaces, and mission planning suites. That's not the gap.

**The actual gap:** NASA's lunar science data is vast, public, and deeply hostile to newcomers. The ODE REST API and PDS volumes require significant domain knowledge. Most curious people bounce immediately. LUNA is the on-ramp.

---

## System Architecture

### Agent Model: 8 Specialist Agents + Orchestrator

The orchestrator receives the query and selected location, then selectively activates only the agents relevant to that query. Not all 8 agents run on every query — selective activation is visible in the UI and is a core part of the demo story.

```
User Query + Globe Location Selection
         ↓
Orchestrator (Claude Opus 4.7)
Decides which agents to invoke, assembles context, manages lifecycle
         ↓ selectively dispatches ↓

┌─────────┐ ┌───────────┐ ┌─────────┐ ┌────────────┐
│  Orbit  │ │Mineralogy │ │ Thermal │ │ Topography │
└─────────┘ └───────────┘ └─────────┘ └────────────┘
┌─────────┐ ┌───────────┐ ┌─────────┐ ┌────────────┐
│ Imagery │ │  Mission  │ │ Hazards │ │Data ingest │
│         │ │  history  │ │         │ │            │
└─────────┘ └───────────┘ └─────────┘ └────────────┘
         ↓ active agents converge ↓
    Mission Brief Output
```

### Agent Roles

**Hackathon priority: build Data ingest, Imagery, Mineralogy, Mission history, and Orbit fully. Data ingest is infrastructural — it runs first on every query and feeds the four core agents. Without it nothing works. Thermal, Topography, and Hazards are present in the UI but return stub responses for V1.**

| Agent | Data Source | V1 Status | Output |
|-------|-------------|-----------|--------|
| **Data ingest** | Orchestrator layer | Build fully | Fetches and normalizes raw NASA API data for all active agents; runs first on every query; invisible in output but visible as active in the agent rail |
| **Orbit** | NASA SVS ephemeris + illumination JSON | Build fully | Ground track, solar illumination windows, orbital geometry |
| **Mineralogy** | JSC Lunar Sample API | Build fully | Regolith composition, Apollo sample cross-reference, mineral flags |
| **Imagery** | LROC NAC/WAC via ODE REST API + NASA Image Library | Build fully | High-res surface analysis via Opus 4.7 vision, image citations; auto-fetches real NASA photos for selected location and passes them to the vision model |
| **Mission history** | NASA Image Library + JSC Lunar API | Build fully | Prior missions to region, historical observations, crew notes |
| **Thermal** | NASA SVS / Diviner data | Stub for V1 | Temperature range, thermal cycling risk |
| **Topography** | LOLA elevation via ODE REST | Stub for V1 | Slope analysis, elevation profile, DEM data |
| **Hazards** | LROC slope + shadow data | Stub for V1 | Boulder density, permanently shadowed zones, terrain risk |

### Key Opus 4.7 Capabilities Used
- 1M token context window — holds entire mission dossiers + datasets simultaneously
- High-res vision (2576px / 3.75MP) — analyzes actual LROC lunar surface imagery
- Best-in-class tool use (77.3% on MCP-Atlas) — orchestrates across multiple NASA APIs in a single workflow
- Selective agent activation — orchestrator routes each query to only relevant specialists
- Long-horizon agentic work — sustained multi-step reasoning without degradation

---

## NASA Data Sources

All sources are free, public, and actively maintained. No scraping, no paywalls.

| Source | URL | Access | Used For |
|--------|-----|--------|----------|
| NASA Image & Video Library | images.nasa.gov/docs/ | Free, no key | Primary imagery; includes Artemis II flyby photos (April 7, 2026 release). Queried via `/api/nasa-images` route by location name + coordinates. |
| JSC Lunar Sample API | curator.jsc.nasa.gov/rest/lunarapi/ | Free, REST, no auth | Apollo mission rock samples queryable by mission, station, landmark |
| LROC Archive via ODE REST API | oderest.rsl.wustl.edu/live2/ | Free, public, v2.0 | LROC imagery by coordinates — WAC at 100m/px, NAC at 0.5m/px |
| NASA SVS Moon Phase & Libration | svs.gsfc.nasa.gov/5587 | Free, JSON download | Hourly solar illumination angles for 2026 — powers landing window modeler |
| NASA Open APIs | api.nasa.gov | Free key, rate limited | Supplementary: image search, mission context documents |

---

## UX Flow (V1 Scope)

### Screen 1 — Rotatable Lunar Globe
A Three.js lunar globe with a real LROC texture, 17 interactive location dots plotted at their precise lat/long coordinates, and slow ambient auto-rotation when idle. This is the entry point and the visual centerpiece.

**Globe behavior:**
- Auto-rotates slowly when idle — purposeful ambient motion, makes the interface feel alive
- 17 dots plotted using lat/long → 3D cartesian conversion: `x = cos(lat) * cos(lon)`, `y = sin(lat)`, `z = cos(lat) * sin(lon)`
- Dot states: idle (frost white, small), hover (cyan, slight scale up), selected (cyan pulse, locked, globe stops rotating)
- Single directional light simulating the Sun — real terminator line visible on the sphere
- NASA public domain LROC lunar texture (high-res, free to use)

**On dot selection:** globe gently stops rotating, selected dot locks to cyan pulse, metadata panel slides in showing name, coordinates, diameter, and significance note. For Carroll and Integrity: full naming story displayed.

**Coordinate conversion for all 17 dots:** pre-computed and hardcoded — no runtime math needed.

### Screen 1.5 — Image Gallery *(new)*
A large dialog that overlays the globe, entered via "Research this location" on the globe metadata panel. The globe remains visible and slowly rotating behind a dark overlay — this grounds the user spatially and reinforces that the gallery is a detour, not a new destination. Dialog is 80–85% of viewport width and height. Below a tablet breakpoint (~768px), the dialog expands to full screen.

**Gallery layout:**
- Hero image at top: the most recent NASA image for the location by acquisition date. For Artemis II locations this surfaces the April 6 2026 flyby imagery where available — caption reads "Last photographed April 6, 2026"
- Thumbnail grid below: remaining results in reverse-chronological order
- Each image shows: NASA asset ID, instrument label (LROC NAC / WAC / Artemis II crew), acquisition date
- Images fetched from `/api/nasa-images` — name-first search with coordinate-region keyword fallback; results sorted most-recent first

**Selection behavior:**
- User can add 0–4 images to context via a toggle on each thumbnail; selected images appear in a thumbnail strip pinned to the bottom of the dialog (same visual treatment as Claude.ai image attachments)
- No images are pre-selected — the user makes an active choice
- "Limited coverage" state for far-side locations (Carroll, Integrity): shows whatever regional imagery exists with a notice — never a dead end, never an empty screen

**Exit paths:**
- **Skip / Close (X)** — dismisses dialog, navigates to screen 2 with no imagery attached; location remains locked in
- **Continue** — dismisses dialog, navigates to screen 2 with selected images loaded in the thumbnail strip below the query composer; 0 images selected is treated the same as Skip
- **Click outside dialog / press Escape** — treated as Skip

### Screen 2 — Query Input
Natural language question with the selected location locked in. Agent rail visible on the left showing all 8 agents idle. Query templates for common asks. Entered from screen 1.5 (gallery) or directly if the user skipped the gallery.

**Imagery in the composer:**
- If images were selected in screen 1.5, they appear as a thumbnail strip below the textarea — same visual treatment as Claude.ai attached images
- User can remove individual images from the strip before submitting
- No "attach" button on this screen — imagery is added exclusively via the gallery (screen 1.5)
- 0 images attached is a valid query state — the Imagery agent simply does not activate if no images are present

### Screen 3 — Agent Reasoning Stream *(the wow moment)*
Orchestrator decides which agents to invoke. Selected agents activate in the left rail (◉ cyan, pulsing). Each active agent streams its output in real time in the main panel. Idle agents stay dark (○). Sources cited inline as agents pull NASA data. The selective activation — watching only 4 of 8 agents light up — tells the intelligence story without a word of explanation.

### Screen 4 — Mission Brief
Synthesized output from all active agents: findings grouped by agent, confidence ratings per claim, citations to exact NASA sources. Exportable as PDF or shareable link.

---

## The 17 Lunar Locations

### Group A: The Artemis 15
Scientifically significant landmarks the Artemis II crew studied during their April 6, 2026 flyby.

| # | Name | Coordinates | Diameter | Significance |
|---|------|-------------|----------|--------------|
| 1 | South Pole-Aitken Basin | 56°S, 180°W | ~2,500 km | Largest, deepest, oldest known impact basin on the Moon; far side |
| 2 | Orientale Basin | 19°S, 95°W | ~900 km | "Bullseye" crater with 3 concentric rings; seen by human eyes for the first time by Artemis II crew |
| 3 | Tycho | 43°S, 11°W | 85 km | Most prominent young crater; bright ray system visible from Earth with naked eye |
| 4 | Copernicus | 10°N, 20°W | 93 km | "Monarch of the Moon"; famous ray system and terraced walls |
| 5 | Clavius | 58°S, 14°W | 231 km | One of the largest near-side craters; famous chain of smaller craters within it |
| 6 | Bailly | 67°S, 69°W | 301 km | One of the largest craters on the near side; heavily degraded ancient basin |
| 7 | Petavius | 25°S, 61°E | 184 km | Prominent central peak; massive floor fracture (rille) radiating from center |
| 8 | Langrenus | 9°S, 61°E | 132 km | Well-preserved; complex terraced walls and bright central peak |
| 9 | Humboldt | 27°S, 81°E | 199 km | Near the eastern limb; known for distinctive floor fractures |
| 10 | Janssen | 45°S, 41°E | 201 km | Ancient, heavily eroded highland crater on the southeastern near side |
| 11 | Schickard | 44°S, 55°W | 212 km | Large walled plain near the Moon's southwestern limb |
| 12 | Stöfler | 41°S, 6°E | 130 km | Southern highlands; heavily overlapped by subsequent impacts |
| 13 | Maginus | 50°S, 6°W | 156 km | Ancient, worn crater in the rugged southern highlands |
| 14 | Longomontanus | 50°S, 21°W | 146 km | Large old crater southwest of Tycho |
| 15 | Vendelinus | 16°S, 62°E | 141 km | Ancient crater on the edge of Mare Fecunditatis |

### Group B: Named by the Artemis II Crew
Proposed on April 6, 2026 during the lunar flyby. Both names are pending formal submission to the International Astronomical Union.

| # | Name | Coordinates | Significance |
|---|------|-------------|--------------|
| 16 | Carroll *(proposed)* | 18.84°N, 86.51°W | Named for Carroll Taylor Wiseman, late wife of commander Reid Wiseman (died 2020). Near the near/far side boundary — visible from Earth at certain times. Described by the crew as "a bright spot on the moon." NASA confirmed the LROC coordinates. |
| 17 | Integrity *(proposed)* | 2.66°N, 104.92°W | Named for the Orion spacecraft. Located just northwest of Orientale basin on the far side. Named moments after the crew broke the human distance record from Earth. |

---

## Design System

### Mood & Direction
Artemis-era NASA mission control — awe-inducing, credible, and accessible. The interface should make a first-time user feel like they've stepped into a control room and can finally ask all their questions about the Moon. Technical and precise, never decorative or marketing-like.

### Color Tokens

| Token | Hex | Role |
|-------|-----|------|
| `--color-base` | `#050C1A` | Background — deep navy-black, reads as deep space (not pure black) |
| `--color-primary` | `#E8EDF5` | Primary accent — near-white, slightly cool; headlines, key actions, wordmark |
| `--color-secondary` | `#7DD3FC` | Secondary accent — icy cool blue; data labels, agent status, supporting UI |

### Typography
- **Display font:** Geist (geometric sans-serif) — headers, wordmark, navigation. Engineered and precise, not cold.
- **Data font:** Monospace — coordinates, agent reasoning stream, status readouts. Reinforces that data is being *computed*, not generated.
- Use Geist for all UI chrome. Switch to monospace specifically for: lat/long coordinates, agent stream output, confidence scores, citation labels.

### Texture & Motion
- **Background:** Subtle grain overlay on `#050C1A` — gives the interface weight and atmosphere, feels alive without moving
- **Animation:** Purposeful only. Every animation must earn its place:
  - Agent status indicators pulse while active
  - Reasoning stream text arrives as it streams — never appears all at once
  - Location selection snaps cleanly into place
  - Nothing animates purely for decoration
- **Never:** floating particles, glowing orbs, hover effects that exist only to look cool, anything that reads as a SaaS marketing page

### Mode
Dark only. Always. Lunar surface imagery on a dark background is the entire visual experience.

### Components
shadcn/ui + Tailwind for structural scaffolding (dropdowns, cards, scroll areas, badges). Reach for plain Tailwind when shadcn adds complexity without value.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js + Tailwind + shadcn/ui | App Router for streaming responses |
| Globe | Three.js (r128) | SphereGeometry + LROC texture + Raycaster for dot click detection |
| AI | Anthropic SDK — `claude-opus-4-7` | 8 specialist agents + orchestrator; streaming enabled |
| Agent orchestration | Custom harness | Orchestrator selectively invokes agents per query; active agents stream in parallel |
| Backend | Next.js API routes | NASA API proxying + rate limit handling; no separate server needed |
| Icons | Lucide | Thin stroke, monochrome — the only icon system used |

---

## V1 vs V2 Scope

### V1 — Hackathon build
- Three.js rotatable lunar globe with 17 interactive location dots
- Location metadata panel on dot selection (including Carroll/Integrity naming story)
- Image gallery screen (screen 1.5) between globe and query: hero image (most recent) + thumbnail grid, 0–4 images selectable, limited coverage fallback for far-side locations, skippable
- Natural language query input with selected images shown as thumbnail strip below composer; imagery added via gallery, not via attach button
- 8-agent rail UI — 5 agents built fully (Data ingest, Orbit, Mineralogy, Imagery, Mission history), 3 stubbed (Thermal, Topography, Hazards)
- Selective agent activation — orchestrator lights up only relevant agents per query
- Live agent reasoning stream with real-time source citations
- Mission brief output with per-claim confidence scores and NASA citations
- PDF export

### V1 — Optional (time permitting)
- Landing page: single-viewport entry point with LUNA wordmark, two-sentence pitch, and "Get Started" CTA; lunar globe or static screenshot as background; no scrolling, no sections

### V2 — Post-hackathon
- Full LROC tile layer on the globe (pan, zoom, real imagery)
- Drop-a-pin anywhere — custom coordinate input beyond the 17 locations
- All 8 agents built fully
- Save + compare multiple site briefs
- User accounts + brief history
- Shareable brief links

### Screen 0 — Landing Page *(optional, time permitting)*
A single-viewport entry point. The lunar globe — or a high-quality static screenshot of it — fills the background, dark and atmospheric. No scrolling. No sections. No feature list.

**Content:**
- LUNA wordmark top left
- Two sentences of copy, centered: the Artemis II timing hook and what LUNA does. Suggested copy: *"Artemis II returned to Earth on April 10. The crew captured 7,000 images of the lunar surface — and proposed naming two craters themselves. LUNA helps you understand what they found."*
- Single CTA button: "Get Started" → navigates to the globe (screen 1)

**Design constraints:**
- One viewport only — if content doesn't fit without scrolling, cut copy, not the constraint
- Matches LUNA design system exactly: `#050C1A` base, grain overlay, Geist, frost white + cyan
- No animations beyond the globe background and the existing grain texture
- No nav, no footer, no secondary links

**Build priority:** slot in Friday afternoon after E7 is complete. If E5 or E6 runs long, cut without guilt — the app is fully functional without it.

---

## Demo Script

**Opening line:** "Last week, the Artemis II crew flew past Vavilov Crater and proposed naming a nearby crater 'Integrity' after their spacecraft. Let me show you what LUNA can do with that."

**Step 1 — Set the scene (30 sec)**
Open LUNA. The lunar globe is slowly rotating. Point out the 17 dots. "Every one of these is a location the Artemis II crew studied — plus two they named themselves, right there on the far side." Mention the 7,000 images released April 7. "This data is live. Nobody has reasoned across it like this before."

**Step 2 — Select Integrity, browse the gallery, add images (30 sec)**
Click the Integrity dot on the globe — it stops rotating, the dot pulses cyan, the metadata panel slides in showing the naming story. Click "Research this location." The image gallery opens — hero image at top, most recent first. "This is the most recent photograph of this crater. Last photographed April 6, 2026 — eight days ago, by the Artemis II crew." Select 2–3 images from the grid. Hit Continue.

**Step 2b — Ask the question (15 sec)**
Screen 2 loads with the selected images in the thumbnail strip below the composer. Type: "What do we know about this region geologically, and is it interesting for Artemis III?" Submit.

**Step 3 — Watch the agents activate (60–90 sec)**
The agent rail lights up — Imagery, Mineralogy, Mission history, Orbit all go cyan and start pulsing. Thermal and Hazards stay dark. Narrate: "Watch — the orchestrator only activated the agents relevant to this question. Four of eight. The others are standing by." Streams begin. "Imagery is analyzing those NASA photos right now using Opus 4.7 vision — it can see the surface at 0.5 meters per pixel. Mineralogy is cross-referencing Apollo sample records. Mission history is finding every prior observation of this region." This is the visual payoff.

**Step 4 — Land the point (30 sec)**
Mission brief appears. Show the findings grouped by agent, the confidence ratings, the citations to real NASA sources. "That would have taken a planetary science grad student half a day. A journalist covering Artemis III can now do it in two minutes — and every claim traces back to a real NASA data source."

---

## Key Framing Notes

- The "Artemis 15" is described as the landmarks the crew memorized for navigation — not an official NASA designation. Accurate and compelling.
- Carroll and Integrity are labeled "proposed" throughout the UI — scientifically honest and adds authenticity
- Carroll's story (named for Reid Wiseman's late wife) is surfaced in the metadata card — emotionally resonant for the target audience of science communicators
- LUNA positions itself as a **research co-pilot for curious non-specialists**, not a mission planning tool. Never compete with what NASA engineers already have.

---

*Spec compiled: April 2026*  
*Model: Claude Opus 4.7 (claude-opus-4-7)*  
*Hackathon: Claude Code Hackathon 2026*
