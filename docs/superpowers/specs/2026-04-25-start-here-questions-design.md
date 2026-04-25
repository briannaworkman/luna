# Start Here Questions — Screen 2 Redesign

## Problem

Screen 2 (Query Composer) has two question-suggestion areas:

1. **TemplateChips** — four compact label-only chips ("Geology", "Landing suitability", "Mission history", "Naming story") directly below the textarea. Labels paste a pre-written generic sentence into the textarea.
2. **SuggestedQuestions** — a location-specific question list below a divider, styled as list rows with bullet dots and arrow icons. Currently invisible to most users because only Carroll and Integrity have `suggestedQuestions` populated; all 15 Artemis landmarks have the field undefined.

The chips are opaque (label only, no question text visible) and generic (same 4 questions for every location). The suggested questions are already the right pattern — full sentence text, location-specific — but unreachable for most locations and visually understyled.

## Solution

Replace TemplateChips with a "Start here" section that shows full question text as card buttons, styled identically to `FollowUpChips` on Screen 4.

## Approach

Option A: Reskin `SuggestedQuestions` in place. No new components.

## Files Changed

### `components/globe/locations.ts`
Add `suggestedQuestions: [string, string, string]` to all 15 Artemis landmarks. Carroll and Integrity already have theirs.

Questions per location:

| Location | Q1 | Q2 | Q3 |
|---|---|---|---|
| South Pole-Aitken Basin | What makes SPA Basin the most scientifically valuable target on the Moon? | What secrets about the Moon's interior might be exposed at SPA Basin's floor? | Which missions have explored this region and what did they discover? |
| Orientale Basin | Why does Orientale's three-ring structure matter for understanding large impacts? | What did the Artemis II crew see when they looked at Orientale for the first time? | How does Orientale compare to similar multi-ring basins on other worlds? |
| Tycho | What makes Tycho's ray system so unusually bright and long-lasting? | How young is Tycho, and what can its age tell us about the Moon's recent history? | What would a future mission to Tycho be looking for? |
| Copernicus | Why is Copernicus called the "Monarch of the Moon"? | How do Copernicus's terraced walls form and what do they reveal about the impact? | Which missions have imaged Copernicus in the most detail? |
| Clavius | What is the chain of craters inside Clavius and how did it form? | What water ice evidence exists in the Clavius region? | Why is Clavius considered one of the best candidates for a future lunar base? |
| Bailly | Why is Bailly so heavily degraded compared to younger craters? | What does Bailly's ancient eroded state tell us about the Moon's early bombardment history? | Has any mission ever made a close-up study of Bailly? |
| Petavius | What caused the dramatic rille radiating from Petavius's central peak? | How does Petavius's floor fracture compare to others on the Moon? | What minerals or volcanic features are exposed at Petavius? |
| Langrenus | What makes Langrenus one of the best-preserved complex craters on the near side? | How do the bright central peaks of Langrenus form and what do they reveal about the crust? | Which missions have captured the best imagery of Langrenus? |
| Humboldt | What makes Humboldt's floor fractures scientifically interesting? | Why is Humboldt difficult to observe from Earth and how has it been studied? | How does Humboldt's position near the eastern limb affect exploration access? |
| Janssen | How old is Janssen, and what does its heavily eroded state reveal about early lunar history? | What features have survived inside Janssen despite billions of years of bombardment? | Why is the southeastern near-side highland region scientifically underexplored? |
| Schickard | What is a "walled plain" and how does Schickard fit that description? | What do the dark floor markings in Schickard tell us about its volcanic past? | Which missions have provided the best views of Schickard? |
| Stöfler | How do geologists date a crater as ancient as Stöfler when its rim is so degraded? | What can Stöfler's overlapping impact history tell us about the Late Heavy Bombardment? | What is the highland crust made of in the Stöfler region? |
| Maginus | Why is Maginus so worn compared to nearby Tycho, even though both are in the southern highlands? | What geological processes have reshaped Maginus over billions of years? | What can comparing Maginus and Tycho teach us? |
| Longomontanus | How does Longomontanus's erosion compare to its neighbor Tycho? | What has Tycho's bright ray system deposited across Longomontanus? | Are there any notable features inside Longomontanus worth a closer look? |
| Vendelinus | What is Mare Fecunditatis and how has its lava flooding shaped the landscape around Vendelinus? | How did Vendelinus form before the nearby mare filled in around it? | Which early lunar missions observed this region? |

### `components/screen2/SuggestedQuestions.tsx`
- Remove `locationName` prop
- Change section label to `"Start here"` (monospace, `text-[11px]`, `tracking-[0.14em]`, uppercase, `text-luna-fg-4`)
- Remove bullet dot span and `ArrowRight` icon
- Change button style to full-width card: `border border-luna-hairline px-4 py-3 rounded-md font-sans text-[13px] leading-[1.55] text-luna-fg-2 hover:border-luna-fg-3 hover:text-luna-fg hover:bg-luna-base-1 transition-colors duration-[120ms] ease-out`
- Section wrapper: `flex flex-col gap-3 mt-8`
- Questions wrapper: `flex flex-col gap-2 w-full`

### `components/screen2/QueryComposer.tsx`
- Remove `TemplateChips` import and `<TemplateChips>` usage
- Remove `locationName` prop from `<SuggestedQuestions>` call

### `components/screen2/TemplateChips.tsx`
- Delete file

## What Does Not Change

- `FollowUpChips` on Screen 4 — untouched
- `handleTemplateSelect` callback in `QueryComposer` — still used by `SuggestedQuestions`, keep as-is
- Carroll and Integrity `suggestedQuestions` — already correct, no changes
