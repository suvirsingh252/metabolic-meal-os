# CLI_ROLES.md — Who does what

Tablewise AgentOps coordinates several AI/CLI tools. Each has a lane. Staying in
lane is what keeps tools from cross-wiring. Read this with `ai/AGENT_RULES.md`.

> **Important (2026-06-13):** No extra CLIs are installed in this project yet.
> Everything below except Claude Code and npm is a **candidate tool**. Document
> and plan around them; do not assume they exist; do not install them.

---

## Installed-status table

| Tool | Role | Installed? | How to confirm | If missing |
|------|------|-----------|----------------|-----------|
| **Claude Code** | Primary implementer | ✅ In use | you are reading this in it | — |
| **npm** scripts | Validation gate, DB check | ✅ Yes | `npm run` | — |
| **ChatGPT (web)** | PM / orchestrator | ✅ (browser, not a CLI) | n/a | — |
| **Codex CLI** | Auditor / focused fixer | ❌ Not installed | `command -v codex` | candidate only; do not install |
| **Gemini CLI** | Research / large-context review | ❌ Not installed | `command -v gemini` | candidate only; do not install |
| **aider** | Surgical diff tool | ❌ Not installed | `command -v aider` | candidate only; do not install |
| **gh** (GitHub CLI) | Deterministic git/PR ops | Optional — detected by scripts when available | `command -v gh` | treat as optional; do not assume or install |
| **vercel** CLI | Deploy / env (read) | Optional — detected by scripts when available | `command -v vercel` | treat as optional; do not assume or install |
| **drizzle-kit** | Migrations (via npm scripts) | ✅ Dev dep | `npm run db:migrate` exists | use npm scripts only |
| **Neon CLI** | Postgres admin | ❌ Not installed | `command -v neonctl` | candidate only; do not install |

`scripts/agent-status.sh` probes these and prints live status. Trust the script
over this table if they disagree — update the table when they drift.

---

## Roles in detail

### ChatGPT — PM / Orchestrator
- Lives in the browser, not the repo. Owns intent, scope, and sequencing.
- Produces task packets from `ai/TASK_PACKET_TEMPLATE.md` and drops them into
  `ai/CURRENT_TASK.md`.
- Does **not** write to the repo directly. Decides which CLI gets which slice.
- Good for: breaking a goal into vertical slices, writing acceptance criteria,
  reconciling conflicting agent output.

### Claude Code — Primary implementer
- Default owner of the working tree. Does the bulk of feature/bugfix work.
- Reads the task packet, implements the vertical slice, runs the full validation
  gate, updates docs, fills the closeout checklist.
- Has broad tool access (edit, bash, search, MCP). Most multi-step work lands here.

### Codex — Auditor / focused fixer *(candidate)*
- Narrow lane: review a diff Claude produced, or apply one tightly-scoped fix.
- Use when you want a second pair of eyes that did not write the original code.
- Must take ownership via handoff before editing; otherwise advisory only.

### Gemini CLI — Research / large-context reviewer *(candidate)*
- Best for whole-repo reads, long-document synthesis, "does this pattern appear
  anywhere else" sweeps that benefit from a large context window.
- Read-and-advise by default. Output feeds back to the PM or to Claude as input;
  it should not be the thing that commits code.

### aider — Surgical diff tool *(candidate)*
- For a single, well-specified, mechanical change across known files (rename,
  signature change, repetitive edit) where a precise diff is the deliverable.
- Always scoped to named files from the task packet. Not for exploration.

### gh / vercel / drizzle — Deterministic CLIs
- Use for reproducible, side-effecting operations, not for "thinking."
- `gh`: PRs, issues, CI status — only if installed and the user asks.
- `vercel`: deploy/env inspection — only if installed; prefer `vercel:*` skills.
- `drizzle`: migrations **via npm scripts only** (`db:generate`, `db:migrate`),
  never ad-hoc against prod.

---

## Conflict rules

1. Only the owner named in `ai/CURRENT_TASK.md` edits the tree.
2. A candidate tool that is not installed is simply not an option this session —
   route the work to Claude Code instead. Do not install it to unblock yourself.
3. If two tools disagree, the PM (ChatGPT) arbitrates; the decision is recorded
   in `ai/CURRENT_TASK.md`.
