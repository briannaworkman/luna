# Intro Page Design Spec

**Date:** 2026-04-25  
**Status:** Approved

---

## Overview

Add a full-screen intro/landing page that serves as the entry point to LUNA. Every visitor passes through it before reaching the globe. It explains what LUNA is in a few words, then gets out of the way.

---

## Route Changes

| Route | Before | After |
|-------|--------|-------|
| `/` | Globe/list view | Intro page (new) |
| `/explore` | — | Globe/list view (moved) |

The current `app/page.tsx` moves to `app/explore/page.tsx`. A new `app/page.tsx` contains the intro page.

The TopBar `LUNA` link currently points to `/` — no change needed since `/` is still the logical home.

---

## Visual Design

### Background
- Base color: `--luna-base` (`#050C1A`)
- Radial gradient overlay: `ellipse at 50% 45%`, from `#0D1E3A` at center to `#050C1A` at ~62%
- Star field: ~13 static CSS dots scattered across the viewport, mix of white (`--luna-fg` at low opacity) and cyan (`--luna-cyan`), sizes 1–2px
- Lunar arc: three concentric circle outlines positioned bottom-right, extending off-screen. Borders use `rgba(125, 211, 252, ...)` at 0.12, 0.06, and 0.03 opacity respectively. Sizes: 320px, 440px, 560px.

### Layout
- Full-viewport (`position: fixed; inset: 0; top: 56px` to clear TopBar)
- Content centered horizontally and vertically with flexbox
- Max content width: 520px

---

## Content Stack

All elements centered. Top to bottom:

### 1. Location Dots
Five small circles in a row, spaced 10px apart, styled like the globe's landing site markers:
- Outer two: `border: 1px solid rgba(125, 211, 252, 0.35)`, opacity 0.4
- Middle two: `border: 1px solid #7DD3FC`, opacity 0.7, no fill
- Center one: filled `#7DD3FC`, `box-shadow: 0 0 6px rgba(125, 211, 252, 0.5)`, opacity 1

Margin below: 28px.

### 2. Headline
> The gap between curiosity and NASA data, closed.

- Font: `--luna-font-display` (Geist), weight 600
- Size: `clamp(34px, 5vw, 50px)`
- Letter-spacing: `-0.025em`
- Line-height: `1.06`
- Color: `--luna-fg` (`#E8EDF5`)
- Margin below: 16px

### 3. Subline
> A multi-agent co-pilot for NASA's lunar data.

- Font: Geist, weight 400
- Size: 15px
- Color: `--luna-fg-3` (`#7A849A`)
- Letter-spacing: `-0.01em`
- Margin below: 32px

### 4. Bullets
Three items, left-aligned within the centered content block. Max width 380px. Gap between items: 10px.

- **—** Pick from 17 Artemis candidate landing sites on an interactive globe
- **—** Ask any question — specialist agents pull from real NASA sources in real time
- **—** Get a cited research brief in under a minute

Each bullet: `—` dash in `--luna-cyan`, body text in `--luna-fg-2` (`#B8C1D1`), font size 14px. Dash rendered in `--luna-font-mono`.

Margin below: 40px.

### 5. CTA Button
> Get Started →

- Background: `--luna-fg` (`#E8EDF5`)
- Text: `--luna-base` (`#050C1A`)
- Font: `--luna-font-mono`, size 12px, weight 500, `letter-spacing: 0.14em`, uppercase
- Padding: `11px 28px`
- Border-radius: 3px
- Hover: `opacity: 0.88`
- `href`: `/explore`

---

## TopBar
No changes. The fixed TopBar (LUNA logo + crescent icon) renders above the intro page as it does on all other screens.

---

## Files to Create / Modify

| Action | File | Change |
|--------|------|--------|
| Move | `app/page.tsx` → `app/explore/page.tsx` | Also update `router.replace('/')` in `HintBanner` to `router.replace('/explore')` |
| Create new | `app/page.tsx` | Intro page component |
| Update | `components/screen2/QueryComposer.tsx` | `router.push('/')` → `router.push('/explore')` |
| No change needed | `app/layout.tsx` | — |
| No change needed | `components/top-bar/TopBar.tsx` | TopBar `LUNA` link stays as `href="/"` (intro is now the logical home) |

---

## Out of Scope

- No animation on page load (stars don't twinkle, dots don't animate)
- No mobile-specific layout changes beyond what responsive text sizing gives
- No "skip intro" or "don't show again" logic
