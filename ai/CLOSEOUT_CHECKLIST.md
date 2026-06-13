# CLOSEOUT_CHECKLIST.md

Run through this before declaring a session/task done. Mirrors the **Mandatory
End-of-Session Procedure** in `docs/HANDOFF.md`. Be honest — record real
results, including failures and skips.

---

## Code & scope
- [ ] Implemented only what the task packet asked for.
- [ ] No app behavior change unless the packet authorized it.
- [ ] No dependency / lockfile changes (or: explicitly authorized — note why).
- [ ] No secrets printed, pasted, or committed.
- [ ] Adjacent issues logged under "Out of scope / follow-ups", not fixed inline.

## Validation gate (record actual results)
- [ ] `npm run lint` → <pass/fail>
- [ ] `npm run typecheck` → <pass/fail>
- [ ] `npm test` → <pass/fail, N/N>
- [ ] `npm run build` → <pass/fail, route count>
- [ ] `npm run db:check` (only if DB wiring touched) → <pass/fail/skipped>

> `scripts/agent-closeout.sh` runs this gate for you and degrades gracefully if
> a step is unavailable. Paste its summary here.

## Docs (per HANDOFF end-of-session procedure)
- [ ] `docs/HANDOFF.md` updated (state, QA results).
- [ ] `docs/ROADMAP.md` updated if priorities moved.
- [ ] `docs/SESSION_LOG.md` appended.
- [ ] `docs/KNOWN_ISSUES.md` updated if needed.
- [ ] `docs/DECISIONS.md` updated if an architectural decision changed.
- [ ] New env vars / API routes / deployment changes documented.

## Handoff
- [ ] `ai/SESSION_HANDOFF.md` updated with what changed and what's next.
- [ ] `ai/CURRENT_TASK.md` status set (Done / Blocked) or replaced with next packet.
- [ ] Exact list of files changed produced.
- [ ] Commit recommendation produced (commit/push only if user asked).

---

## Current run — 2026-06-13-agentops-v1

Via `bash scripts/agent-closeout.sh`:

- lint: pass
- typecheck: pass
- test: pass, 369/369
- build: pass (route inventory unchanged)
- db:check: not requested / skipped — no DB wiring touched

Notes: AgentOps v1 is docs/tooling only; no runtime files changed, so a green
gate here just confirms the repo was not disturbed.
