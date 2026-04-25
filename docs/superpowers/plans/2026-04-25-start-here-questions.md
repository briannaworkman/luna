# Start Here Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic TemplateChips on Screen 2 with a location-specific "Start here" section styled like the FollowUpChips on Screen 4.

**Architecture:** Add `suggestedQuestions` arrays to all 15 Artemis landmark locations in `locations.ts`. Reskin the existing `SuggestedQuestions` component to match `FollowUpChips` — full-width card buttons, "Start here" label, no icons. Remove `TemplateChips` and its usage in `QueryComposer`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-04-25-start-here-questions-design.md`

---

### Task 1: Write a failing test for suggestedQuestions coverage

**Files:**
- Create: `components/globe/locations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/globe/locations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { LOCATIONS } from './locations'

describe('LOCATIONS', () => {
  it('every location has exactly 3 suggestedQuestions', () => {
    for (const loc of LOCATIONS) {
      expect(
        loc.suggestedQuestions,
        `${loc.name} is missing suggestedQuestions`,
      ).toBeDefined()
      expect(
        loc.suggestedQuestions!.length,
        `${loc.name} should have 3 suggestedQuestions`,
      ).toBe(3)
      for (const q of loc.suggestedQuestions!) {
        expect(
          typeof q === 'string' && q.trim().length > 0,
          `${loc.name} has a blank or non-string question`,
        ).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run components/globe/locations.test.ts
```

Expected: FAIL — `South Pole-Aitken Basin is missing suggestedQuestions` (or similar for the first landmark without data).

---

### Task 2: Add suggestedQuestions to all 15 Artemis landmarks

**Files:**
- Modify: `components/globe/locations.ts`

- [ ] **Step 1: Add suggestedQuestions to South Pole-Aitken Basin**

In `components/globe/locations.ts`, add to the `spa` location object (after `region: 'FAR SIDE'`):

```ts
    suggestedQuestions: [
      'What makes SPA Basin the most scientifically valuable target on the Moon?',
      "What secrets about the Moon's interior might be exposed at SPA Basin's floor?",
      'Which missions have explored this region and what did they discover?',
    ],
```

- [ ] **Step 2: Add suggestedQuestions to Orientale Basin**

Add to the `orientale` location object:

```ts
    suggestedQuestions: [
      "Why does Orientale's three-ring structure matter for understanding large impacts?",
      'What did the Artemis II crew see when they looked at Orientale for the first time?',
      'How does Orientale compare to similar multi-ring basins on other worlds?',
    ],
```

- [ ] **Step 3: Add suggestedQuestions to Tycho**

Add to the `tycho` location object:

```ts
    suggestedQuestions: [
      "What makes Tycho's ray system so unusually bright and long-lasting?",
      "How young is Tycho, and what can its age tell us about the Moon's recent history?",
      'What would a future mission to Tycho be looking for?',
    ],
```

- [ ] **Step 4: Add suggestedQuestions to Copernicus**

Add to the `copernicus` location object:

```ts
    suggestedQuestions: [
      'Why is Copernicus called the "Monarch of the Moon"?',
      "How do Copernicus's terraced walls form and what do they reveal about the impact?",
      'Which missions have imaged Copernicus in the most detail?',
    ],
```

- [ ] **Step 5: Add suggestedQuestions to Clavius**

Add to the `clavius` location object:

```ts
    suggestedQuestions: [
      'What is the chain of craters inside Clavius and how did it form?',
      'What water ice evidence exists in the Clavius region?',
      'Why is Clavius considered one of the best candidates for a future lunar base?',
    ],
```

- [ ] **Step 6: Add suggestedQuestions to Bailly**

Add to the `bailly` location object:

```ts
    suggestedQuestions: [
      'Why is Bailly so heavily degraded compared to younger craters?',
      "What does Bailly's ancient eroded state tell us about the Moon's early bombardment history?",
      'Has any mission ever made a close-up study of Bailly?',
    ],
```

- [ ] **Step 7: Add suggestedQuestions to Petavius**

Add to the `petavius` location object:

```ts
    suggestedQuestions: [
      "What caused the dramatic rille radiating from Petavius's central peak?",
      "How does Petavius's floor fracture compare to others on the Moon?",
      'What minerals or volcanic features are exposed at Petavius?',
    ],
```

- [ ] **Step 8: Add suggestedQuestions to Langrenus**

Add to the `langrenus` location object:

```ts
    suggestedQuestions: [
      'What makes Langrenus one of the best-preserved complex craters on the near side?',
      'How do the bright central peaks of Langrenus form and what do they reveal about the crust?',
      'Which missions have captured the best imagery of Langrenus?',
    ],
```

- [ ] **Step 9: Add suggestedQuestions to Humboldt**

Add to the `humboldt` location object:

```ts
    suggestedQuestions: [
      "What makes Humboldt's floor fractures scientifically interesting?",
      'Why is Humboldt difficult to observe from Earth and how has it been studied?',
      "How does Humboldt's position near the eastern limb affect exploration access?",
    ],
```

- [ ] **Step 10: Add suggestedQuestions to Janssen**

Add to the `janssen` location object:

```ts
    suggestedQuestions: [
      'How old is Janssen, and what does its heavily eroded state reveal about early lunar history?',
      'What features have survived inside Janssen despite billions of years of bombardment?',
      'Why is the southeastern near-side highland region scientifically underexplored?',
    ],
```

- [ ] **Step 11: Add suggestedQuestions to Schickard**

Add to the `schickard` location object:

```ts
    suggestedQuestions: [
      'What is a "walled plain" and how does Schickard fit that description?',
      'What do the dark floor markings in Schickard tell us about its volcanic past?',
      'Which missions have provided the best views of Schickard?',
    ],
```

- [ ] **Step 12: Add suggestedQuestions to Stöfler**

Add to the `stofler` location object:

```ts
    suggestedQuestions: [
      "How do geologists date a crater as ancient as Stöfler when its rim is so degraded?",
      "What can Stöfler's overlapping impact history tell us about the Late Heavy Bombardment?",
      'What is the highland crust made of in the Stöfler region?',
    ],
```

- [ ] **Step 13: Add suggestedQuestions to Maginus**

Add to the `maginus` location object:

```ts
    suggestedQuestions: [
      'Why is Maginus so worn compared to nearby Tycho, even though both are in the southern highlands?',
      'What geological processes have reshaped Maginus over billions of years?',
      'What can comparing Maginus and Tycho teach us?',
    ],
```

- [ ] **Step 14: Add suggestedQuestions to Longomontanus**

Add to the `longomontanus` location object:

```ts
    suggestedQuestions: [
      "How does Longomontanus's erosion compare to its neighbor Tycho?",
      "What has Tycho's bright ray system deposited across Longomontanus?",
      'Are there any notable features inside Longomontanus worth a closer look?',
    ],
```

- [ ] **Step 15: Add suggestedQuestions to Vendelinus**

Add to the `vendelinus` location object:

```ts
    suggestedQuestions: [
      'What is Mare Fecunditatis and how has its lava flooding shaped the landscape around Vendelinus?',
      'How did Vendelinus form before the nearby mare filled in around it?',
      'Which early lunar missions observed this region?',
    ],
```

- [ ] **Step 16: Run the test to confirm it passes**

```bash
npx vitest run components/globe/locations.test.ts
```

Expected: PASS — 1 test, 0 failures.

- [ ] **Step 17: Commit**

```bash
git add components/globe/locations.ts components/globe/locations.test.ts
git commit -m "feat: add suggestedQuestions to all 17 lunar locations"
```

---

### Task 3: Reskin SuggestedQuestions component

**Files:**
- Modify: `components/screen2/SuggestedQuestions.tsx`

- [ ] **Step 1: Replace the component**

Overwrite `components/screen2/SuggestedQuestions.tsx` with:

```tsx
interface SuggestedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null

  return (
    <section aria-label="Start here" className="flex flex-col gap-3 mt-8">
      <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
        Start here
      </div>
      <div className="flex flex-col gap-2 w-full">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className={[
              'w-full text-left px-4 py-3 rounded-md',
              'bg-transparent border border-luna-hairline',
              'font-sans text-[13px] leading-[1.55] text-luna-fg-2',
              'hover:border-luna-fg-3 hover:text-luna-fg hover:bg-luna-base-1',
              'transition-colors duration-[120ms] ease-out',
              'cursor-pointer',
            ].join(' ')}
          >
            {question}
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
npx vitest run
```

Expected: all existing tests pass (the component has no unit tests — TypeScript will catch prop errors in the next task).

- [ ] **Step 3: Commit**

```bash
git add components/screen2/SuggestedQuestions.tsx
git commit -m "feat: reskin SuggestedQuestions as Start Here card list"
```

---

### Task 4: Remove TemplateChips from QueryComposer and delete the file

**Files:**
- Modify: `components/screen2/QueryComposer.tsx`
- Delete: `components/screen2/TemplateChips.tsx`

- [ ] **Step 1: Update QueryComposer**

In `components/screen2/QueryComposer.tsx`:

1. Remove this import line:
```ts
import { TemplateChips } from './TemplateChips'
```

2. Remove this JSX line (around line 117):
```tsx
            <TemplateChips onSelect={handleTemplateSelect} />
```

3. Update the `<SuggestedQuestions>` call (around line 138–142) — remove the `locationName` prop:

Before:
```tsx
          <SuggestedQuestions
            locationName={location.name}
            questions={location.suggestedQuestions ?? []}
            onSelect={handleTemplateSelect}
          />
```

After:
```tsx
          <SuggestedQuestions
            questions={location.suggestedQuestions ?? []}
            onSelect={handleTemplateSelect}
          />
```

- [ ] **Step 2: Delete TemplateChips.tsx**

```bash
rm components/screen2/TemplateChips.tsx
```

- [ ] **Step 3: Run typecheck to confirm no dangling references**

```bash
npm run typecheck
```

Expected: no errors. If typecheck is not configured, run:

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/screen2/QueryComposer.tsx
git rm components/screen2/TemplateChips.tsx
git commit -m "feat: remove TemplateChips, wire SuggestedQuestions as Start Here"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to Screen 2 for a non-proposed location**

Open `http://localhost:3000`, click any of the 15 Artemis landmark dots (e.g. Tycho), skip or dismiss the gallery, and arrive at the Query Composer.

Expected:
- No chip buttons visible below the textarea
- A "START HERE" section label appears below the bottom button row
- Three full-sentence question buttons appear as full-width cards with `border-luna-hairline` borders
- Hovering a card lifts the border and text color
- Clicking a card populates the textarea with that question

- [ ] **Step 3: Verify Carroll and Integrity still work**

Click Carroll or Integrity on the globe. Confirm the "Start here" section shows their existing 3 questions.

- [ ] **Step 4: Verify the textarea still accepts the question text on click**

Click one of the Start Here cards. Confirm the question text appears in the textarea and the cursor is positioned at the end.
