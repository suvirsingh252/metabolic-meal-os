# TASK_PACKET_TEMPLATE.md

Copy this template to define a unit of work. The PM (ChatGPT) fills it out; the
filled version becomes the body of `ai/CURRENT_TASK.md`. One packet = one
vertical slice. Keep slices small.

---

## Task: <short imperative title>

- **Packet ID:** <YYYY-MM-DD-short-slug>
- **Owner (CLI):** <Claude Code | Codex | Gemini CLI | aider>
- **Created by:** <PM / who>
- **Date:** <YYYY-MM-DD>
- **Status:** Not started | In progress | Blocked | Done

### Goal
<One or two sentences. What outcome, and why. Plain language.>

### Behavior change?
- [ ] No — docs/tooling/refactor only, runtime behavior must not change.
- [ ] Yes — describe the user-visible change: <...>

### In scope
- <bullet>
- <bullet>

### Out of scope / follow-ups
- <things deliberately not done; log adjacent issues here, do not fix inline>

### Files expected to change
- `path/to/file` — why

### Constraints
- No dependency changes unless explicitly stated here: <yes/no + reason>
- No commit / no push unless the user asks.
- Secrets stay server-side; never printed or committed.
- Use existing npm commands only.

### Acceptance criteria
- [ ] <observable, checkable outcome>
- [ ] Validation gate passes: `npm run lint`, `npm run typecheck`, `npm test`,
      `npm run build` (record results).
- [ ] `npm run db:check` if DB wiring touched.
- [ ] Docs updated per HANDOFF end-of-session procedure (if applicable).

### Validation results (filled by the implementer)
- lint: <pass/fail>
- typecheck: <pass/fail>
- test: <pass/fail, N/N>
- build: <pass/fail, routes>
- db:check: <pass/fail/skipped>

### Notes / decisions
<Anything the next agent needs. Link decisions into docs/DECISIONS.md if architectural.>

### Handoff
- Next owner: <CLI or "user">
- See `ai/SESSION_HANDOFF.md` for the live handoff entry.
