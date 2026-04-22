# Button Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and customize shadcn's Button component with luna design tokens, then migrate all raw `<button>` elements in `LocationPanel.tsx` and `ImageGalleryDialog.tsx` to use it.

**Architecture:** Install shadcn's Button into `components/ui/button.tsx`, then replace its default class strings with luna-specific Tailwind tokens and add an `icon` variant. Update the `--primary` CSS variable in `globals.css` to point at luna-cyan. Finally, replace the five raw `<button>` elements in the two existing components with `<Button>` imports.

**Tech Stack:** shadcn/ui (new-york style), class-variance-authority, tailwind-merge, @radix-ui/react-slot, Tailwind CSS with luna design tokens.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `components/ui/button.tsx` | Create | shadcn install, then replace all variant classes with luna tokens + add `icon` variant |
| `app/globals.css` | Modify | Update `--primary` HSL value from fg-shade to luna-cyan |
| `components/globe/LocationPanel.tsx` | Modify | Replace 2 raw `<button>` elements with `<Button>` |
| `components/gallery/ImageGalleryDialog.tsx` | Modify | Replace 3 raw `<button>` elements with `<Button>` |

---

## Task 1: Install shadcn Button

**Files:**
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Run the shadcn Button installer**

```bash
pnpm dlx shadcn@latest add button
```

`components.json` already exists so the CLI will not prompt for project configuration — it will install directly. It will also install `@radix-ui/react-slot` as a new dependency.

Expected output ends with something like:
```
✔ Done. You can now import Button from @/components/ui/button.
```

- [ ] **Step 2: Confirm the file was created**

```bash
cat components/ui/button.tsx
```

Expected: a file containing `buttonVariants` (CVA definition) and a `Button` React component. Exact class strings will vary — that's fine, we replace them in Task 2.

- [ ] **Step 3: Commit the raw install**

```bash
git add components/ui/button.tsx pnpm-lock.yaml
git commit -m "chore: install shadcn Button component"
```

---

## Task 2: Remap CSS variable and customize button variants

**Files:**
- Modify: `app/globals.css:141` (the `--primary` line inside `.dark`)
- Modify: `components/ui/button.tsx` (full variant replacement)

- [ ] **Step 1: Update `--primary` in globals.css**

In `app/globals.css`, inside the `.dark` block, find the shadcn token bridge section and change the `--primary` line:

```css
/* Before */
/* #E8EDF5 */ --primary:               220 43% 94%;

/* After */
/* #7DD3FC */ --primary:               200 95% 74%;
```

The `--primary-foreground` line immediately below stays unchanged (`220 56% 7%`).

- [ ] **Step 2: Replace the full contents of `components/ui/button.tsx`**

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-sans font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        md: "h-10 px-5 text-sm",
        sm: "h-8 px-3 text-xs",
      },
      variant: {
        primary:
          "bg-luna-cyan text-luna-base border border-luna-cyan hover:bg-luna-cyan-dim hover:border-luna-cyan-dim",
        outline:
          "border border-luna-hairline text-luna-fg-3 hover:text-luna-fg hover:border-luna-hairline-2",
        ghost:
          "text-luna-fg-3 hover:bg-luna-base-3 hover:text-luna-fg",
        icon:
          "h-8 w-8 p-0 text-luna-fg-3 hover:bg-luna-base-3 hover:text-luna-fg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

> **Note on `icon` variant sizing:** `size` is defined before `variant` in the CVA variants object intentionally. CVA appends variant classes in definition order, so `variant` classes land after `size` classes in the output string. `tailwind-merge` (used inside `cn()`) keeps the last conflicting utility, meaning `icon`'s `h-8 w-8 p-0` overrides whatever `size` was passed. Callers should not pass a `size` prop when using `variant="icon"`.

- [ ] **Step 3: Run the type-checker to verify no errors**

```bash
pnpm typecheck
```

Expected: no errors. If you see a complaint about `Slot` or `@radix-ui/react-slot`, check that Step 1 of Task 1 completed and the package is in `node_modules`.

- [ ] **Step 4: Start the dev server and spot-check visually**

```bash
pnpm dev
```

Open `http://localhost:3000`. The globe and location panel should look unchanged — we haven't migrated any callers yet, so no visual difference expected at this point. Confirm the page loads without a runtime error.

- [ ] **Step 5: Commit**

```bash
git add components/ui/button.tsx app/globals.css
git commit -m "feat: add luna-themed Button component with primary, outline, ghost, icon variants"
```

---

## Task 3: Migrate LocationPanel.tsx

**Files:**
- Modify: `components/globe/LocationPanel.tsx`

There are two raw `<button>` elements to replace.

- [ ] **Step 1: Add the Button import**

At the top of `components/globe/LocationPanel.tsx`, add:

```tsx
import { Button } from '@/components/ui/button'
```

The existing imports (`X`, `ArrowRight`, `cn`, `Badge`) stay in place.

- [ ] **Step 2: Replace the close button (line ~59)**

Find:
```tsx
<button
  onClick={onClose}
  aria-label="Close panel"
  className="w-6 h-6 grid place-items-center bg-transparent border-none text-luna-fg-3 cursor-pointer rounded-sm transition-colors hover:text-luna-fg hover:bg-luna-base-3"
>
  <X size={16} strokeWidth={1.5} />
</button>
```

Replace with:
```tsx
<Button
  variant="icon"
  onClick={onClose}
  aria-label="Close panel"
>
  <X size={16} strokeWidth={1.5} />
</Button>
```

- [ ] **Step 3: Replace the CTA button (line ~147)**

Find:
```tsx
<button
  onClick={() => location && onResearch(location)}
  className="w-full h-10 bg-luna-cyan text-luna-base border border-luna-cyan rounded font-sans font-medium text-sm cursor-pointer inline-flex items-center justify-center gap-2 transition-colors hover:bg-luna-cyan-dim hover:border-luna-cyan-dim"
>
  Analyze this location
  <ArrowRight size={14} strokeWidth={1.75} />
</button>
```

Replace with:
```tsx
<Button
  onClick={() => location && onResearch(location)}
  className="w-full"
>
  Analyze this location
  <ArrowRight size={14} strokeWidth={1.75} />
</Button>
```

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Verify visually**

With `pnpm dev` running, open `http://localhost:3000`, click any location marker to open the panel. Confirm:
- Close button (top-right of panel) is a square icon button with hover highlight
- "Analyze this location" CTA is full-width cyan

- [ ] **Step 6: Commit**

```bash
git add components/globe/LocationPanel.tsx
git commit -m "refactor: migrate LocationPanel buttons to Button component"
```

---

## Task 4: Migrate ImageGalleryDialog.tsx

**Files:**
- Modify: `components/gallery/ImageGalleryDialog.tsx`

There are three raw `<button>` elements to replace.

- [ ] **Step 1: Add the Button import**

At the top of `components/gallery/ImageGalleryDialog.tsx`, add:

```tsx
import { Button } from '@/components/ui/button'
```

The existing imports (`X`, `cn`) stay in place.

- [ ] **Step 2: Replace the header close button (line ~92)**

Find:
```tsx
<button
  onClick={onClose}
  aria-label="Close image gallery"
  className="w-8 h-8 grid place-items-center rounded-sm text-luna-fg-3 hover:text-luna-fg hover:bg-luna-base-3 transition-colors"
>
  <X size={18} strokeWidth={1.5} />
</button>
```

Replace with:
```tsx
<Button
  variant="icon"
  onClick={onClose}
  aria-label="Close image gallery"
>
  <X size={18} strokeWidth={1.5} />
</Button>
```

- [ ] **Step 3: Replace the Skip button (line ~137)**

Find:
```tsx
<button
  onClick={onClose}
  className="h-9 px-4 rounded font-sans text-sm text-luna-fg-3 border border-luna-hairline hover:text-luna-fg hover:border-luna-hairline-2 transition-colors"
>
  Skip
</button>
```

Replace with:
```tsx
<Button variant="outline" onClick={onClose}>
  Skip
</Button>
```

- [ ] **Step 4: Replace the Continue button (line ~143)**

Find:
```tsx
<button
  onClick={() => location && onContinue(location)}
  className="h-9 px-5 rounded font-sans font-medium text-sm bg-luna-cyan text-luna-base border border-luna-cyan hover:bg-luna-cyan-dim hover:border-luna-cyan-dim transition-colors"
>
  Continue
</button>
```

Replace with:
```tsx
<Button onClick={() => location && onContinue(location)}>
  Continue
</Button>
```

- [ ] **Step 5: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Verify visually**

With `pnpm dev` running, open `http://localhost:3000`, click any location marker to open the LocationPanel, then click "Analyze this location" to open the ImageGalleryDialog. Confirm:
- Header close button is a square icon button with hover highlight
- "Skip" is an outline button (border, muted text)
- "Continue" is a cyan primary button
- Skip and Continue are both `h-10` (slightly taller than before — this is intentional)

- [ ] **Step 7: Commit**

```bash
git add components/gallery/ImageGalleryDialog.tsx
git commit -m "refactor: migrate ImageGalleryDialog buttons to Button component"
```
