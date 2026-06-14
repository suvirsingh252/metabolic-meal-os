# CURRENT_TASK.md

This file holds the **single active task packet**. Whoever is named as Owner
below owns the working tree (see `ai/AGENT_RULES.md` rule 1). When a task is
done, archive its summary into `ai/SESSION_HANDOFF.md` and replace the body here
with the next packet (or the "no active task" state).

---

## Task: Stand up Tablewise AgentOps v1

- **Packet ID:** 2026-06-13-agentops-v1
- **Owner (CLI):** Unassigned
- **Created by:** User (via PM)
- **Date:** 2026-06-13
- **Status:** Complete
- **Next Action:** Await PM prioritization

### Goal
Create a repo-local AI development workflow under `/ai` plus helper scripts so
Claude Code, Codex, Gemini CLI, and other CLI tools do not cross wires. No app
behavior changes.

### Behavior change?
- [x] No — docs/tooling/workflow only.

### In scope
- `/ai` docs: AGENT_RULES, CURRENT_TASK, TASK_PACKET_TEMPLATE, CLOSEOUT_CHECKLIST,
  CLI_ROLES, PROMPT_LIBRARY, SESSION_HANDOFF.
- `scripts/agent-status.sh`, `scripts/agent-closeout.sh` (graceful degradation).
- README + `docs/HANDOFF.md` references to the new workflow.

### Out of scope / follow-ups
- Installing any CLI (Codex, Gemini, aider, gh, Neon). Candidates only.
- Any dependency change.

### Constraints
- No dependency changes. No commit/push. Secrets stay server-side.
- Use existing npm commands only.

### Acceptance criteria
- [ ] `/ai` files exist and are internally consistent.
- [ ] Scripts run without a CLI installed and exit 0.
- [ ] README + HANDOFF reference `/ai`.
- [ ] Validation gate run (lint/typecheck/test/build) — results recorded in closeout.

### Validation results (filled by the implementer)
- See `ai/CLOSEOUT_CHECKLIST.md` for the current run.

### Handoff
- Next owner: user
- See `ai/SESSION_HANDOFF.md`.

---

## No active task

When there is no active task, leave the section above replaced with:

> **No active task.** The working tree is unowned. Create a packet from
> `ai/TASK_PACKET_TEMPLATE.md` before editing.
