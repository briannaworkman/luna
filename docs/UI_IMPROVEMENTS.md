# LUNA UI/UX Improvement Suggestions

**Date:** April 22, 2026  
**Context:** Frontend design review of current implementation vs. design system and prototypes

---

## Current Strengths ✅

- Exceptional design discipline: consistent dark aesthetic, purposeful use of cyan, restrained typography
- Interactive globe is engaging—the pause-on-select, auto-rotate-resume pattern is elegant
- Clear information hierarchy with Geist + JetBrains Mono pairing
- Design system documentation is thorough and intentional

---

## UX/UI Improvements

### 1. Feedback & Affordance on the Globe ⭐

**Problem:** When users interact with the globe (hover/drag), there's minimal visual feedback that they can select locations.

**Suggestions:**
- Add a **hover outline** on location dots (small cyan ring, 2px, animated fade-in)
- Show a **cursor change** on hover (`cursor: pointer`)
- On **drag**, dim unselected dots to 20% opacity, elevate selected one
- Add **subtle tooltip on hover** below each dot with location name (appears after 400ms)

**Impact:** Users will immediately understand that dots are interactive.

---

### 2. LocationPanel Visual Hierarchy ⭐

**Problem:** The right-side panel lacks clear visual separation between sections and can feel information-dense.

**Suggestions:**
- Add **vertical separator line** (1px hairline) between coordinates and significance
- Use **larger line-height** (1.7) for body text in panel for better readability
- Add **small caps headers** for sections (COORDINATES, SIGNIFICANCE, PROPOSED STATUS) in `--luna-cyan` above each block
- Use **lighter dividers** (`--luna-hairline`) to separate sections internally instead of whitespace alone

**Impact:** Scannability improves; users find information faster.

---

### 3. ImageGalleryDialog (Screen 1.5) is Still a Placeholder 🚨

**Critical:** This screen exists in the prototype but is currently stub HTML. When implementing:

**Key improvements:**
- **Hero image area:** Show region-appropriate imagery with a **coverage notice** for far-side locations (Carroll, Integrity) — "No satellite imagery available · regional context only"
- **Thumbnail grid:** Wrap with a **selection indicator** (cyan checkmark on hover, filled on selected)
- **Visual feedback:** Selected thumbnails should have a **2px cyan border** and highlight
- **Clear affordance:** Make it obvious you can select 0–4 images — show a **status line** at bottom: "Selected: 2 of 4"
- **Keyboard support:** Allow arrow keys to navigate, Space/Enter to toggle selection

**Impact:** Users understand the mechanic; selection feels intentional.

---

### 4. Add Onboarding / Empty State Clarity ⭐

**Problem:** First-time users land on a globe and may not understand the flow.

**Suggestions:**
- Add a **subtle keyline** (1px `--luna-hairline`) around the globe container (desktop only)
- Below globe, add small text: **"Tap a location to begin"** in `--luna-fg-3` (less prominent until interaction)
- On very first load, show a brief **1-line tooltip** under a dot: "Tap to explore"
- When LocationPanel opens, highlight the **"Research"** button with a soft **cyan glow** (pulsing, 2s ease-in-out)

**Impact:** New users understand the intended path: globe → panel → gallery → query.

---

### 5. Agent Rail Visibility Prep (Screen 3) 🔮

**Planning note:** The agent-rail design exists in prototypes but isn't live yet. When building Screen 3:

- **Active agent indicator:** Use the `●` symbol with **2px cyan glow** underneath (box-shadow: `0 0 8px var(--luna-cyan)`)
- **Pulsing animation:** Agents pulse at **2s period, sine wave**—no easing, linear (easier on eyes than ease-in-out for long durations)
- **Stagger effect:** Each agent in the rail appears with **120ms stagger** as they activate
- **Hover tooltip:** Show agent description on hover (fade in 120ms)

**Impact:** Visual feedback that agents are working; data density feels intentional.

---

### 6. Button & Interaction Refinement ⭐

**Problem:** shadcn buttons are functional but could better match LUNA's aesthetic.

**Suggestions:**
- **Primary CTA (cyan):** Only use `--luna-cyan` background when it's the single most important action per screen
- **Secondary buttons:** Use `--luna-base-2` background with `--luna-fg` text (currently may be too subtle)
- **Ghost buttons** (like "Skip" in gallery): No background, `--luna-fg-3` text on hover → `--luna-fg`
- **Disabled state:** Keep opacity 0.4 but add `cursor: not-allowed`
- **Focus ring:** 2px cyan with 2px offset (already spec'd, verify implementation)

**Impact:** Clear action hierarchy; users know what to do next.

---

### 7. Typography Micro-Refinements ⭐

**Problem:** Type scale is strong, but some details could be tighter.

**Suggestions:**
- **Coordinates in LocationPanel:** Use `font-variant-numeric: tabular-nums` + `font-family: var(--luna-font-mono)` + `--luna-text-sm` (13px) + `--luna-tr-mono`
- **Location name heading:** Add `letter-spacing: var(--luna-tr-display)` (–0.02em) for a sharper feel
- **Badge on panel** ("proposed"): Use `--luna-text-xs` (11px), `font-weight: 600`, all-caps with `letter-spacing: 0.14em`
- **Ensure line-height is 1.5+ for body text** (easier to read dense content)

**Impact:** Tighter visual polish; type feels more intentional.

---

### 8. Depth & Layering (Visual Hierarchy) ⭐

**Problem:** The panel and globe exist in the same visual plane.

**Suggestions:**
- **Panel shadow:** Increase from `--luna-shadow-sm` to `--luna-shadow` (larger offset, more blur)
- **Globe container:** Subtle inset shadow to create depth (`inset 0 0 40px rgba(0,0,0,0.5)`)
- **Backdrop of ImageGalleryDialog:** Keep at `rgba(5,12,26,0.82)` but verify blur is `8px` (currently spec'd, may not be implemented)
- **Hover states on cards:** Elevation up via shadow increase, background brightens to `--luna-base-3` (6% lighter)

**Impact:** Visual depth makes the interface feel more refined.

---

### 9. Accessibility & Keyboard Navigation 🎯

**Critical issues to audit:**
- Verify all interactive elements are **tab-navigable** (globe dots, buttons, close button)
- Add **skip link** to main content (after landing on page)
- Ensure **focus ring is always visible** (2px cyan is high contrast ✓)
- Test with screen readers: LocationPanel should announce when open/closed
- **Keyboard shortcuts:** Consider `Esc` to close panel (already implemented), `Space` to select image in gallery

**Impact:** Usable by everyone.

---

### 10. Responsive Behavior Refinement 📱

**Tablet/Mobile considerations:**
- On mobile: LocationPanel should slide from bottom (bottom sheet style) instead of right side — easier thumb reach
- ImageGalleryDialog: On mobile, expand to full-screen instead of 82% viewport
- Globe: Disable drag on very small screens (rotation only) or simplify interaction model
- Tooltip positioning: Ensure tooltips don't get cut off on mobile viewports

---

## Priority Order

1. **#1 (Hover feedback on globe)** — Quick win, big UX impact
2. **#3 (Finish Screen 1.5)** — Critical for the intended flow
3. **#5 & #9 (A11y + agent rail)** — Required before public launch
4. **#2, #4, #6** — Polish that compounds over time
5. **#7, #8, #10** — Refinement passes

---

## Design System Adherence Notes

All suggestions align with LUNA's design constraints:
- **No new colors** — all suggestions use existing `--luna-*` tokens
- **Motion is purposeful** — hover feedback, pulsing agents, staggered reveals
- **Type is restrained** — no new font families, consistent with Geist + JetBrains Mono
- **No decorative elements** — all additions serve information clarity
- **Dark-only aesthetic** — all changes preserve the nocturnal ground

---

## Implementation Checklist

- [ ] Globe hover feedback (dots + tooltip)
- [ ] LocationPanel section dividers and headers
- [ ] ImageGalleryDialog completion with real imagery
- [ ] Empty state / onboarding copy
- [ ] Agent rail styling (when building Screen 3)
- [ ] Button refinement across all screens
- [ ] Typography audit (coordinates, headings, badges)
- [ ] Shadow & depth refinement
- [ ] Keyboard navigation audit
- [ ] Mobile/responsive refinement
