# PROMPT_LIBRARY.md

Reusable, copy-paste prompts for each tool in the Tablewise workflow. They bake
in the rules from `ai/AGENT_RULES.md` so you don't have to re-explain them every
session. Fill the `<...>` placeholders.

All prompts assume: no app behavior change unless stated, no dependency changes,
no commit/push unless asked, secrets stay server-side, validation gate is
`npm run lint && npm run typecheck && npm test && npm run build`.

---

## 1. ChatGPT — PM / orchestrator

> You are the PM for the Tablewise repo. Read `ai/CLI_ROLES.md` and
> `ai/AGENT_RULES.md` (pasted below). Break this goal into the smallest safe
> vertical slices, and for the first slice produce a filled
> `ai/TASK_PACKET_TEMPLATE.md`. Pick the owner CLI per CLI_ROLES, but remember
> only Claude Code and npm are installed — route everything else to Claude Code
> unless I say otherwise. Do not write code. Goal: <goal>.

## 2. Claude Code — primary implementer

> You own the Tablewise working tree. Read `ai/CURRENT_TASK.md`,
> `ai/AGENT_RULES.md`, and the HANDOFF docs first. Implement the active task
> packet as a single vertical slice. Do not change app behavior beyond the
> packet, do not add dependencies, do not commit. Run the full validation gate
> and report real results. When done, fill `ai/CLOSEOUT_CHECKLIST.md`, update
> `ai/SESSION_HANDOFF.md` and the relevant `docs/`, and end with the exact list
> of files changed plus a commit recommendation.

## 3. Codex — auditor / focused fixer *(candidate; confirm installed first)*

Audit mode:
> Read-only audit. Do not edit the tree (you are not the owner). Review the diff
> for <packet ID> against `ai/AGENT_RULES.md` and the acceptance criteria in
> `ai/CURRENT_TASK.md`. Report: correctness bugs, scope creep, behavior changes,
> secret leaks, missing tests. Output a prioritized list only.

Focused-fix mode (only after handoff):
> You now own the tree per `ai/SESSION_HANDOFF.md`. Apply exactly this fix:
> <fix>. Touch only <files>. Run the validation gate. Hand the tree back.

## 4. Gemini CLI — research / large-context review *(candidate)*

> Read-and-advise only; do not edit. Using the full repo context, answer:
> <research question, e.g. "where else does pattern X appear / is this safe to
> change globally">. Cite file paths and line numbers. Output findings for the
> PM and Claude Code to act on. Do not commit.

## 5. aider — surgical diff *(candidate)*

> Make exactly this mechanical change: <change>. Restrict edits to: <named
> files>. Do not touch anything else, do not add dependencies. Produce the diff.
> I will run the validation gate.

## 6. Deterministic CLIs (gh / vercel / drizzle)

gh (only if installed and asked):
> Using `gh`, <open PR / check CI / view issue>. Do not modify code. Show the
> command and output.

vercel (only if installed):
> Inspect only: `vercel <env ls / inspect>`. Do not deploy unless I explicitly
> say "deploy". Prefer the `vercel:*` skills.

drizzle (npm scripts only):
> Generate/apply a migration using `npm run db:generate` / `npm run db:migrate`.
> Never run drizzle-kit directly against production. Show the generated SQL
> before applying.

---

## House style reminders (all tools)
- Match surrounding code: comment density, naming, idioms.
- Vertical slices, low MVP complexity, no premature optimization.
- Reference files as `path:line`.
- Record validation results truthfully — failures and skips included.
