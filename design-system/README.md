# LUNA Design System

**LUNA is a multi-agent lunar research co-pilot powered by Claude Opus 4.7.**
It targets curious non-specialists — science journalists, space creators, Substack writers, and undergraduate planetary science students — who followed Artemis II obsessively and want to go deeper than press releases, but hit a wall when they try to engage with actual NASA data.

LUNA sits between a research notebook and an agent console. A constellation of specialist agents (orbit mechanics, mineralogy, thermal imaging, mission history, data ingestion) work in parallel behind a single calm surface. The user asks a question in plain English; LUNA returns sourced, cross-checked, citeable answers with the raw data attached.

The brand reflects the subject: a dark, deep-space ground; frosted-white type like moonlight on regolith; a single cyan accent that behaves like a data beacon. Every pixel earns its place.

---

## Sources (as provided)

- **Brand fonts:** `fonts/Geist-VariableFont_wght.ttf`, `fonts/JetBrainsMono-VariableFont_wght.ttf`, `fonts/JetBrainsMono-Italic-VariableFont_wght.ttf` — loaded via `@font-face` at the top of `colors_and_type.css`. Both are variable fonts covering the full 100–900 weight range.
- **shadcn-ui/ui (GitHub):** browsed on demand for component DNA — border radii, sizing, variant shape. Specific files read: `apps/v4/registry/new-york-v4/ui/{button,card,input,badge}.tsx`. The components in `ui_kits/luna-app/` are LUNA-tinted recreations, not exact source.
- **Brand notes (provided in spec):** base `#050C1A`, primary accent `#E8EDF5`, secondary accent `#7DD3FC`, grain overlay, purposeful motion, Geist + JetBrains Mono, dark-only.

---

## Index — what's in this folder

```
README.md                 ← you are here
SKILL.md                  ← Agent Skills entry point (cross-compatible with Claude Code)
colors_and_type.css       ← all CSS variables: color, type, spacing, radius, shadow, motion
fonts/                    ← Geist + JetBrains Mono variable TTFs (loaded via @font-face)
assets/                   ← luna-mark.svg, luna-wordmark.svg
preview/                  ← small HTML cards shown in the Design System tab
  color-*.html            ← base palette, frost foreground, cyan accent, semantic
  type-*.html             ← display scale, body scale, mono data, specimen
  spacing-scale.html      ← 4px grid
  radius-scale.html       ← corner radii
  shadow-elevation.html   ← elevation + glow
  motion-tokens.html      ← durations & easing
  component-*.html        ← buttons, inputs, badges, cards, agent stream, menu/popover
  brand-*.html            ← wordmark lockup, grain texture
ui_kits/
  luna-app/               ← LUNA desktop research console
    README.md             ← component breakdown
    index.html            ← interactive click-thru prototype
    app.css               ← component styles
    AppShell.jsx, AgentRail.jsx, Conversation.jsx,
    Composer.jsx, DataDock.jsx, Primitives.jsx
```

---

## CONTENT FUNDAMENTALS

**Voice.** Calm, technical, quietly enthusiastic. LUNA is a _co-pilot_, never a mascot. It speaks the way a senior researcher speaks to a bright, curious intern: patient, precise, never patronising. It will happily explain what a sol is, but it won't add confetti.

**Person.** Second person for the user (_"you"_), first-person-plural only for the product team (_"we add a citation"_ — not _"we found that…"_). Agents are referred to in the third person by their role name: _the orbit agent,_ _the mineralogy agent._ Never "I" from the product.

**Casing.**
- **Sentence case** for every UI label, button, heading, menu item, toast. No Title Case.
- **UPPERCASE** only for mono eyebrows, data labels, status pills, and the wordmark (`LUNA`).
- Proper nouns retain their native casing: _Artemis II, Mare Tranquillitatis, LRO, NASA, Claude Opus 4.7._

**Numbers, units, coordinates.** Always in JetBrains Mono. Tabular figures (`font-variant-numeric: tabular-nums`). Degrees/minutes/seconds or decimal degrees, never mixed in the same block. Always sourced (`LROC · 2024-08-12`).

**Emoji.** **No emoji anywhere** — not in UI, not in copy, not in marketing. This includes 🌙 and 🚀, which would be on-theme and are precisely why the temptation must be refused. Iconography is strictly Lucide (thin stroke, monochrome).

**Unicode characters used as punctuation/glyphs:**
- `·` (middle dot) — separator between metadata items: `LROC · 2024-08-12 · 0.5 m/px`
- `→` — agent-to-agent handoffs, links that go somewhere
- `↗` — external links that leave LUNA
- `—` (em dash) — mid-sentence breaks, definitions
- `↑ ↓` — sort indicators
- `◉` — active agent indicator (paired with cyan)
- `○` — idle agent indicator
- `┃` — only in mono streams, vertical rule between token groups

**Tone examples.**

| Context | ✅ Do | ❌ Don't |
|---|---|---|
| Empty state | "Ask LUNA anything about the Moon." | "Let's blast off! 🚀 What are we exploring today?" |
| Agent working | `orbit agent · computing ground track…` | "Hold tight, crunching numbers!" |
| Error | "The source data is temporarily unreachable. LUNA is retrying." | "Oops! Something went wrong." |
| Citation | "Source: LROC NAC · M1334189784LE · 2024-08-12" | "(found this online)" |
| Confirmation | "Saved to your notebook." | "Great job! 🎉 Saved!" |
| Welcome | "Good evening. Twelve agents are standing by." | "Welcome back, explorer!" |

**Copy density.** Prefer one sentence over two. Prefer two short sentences over one long one. Labels under 24 characters. Buttons under 18 characters. Empty states under 12 words.

---

## VISUAL FOUNDATIONS

### Constraint summary — read this before you build

The constraints below are deliberately tight and **reinforce each other**. Read the whole list before opening a file — the system breaks if you adopt them piecemeal.

1. **Dark-only.** No light mode, ever.
2. **Grain on large surfaces only.** No grain inside cards, on buttons, or on any element under ~240px in either dimension.
3. **Gradients are functional, not decorative.** Allowed: protection gradients under type on full-bleed imagery; the cyan pulse/glow around the active-agent dot. Disallowed: card backgrounds, heading fills, hero washes, button fills.
4. **Blur is for large overlays only.** Modals (8px), sticky nav when scrolled (12px). **No blur on tooltips, popovers, menus, or chips** — blur on tiny surfaces reads as cheap glassmorphism.
5. **No emoji. No decorative icons.** Stroke-only Lucide, monochrome.
6. **One cyan-filled element per viewport maximum** (see cyan rules above). Cyan text/dots may repeat in data-dense views when they represent live data.
7. **Motion is purposeful only.** No bounces, springs, parallax, or scroll-triggered flourishes.
8. **No illustrations.** Real lunar imagery, real diagrams, or flat navy. Nothing stylised.
9. **Every border is 1px.** No 2px, no dashed/dotted.
10. **Sentence case everywhere** except mono data labels and the wordmark.

### Ground

The canvas is **`#050C1A`** — a navy that reads as black in most contexts but has just enough blue to feel like the night side of something. Every surface is built on top of this. **Dark-only. There is no light mode.** The grain overlay (SVG fractalNoise, ~3.5% alpha, screen blend) sits above the base on large surfaces to give the ground atmosphere; it is off on small elements and inside cards.

### Color system

Four families, used in strict proportion:

| Family | Usage | Coverage |
|---|---|---|
| **Base (navy)** — `#050C1A` → `#1A2942` | Every background, card, panel | ~75% |
| **Frost (whites)** — `#E8EDF5` → `#4A5368` | Headlines, body, UI chrome, icons | ~18% |
| **Cyan** — `#7DD3FC` | Data labels, active agent, coordinates, the single primary CTA on a screen | ~5% |
| **Semantic** — success/warning/danger/violet | Status only, never decorative | ~2% |

Cyan is the accent. **Use it where the spec allocates it** — agent status dots, data labels, coordinates, and the single primary CTA — and nowhere else. In most views this lands as 1–2 cyan elements on screen. The reasoning / agent-stream view is the intentional exception: a data-dense surface where many of these roles co-occur (active-agent dots, streaming coordinates, live data labels, one CTA). That's fine **because they are all the _same role_ — they are all "data is moving" signals.** If you catch yourself reaching for cyan for a heading, a divider, a decorative line, a hover wash, or "just to liven it up" — stop.

**Rule of thumb across the product:**
- **Quiet views (read/detail/marketing):** one cyan element, full stop.
- **Data-dense views (agent stream, observatory, notebook):** cyan may repeat for live-data signals only; everything chrome-ish (labels, CTAs that aren't `run`, headings) stays in frost.
- **Never more than one cyan-*filled* (background) element per viewport.** A cyan background carries far more weight than cyan text — the primary CTA is the only filled-cyan thing on screen.

### Type

- **Geist** — display, headings, wordmark, navigation, body. Medium weight (500) is the workhorse; Regular (400) for long-form body; Semibold (600) for numerics in display. Slight negative tracking on headlines (`-0.02em`).
- **JetBrains Mono** — coordinates, timestamps, filenames, agent names, status readouts, kbd shortcuts, tags. Always uppercase with `0.14em` tracking when used as a data label. Tabular numerics.

No third family. No serifs. Ever.

### Spacing

4px base grid. Cards breathe at 24–32px padding. Dense data tables use 8–12px row padding. Section spacing is large — `--luna-sp-16` (64px) minimum between major blocks on marketing surfaces; `--luna-sp-8` (32px) inside the app.

### Backgrounds & imagery

- **Full-bleed hero imagery:** actual lunar photography (LROC, Apollo, Chang'e) — desaturated, slightly cool grade. Never illustrated moons. If imagery is unavailable, the default hero is flat `--luna-base` with the grain overlay and a single cyan coordinate readout top-right.
- **Illustrations:** avoided. This product's aesthetic is "the data is the art." If you must use a visual element, use a real orbital diagram, a real topographic map, a real spectrograph — never a stylised drawing.
- **No gradients as decoration.** Gradients only appear as _protection gradients_ at the bottom of full-bleed images (for legibility of overlaid type) and as subtle scanline/glow effects around the active agent avatar.
- **Patterns:** a 1px hairline grid (`#1F2E4A`, 48px cell) is acceptable as a map/canvas backdrop; nowhere else.

### Motion

Motion is purposeful only. Every animation must answer _"what does this tell the user?"_

- **Fade in** (120ms, `ease-out`) — content arriving
- **Slide up 4px + fade** (220ms, `ease-out`) — panels, tooltips, menus
- **Width pulse on cyan dot** (2s infinite, slow sine) — active agent only
- **Typewriter / token stream** (natural speed, mono) — agent output
- **No bounces. No springs. No parallax. No scroll-triggered flourishes.** This is a research tool.

### States

| State | Treatment |
|---|---|
| **Hover** on button (default) | `bg` lightens 6% (`--luna-base-2` → `--luna-base-3`) |
| **Hover** on icon/ghost | text lifts `--luna-fg-3` → `--luna-fg`, no bg change |
| **Hover** on cyan CTA | cyan darkens to `--luna-cyan-dim` |
| **Press** | 70% scale on the opacity (no size change), 80ms |
| **Focus** | 2px cyan ring offset 2px from the element by the base color |
| **Disabled** | opacity 0.4, no pointer |
| **Loading** | no spinners — mono text readout of what's happening |

### Borders & hairlines

1px is the default. `--luna-hairline` (`#1F2E4A`) is the quiet border, used for cards and dividers. `--luna-hairline-2` (`#2A3B5C`) is for inputs and when a stronger edge is needed. No 2px borders. No dashed/dotted borders. An inset `rgba(255,255,255,0.03)` highlight line sits on top of most surfaces in the shadow token — this is the only "light" touch on an otherwise dark system.

### Corner radii

Restrained. Data UI is not rounded-friendly.

- `2px` — tags, pills, kbd
- `4px` — inputs, small cards, code blocks
- `6px` — buttons, standard cards (default)
- `8px` — large panels, modals
- `12px` — hero cards only

No `9999px` pills except for status dots and avatars.

### Cards

- Background `--luna-base-2`
- Border 1px `--luna-hairline`
- Radius `6px` (default) or `8px` (panel)
- Shadow `--luna-shadow-sm` at rest, `--luna-shadow` on hover
- Inside padding `24px` (default) or `32px` (feature card)
- Header/footer separated by a 1px hairline divider, not whitespace alone

### Transparency & blur

Used sparingly:
- **Modals** — backdrop is `rgba(5,12,26,0.72)` with `backdrop-filter: blur(8px)`
- **Sticky nav** — `rgba(5,12,26,0.76)` with `backdrop-filter: blur(12px)` when scrolled
- **Tooltips/popovers** — opaque `--luna-base-2`, no blur (blur on tiny surfaces looks cheap)
- **Protection gradients** on full-bleed photography — `linear-gradient(180deg, transparent 40%, var(--luna-base) 100%)`

### Layout rules

- Max content width 1280px on marketing; app is fluid with a fixed 280px left rail.
- Fixed top bar height 56px; fixed bottom composer on the conversation view.
- Rhythm: all block spacing is a multiple of 4px. All text baselines align to an 8px grid on marketing surfaces.
- The cyan data-label eyebrow introduces every major section. The eyebrow is the hero element, not the heading.

### Imagery grading

When lunar imagery is used:
- Desaturate to ~60%
- Cool the white point slightly (~+5 on blue channel)
- Crush blacks to `--luna-base` at the bottom 20%
- Never warm, never orange, never tinted purple
- Grain is natural — do not add synthetic grain on top of photography

---

## ICONOGRAPHY

**System:** [**Lucide**](https://lucide.dev) — loaded from CDN. Lucide's thin 1.5px stroke, rounded joins, and monochrome approach is the only icon language LUNA uses. We don't mix icon sets.

```html
<script src="https://unpkg.com/lucide@latest"></script>
<!-- usage: <i data-lucide="satellite"></i> then lucide.createIcons() -->
```

**Substitution note:** the spec did not ship a proprietary icon set. Lucide was chosen as the closest match to the LUNA aesthetic (thin stroke, geometric, no fill). **If the real product uses a different icon system, flag it and replace.**

**Rules.**
- **Stroke only, no fills.** Even "filled" Lucide variants are avoided. The only exception is the active-agent dot (`●`), which is a pure CSS disc in cyan.
- **Size: 16px** in inline chrome (buttons, inputs), **20px** for nav/sidebar, **24px** in empty states, **40–56px** in onboarding/hero moments.
- **Color:** icons inherit `--luna-fg-2` by default, `--luna-fg` when active/hovered, `--luna-cyan` only when the icon represents live data or an agent.
- **Don't rotate.** Icons should sit still. The single exception is a radar/orbit icon on the loading state for the observatory view.

**Glyphs used instead of icons** (inline with type):
- Middle dot `·`, em dash `—`, arrow `→`, up-arrow `↗`
- Agent dots `◉` (active) / `○` (idle)
- Sort arrows `↑` `↓`

**Brand marks.** The LUNA wordmark is Geist Medium, uppercase, letter-spacing `0.14em`. A simple SVG crescent can accompany it in compact spaces (see `assets/luna-mark.svg`). The wordmark on the dark ground is always `--luna-fg` (`#E8EDF5`). Never cyan. Never gradient. Never outlined.

**No emoji. Anywhere. Ever.**
