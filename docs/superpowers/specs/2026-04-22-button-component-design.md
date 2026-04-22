# Button Component Design

**Date:** 2026-04-22  
**Status:** Approved

## Overview

A shared `Button` component for the Luna app built on shadcn's Button primitive, re-skinned with luna design tokens. Replaces the four ad-hoc `<button>` elements currently in `LocationPanel.tsx` and `ImageGalleryDialog.tsx`.

## Approach

Install shadcn's Button (`components/ui/button.tsx`) via the CLI. Make two targeted changes:

1. Update `--primary` in `globals.css` from the current foreground-shade mapping to the luna-cyan HSL value, so shadcn's `primary` variant resolves to the correct CTA color.
2. Add an `icon` variant to the component file (shadcn does not ship this by default).

No other files change as part of this spec. Migration of existing raw `<button>` elements is a follow-on task.

## Component API

**File:** `components/ui/button.tsx`  
**Base:** `@radix-ui/react-slot` + CVA (installed by shadcn)

```tsx
<Button variant="primary" size="md">Continue</Button>
<Button variant="outline" size="sm">Skip</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="icon" aria-label="Close"><X size={16} /></Button>
```

## Variants

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| `primary` (default) | `bg-luna-cyan` | `text-luna-base` | `border-luna-cyan` | `bg-luna-cyan-dim border-luna-cyan-dim` |
| `outline` | transparent | `text-luna-fg-3` | `border-luna-hairline` | `text-luna-fg border-luna-hairline-2` |
| `ghost` | transparent | `text-luna-fg-3` | none | `bg-luna-base-3 text-luna-fg` |
| `icon` | transparent | `text-luna-fg-3` | none | `bg-luna-base-3 text-luna-fg` |

All variants use `transition-colors` and inherit the global focus ring (2px luna-base offset + 2px luna-cyan, defined in `globals.css`).

## Sizes

| Size | Height | Padding | Font size |
|------|--------|---------|-----------|
| `md` (default) | `h-10` (40px) | `px-5` | `text-sm font-medium` |
| `sm` | `h-8` (32px) | `px-3` | `text-xs font-medium` |

The `icon` variant ignores size — always renders as `h-8 w-8` with `place-items-center`.

## CSS Variable Change

In `globals.css`, update the shadcn token bridge inside `.dark`:

```css
/* Before */
--primary: 220 43% 94%;           /* was luna-fg */
--primary-foreground: 220 56% 7%; /* luna-base */

/* After */
--primary: 200 95% 74%;           /* luna-cyan (#7DD3FC) */
--primary-foreground: 220 56% 7%; /* luna-base (#050C1A) — unchanged */
```

## Out of Scope

- Migration of existing raw `<button>` elements in `LocationPanel.tsx` and `ImageGalleryDialog.tsx` — follow-on task.
- `destructive`, `secondary`, `link` shadcn variants — not needed for V1; leave in place from the shadcn install but unstyled.
