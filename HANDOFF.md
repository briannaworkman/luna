# LUNA Foundation Handoff

## What exists

### Project
- Next.js 14 App Router, TypeScript strict mode, Tailwind CSS
- Location: `luna/` in the workdir

### Key files
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — `<html className="dark">` enforces dark mode globally |
| `app/page.tsx` | Clean bare default export — ready for content |
| `app/globals.css` | Tailwind directives + shadcn CSS variables (`:root` and `.dark`) |
| `tailwind.config.ts` | `darkMode: "class"`, full shadcn theme (colors, radius, keyframes) |
| `tsconfig.json` | `strict: true` enabled |
| `components.json` | shadcn/ui config — style: new-york, baseColor: slate, cssVariables: true |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |

### Installed packages
- `tailwindcss-animate` — required by shadcn/ui animations
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn/ui core deps
- `lucide-react` — icon library used by shadcn/ui components

## Conventions every agent must follow

### Dark mode
The `<html>` element has `className="dark"` in `app/layout.tsx`. Do **not** remove it. All UI is dark-only. Never add `prefers-color-scheme` media queries.

### Colors
Use shadcn semantic tokens, never raw hex or Tailwind palette colors:
- `bg-background`, `text-foreground`, `border-border`
- `bg-primary`, `text-primary-foreground`, etc.
See `globals.css` for the full token list.

### Components
Add shadcn/ui components via `npx shadcn@2 add <component>` from the `luna/` directory. Components land in `components/ui/`.

### Utilities
Use `cn()` from `@/lib/utils` for all className merging. Never use `clsx` or `twMerge` directly.

### Border radius
Radius tokens come from CSS variable `--radius` (0.3rem — New York style). Use `rounded-lg`, `rounded-md`, `rounded-sm` — do not hardcode radius values.

### Path alias
`@/` maps to the project root (`luna/`). Use it for all internal imports.

### No Pages Router
App Router only. Never create files under `pages/`.
