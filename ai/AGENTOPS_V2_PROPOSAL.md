# AgentOps v2 — Proposal: Stop copy-pasting prompts

**Status:** Proposal / not implemented. No code changes are part of this document.
**Date:** 2026-06-13
**Objective:** Eliminate as much prompt copy/pasting as possible between ChatGPT,
Claude Code, and Codex, for the *current* Tablewise setup.

---

## TL;DR recommendation

1. **Make the repo the message bus, not the chat window.** The single biggest
   copy-paste killer is already half-built: file artifacts in `/ai`. Commit to
   "every cross-agent message is a file," and the pasted walls of text disappear.
2. **Run the implementer and the auditor from the terminal** (Claude Code today;
   Codex via **Codex CLI**, not Codex Desktop, when/if installed). Terminal
   agents read the same files and `git diff` directly — no shuttling.
3. **Demote Codex Desktop to optional fallback.** It's a separate context that
   forces copy-paste in and out. Keep it only as a "second opinion when no CLI."
4. **Defer Gemini CLI.** Real value only when context size actually bites
   (whole-repo sweeps, long-doc synthesis). Not justified for this single app yet.
5. **Plan a thin `tablewise` CLI** that *encodes the prompts* as subcommands, so
   invoking an agent becomes `tablewise <verb>` instead of pasting instructions.
   Build it as a dispatcher over existing scripts — no new dependencies.
6. **Mobile = the same thin verbs inside tmux.** Short subcommands are
   phone-friendly; file-driven flow means nothing to paste from a phone.

The throughline: **agents should be invoked, not briefed.** A stable one-line
invocation ("read `ai/CURRENT_TASK.md` and go") replaces the pasted prompt
because the briefing lives in version-controlled files.

---

## The actual problem

Today the workflow shuttles prose between three surfaces:

- **ChatGPT (browser)** plans → a human pastes the plan into the repo.
- **Claude Code (terminal)** implements → a human pastes diffs/results elsewhere.
- **Codex (Desktop)** audits → a human pastes code in and findings out.

Each arrow is a manual copy-paste, and each one is a chance to drop context,
paste a stale version, or leak a secret. The `/ai` task-packet system already
points at the fix — it just isn't yet the *only* channel.

### Insight: there are only four messages worth passing

| Message | Artifact (the interface) | Producer → Consumer |
|---------|--------------------------|---------------------|
| "Here's the work" | `ai/CURRENT_TASK.md` (task packet) | PM → implementer |
| "Here's what I built" | working tree + `ai/CLOSEOUT_CHECKLIST.md` | implementer → auditor |
| "Here's what's wrong" | `git diff` (read directly) + a findings note | auditor → implementer/PM |
| "Here's the handoff" | `ai/SESSION_HANDOFF.md` | any → next owner |

If all four are **files in the repo**, no chat content ever has to cross tools.
The auditor reads the diff itself; it is never pasted. v2 is mostly *discipline
plus a little tooling* to make these files the path of least resistance.

---

## 1. Which agents should run from the terminal

| Agent | Surface | Rationale |
|-------|---------|-----------|
| **Claude Code** | **Terminal (keep)** | Primary implementer. Already in-repo; reads/writes `/ai` and the tree directly. No change. |
| **Codex** | **Terminal via Codex CLI** (when installed) | An auditor that reads `git diff` and writes a findings file needs to live where the files are. CLI = zero copy-paste. |
| **ChatGPT (PM)** | **Browser (keep, but constrained)** | Best conversational planning surface. Constraint: its output must *land as a task-packet file*, not stay in the chat. That single commit is the only paste left — and it's small and one-directional. |
| Gemini | Terminal *if* adopted later | Read-only research lane; see §3. Defer. |

**Principle:** anything that needs to *touch repo state* (implement, audit,
hand off) runs in the terminal against the working tree. Only open-ended
*ideation* stays in a browser, and even then its deliverable is a file.

---

## 2. Should Codex Desktop remain?

**Recommendation: remove it from the critical path; keep it only as an optional
fallback.**

- **Against keeping it:** Codex Desktop is a separate context with no native view
  of the working tree or `git diff`. Using it means pasting code in and findings
  out — exactly the copy-paste v2 is trying to kill. It also can't be driven by a
  `tablewise` verb or run inside tmux on a phone.
- **For keeping it (narrow):** if Codex CLI isn't installed/affordable, Desktop is
  a usable manual second opinion for a small, self-contained snippet.
- **Net:** prefer **Codex CLI**. If Codex CLI is unavailable, route audit work to
  Claude Code (`/code-review`-style pass) rather than re-introducing Desktop into
  the loop. Document Desktop as "manual fallback only" in `ai/CLI_ROLES.md`.

> Reality check: per `ai/CLI_ROLES.md`, Codex CLI is **not installed today**. This
> proposal does not install it. It defines *where Codex belongs if/when adopted.*

---

## 3. Would Gemini CLI add value?

**Recommendation: defer. Adopt only on a concrete trigger.**

- **Where it would help:** a genuinely large context window is useful for
  whole-repo pattern sweeps ("does this appear anywhere else?"), synthesizing long
  docs (e.g. the ~150 KB `docs/SESSION_LOG.md`), or reconnaissance before a big
  refactor — as a **read-only research lane** whose output feeds the PM/implementer.
- **Why defer now:** Tablewise is a single, well-documented Next.js app. Claude
  Code and Codex comfortably hold the relevant context for current vertical
  slices. Adding a third model is a third place to keep prompts/roles in sync —
  net new coordination cost against marginal benefit.
- **Adoption trigger (write it down):** add Gemini only when you repeatedly hit
  "the context didn't fit" on real tasks. At that point it enters as a
  **read-and-advise** lane in `ai/CLI_ROLES.md`, never as a committer.

---

## 4. How a future `tablewise` CLI could orchestrate tasks

The core idea: **encode the prompts as subcommands.** Each verb bundles the
"read these files, obey AGENT_RULES, run the gate" boilerplate that humans
currently paste. Build it as a **thin dispatcher over the scripts that already
exist** — no new dependencies (the repo already has Node + `tsx` + bash).

Sketch of the surface:

```
tablewise status              # -> scripts/agent-status.sh (incl. tmux state)
tablewise gate [--db]         # -> scripts/agent-closeout.sh (lint/types/test/build)
tablewise task new <slug>     # scaffold ai/CURRENT_TASK.md from the template
tablewise task show           # print the active packet + tree owner
tablewise handoff "<note>"    # append an entry to ai/SESSION_HANDOFF.md
tablewise audit               # write a git-diff bundle for the auditor to read
tablewise implement           # launch Claude Code with a fixed, file-referencing
                              #   invocation ("read ai/CURRENT_TASK.md and go")
tablewise review              # launch the auditor (Codex CLI) pointed at the diff
```

Why this kills copy-paste:
- The **prompt becomes the verb.** `tablewise implement` always passes the same
  short, correct invocation that points the agent at the task-packet file. Nobody
  retypes or re-pastes the briefing.
- **Handoffs and audits become commands**, so the four "messages" in the table
  above are produced by tooling, consistently, every time.
- It is **the same on desktop and phone**, which makes mobile trivial (§5).

Design constraints (so the CLI doesn't become its own liability):
- **No new dependencies.** Dispatcher in bash or a `tsx` script under `scripts/`,
  wrapping the existing `agent-status.sh` / `agent-closeout.sh` and npm scripts.
- **Deterministic, non-magical.** It scaffolds files and launches agents; it does
  **not** auto-commit, auto-deploy, or auto-migrate. Those stay human-gated per
  `ai/AGENT_RULES.md`.
- **Degrade gracefully.** If Codex CLI/Gemini aren't installed, `tablewise review`
  says so and suggests the Claude Code fallback — same pattern as the scripts.
- Ship incrementally: the first three verbs (`status`, `gate`, `task`) are just
  aliases over things that already work.

---

## 5. How mobile workflows should work via Termius

Mobile is where copy-paste hurts most (no good multi-app paste, tiny keyboard),
so v2's file-driven model pays off hardest here.

- **Keep tmux as the spine** (already established in `ai/MOBILE_WORKFLOW.md`):
  always work inside `tmux`, detach with `Ctrl-b d`, reattach to read results.
- **Replace pasted prompts with verbs.** On a phone you type `tablewise status`,
  `tablewise gate`, `tablewise implement` — a handful of characters — instead of
  pasting a prompt you can't easily copy on iOS. This is the single biggest
  mobile win.
- **Everything is resumable.** Start `tablewise gate` (or an agent session),
  detach, lock the phone, reattach for the summary. No long-lived foreground
  prompt to babysit.
- **Same do-not list applies** (`ai/MOBILE_WORKFLOW.md`): no commits/pushes,
  migrations, deploys, or secret edits from a phone. `tablewise` should refuse
  those verbs entirely on mobile or gate them behind an explicit desktop flag.

Until `tablewise` exists, the interim mobile pattern is already low-paste: run
`bash scripts/agent-status.sh` and `bash scripts/agent-closeout.sh` in tmux, and
invoke agents with the short, file-referencing prompts from `ai/PROMPT_LIBRARY.md`.

---

## 6. Tradeoffs, risks, and migration plan

### Tradeoffs
- **File-as-interface vs. chat fluency.** Files are versioned, auditable, and
  paste-free, but lose the conversational back-and-forth of a chat. Mitigation:
  keep ChatGPT for ideation; require only that its *output* lands as a file.
- **A `tablewise` CLI vs. maintenance burden.** It removes paste toil but is
  code to own. Mitigation: keep it a thin, dependency-free dispatcher over
  existing scripts; grow it one verb at a time.
- **Fewer tools vs. fewer perspectives.** Dropping Codex Desktop / deferring
  Gemini trims redundant viewpoints. Mitigation: Claude Code can run the audit
  pass; re-add a lane only on a concrete trigger.

### Risks
- **Stale or contended task files.** Two agents editing the tree at once.
  *Mitigated* by the existing one-owner rule (`ai/AGENT_RULES.md` rule 1) and
  explicit `ai/SESSION_HANDOFF.md` entries — v2 leans harder on these.
- **Tooling scope creep.** `tablewise` quietly grows into a framework. *Mitigate*
  with a hard "dispatcher only, no deps, no auto-commit/deploy/migrate" charter.
- **Dependence on un-installed CLIs.** Codex CLI / Gemini may not be present or
  affordable. *Mitigate* with graceful degradation and Claude-Code fallbacks; the
  workflow must never *require* an optional CLI.
- **Secret leakage via pasted context** — the very thing we're reducing. Fewer
  pastes is itself a security win; reinforce with AGENT_RULES rule 4.

### Migration plan (incremental, reversible)

- **Phase 0 — Discipline (now, zero code):** declare files the only cross-agent
  channel. ChatGPT plans → packet committed to `ai/CURRENT_TASK.md`; audits read
  `git diff`, never pasted code; every handoff is a `SESSION_HANDOFF.md` entry.
- **Phase 1 — Stable invocations:** standardize the short, file-referencing
  prompts in `ai/PROMPT_LIBRARY.md` so each agent is launched the same way every
  time. Mark Codex Desktop as fallback-only in `ai/CLI_ROLES.md`.
- **Phase 2 — `tablewise` dispatcher (thin):** ship `status`, `gate`, `task`,
  `handoff` as a dependency-free wrapper over existing scripts. Wire mobile verbs.
- **Phase 3 — Agent launch verbs:** add `implement` / `review` to launch Claude
  Code and (if installed) Codex CLI with canned, file-pointing invocations.
- **Phase 4 — Optional lanes on trigger:** adopt Codex CLI as the standing auditor
  and/or Gemini as a read-only research lane *only* when a concrete need appears.

Each phase is independently useful and reversible; none requires the next.

---

## What this proposal deliberately does not do
- No code, scripts, or dependency changes (design only).
- Does not install Codex CLI, Gemini CLI, or any tool.
- Does not change app behavior or the validation gate.
- Leaves v1/v1.1 (`/ai` docs, `scripts/agent-*.sh`, mobile workflow) intact; v2
  builds on them.
