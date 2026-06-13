# AGENT_RULES.md — Tablewise AgentOps v1

These are the binding rules for any AI CLI or agent working in this repository
(Claude Code, Codex, Gemini CLI, aider, ChatGPT-driven sessions, etc.). They
exist so that multiple tools do not cross wires, clobber each other's work, or
silently change app behavior.

If a rule here conflicts with a tool's default behavior, **this file wins.**

---

## 0. Read before doing

Before writing any code, every agent must read, in order:

1. `ai/CURRENT_TASK.md` — what is actually being worked on right now.
2. `ai/CLI_ROLES.md` — which tool is allowed to do what.
3. `docs/HANDOFF.md` — engineering state, start/end-of-session procedures.
4. `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/DECISIONS.md` — context.

Do not begin coding until the current state is understood. This mirrors the
existing **Mandatory Start-of-Session Procedure** in `docs/HANDOFF.md`.

---

## 1. One owner per task

- Exactly one agent "owns" the working tree at a time. The owner is named at the
  top of `ai/CURRENT_TASK.md`.
- If you are not the owner, you may **read and advise** but must not edit files,
  unless the task packet explicitly delegates a scoped sub-task to you.
- Hand off ownership explicitly via `ai/SESSION_HANDOFF.md`, never implicitly.

## 2. Do not change app behavior unless the task says so

- Documentation, tooling, and workflow changes (`/ai`, `scripts/`, `docs/`,
  `README.md`) must not alter runtime behavior.
- Behavior-changing work must reference a task packet and be a vertical slice,
  consistent with `docs/HANDOFF.md` → Development Standards.

## 3. No dependency or install changes without explicit approval

- Do not run `npm install <pkg>`, add to `package.json`, or change lockfiles
  unless the task packet explicitly authorizes it and explains why.
- Do not install global CLIs. Treat Codex, Gemini CLI, aider, `gh`, `vercel`,
  and Neon CLI as **candidate tools that may not be installed.** See
  `ai/CLI_ROLES.md`.

## 4. Secrets stay server-side and out of the agent log

- Never print, paste, or commit the contents of `.env.local`,
  `.env.vercel.*.local`, or any key.
- Never expose OpenAI or Notion keys (matches Development Standards in HANDOFF).
- Do not exfiltrate secrets to an external tool, paste buffer, or web request.

## 5. The validation gate is fixed

Every code change must pass, in this order, before it is considered done:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Optionally `npm run db:check` when DB wiring is touched (read-only check).

Use **only existing project commands.** Do not invent new scripts to pass the
gate. Record actual results (pass/fail + counts) — never claim a step passed
that you did not run. This matches the QA discipline already in `docs/HANDOFF.md`.

## 6. Do not commit unless told

- Default mode is **work-in-tree, do not commit, do not push.**
- When the user asks for a commit, follow repo convention: branch off `main`
  first if on `main`, keep commits scoped, and propose the message rather than
  pushing.
- Never run destructive git operations (`reset --hard`, force-push, branch
  deletion) without explicit instruction.

## 7. Stay in scope

- Implement the task packet, nothing more. If you find adjacent issues, record
  them in `ai/CURRENT_TASK.md` under "Out of scope / follow-ups" — do not fix
  them inline.
- Large refactors require a documentation update first (HANDOFF / DECISIONS).

## 8. Close out honestly

At the end of a working session, complete `ai/CLOSEOUT_CHECKLIST.md` and update
`ai/SESSION_HANDOFF.md`. Update the relevant `docs/` files per the **Mandatory
End-of-Session Procedure** in `docs/HANDOFF.md`. End with the exact list of files
changed and a commit recommendation.

## 9. Graceful degradation

Any script under `scripts/` that an agent relies on must not hard-fail when an
optional CLI is missing. Detect, warn, skip, and keep going. See
`scripts/agent-status.sh` and `scripts/agent-closeout.sh`.

---

## Quick reference

| Rule | TL;DR |
|------|-------|
| 0 | Read CURRENT_TASK + CLI_ROLES + HANDOFF first |
| 1 | One owner per task; hand off explicitly |
| 2 | No app behavior change unless tasked |
| 3 | No deps/installs without approval |
| 4 | Secrets never printed or committed |
| 5 | lint → typecheck → test → build, real results only |
| 6 | Do not commit/push unless asked |
| 7 | Stay in scope; log follow-ups |
| 8 | Closeout + handoff + docs update |
| 9 | Scripts degrade gracefully |
