# LUNA App — UI kit

A click-thru prototype of the LUNA desktop research console. One window, one session, one co-pilot.

## Structure

- `index.html` — the interactive shell. Renders the full app: top bar, agent rail, conversation, data dock.
- `AppShell.jsx` — top bar + sidebar + main layout
- `AgentRail.jsx` — left rail of specialist agents with status dots
- `Conversation.jsx` — the central stream (user prompts, agent handoffs, synthesised answer)
- `Composer.jsx` — bottom prompt bar with agent chips and kbd hint
- `DataDock.jsx` — right drawer for source data, citations, map preview
- `Primitives.jsx` — `<Button>`, `<Badge>`, `<Input>`, `<Eyebrow>` — shadcn-flavoured, LUNA-tinted

Open `index.html` directly. The interactions are fake but complete: pick an agent, run a query, watch the stream, open a citation.
