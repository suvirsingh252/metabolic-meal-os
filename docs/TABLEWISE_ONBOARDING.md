# Tablewise — 30-Minute Onboarding

*Welcome. This guide gets a brand-new contributor from "never seen this repo" to
"ready to take a real task" in about 30 minutes. It does not introduce any new
process — it just walks you through the existing one in
`docs/TABLEWISE_OPERATOR_MANUAL.md` and the `/ai` workflow.*

> ### 🎯 The one thing to internalize
> **Work lives in files, not in your head.** Everything you need is written down
> in `/ai` and `/docs`. Your job is to find the right file and follow it. You are
> never expected to remember the system.

**Time budget**

| Block | Minutes | What you do |
|-------|---------|-------------|
| Day-1 setup | 0–10 | Get connected, get oriented, read the core files. |
| First task walkthrough | 10–22 | Run a real, safe, read-only task end to end. |
| Recover from mistakes | 22–27 | Learn the safety nets before you need them. |
| How to ask for help | 27–30 | Know exactly who/what to ask and how. |

---

## Block 1 — Day 1 setup (0–10 min)

> ### ☑️ SETUP CHECKLIST
> 1. **Open a terminal on the Mac Mini** (or connect from your phone with
>    Termius — see `docs/TABLEWISE_MOBILE_CARD.md`).
> 2. **Go to the project:**
>    ```bash
>    cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"
>    ```
> 3. **Orient yourself (read-only, totally safe):**
>    ```bash
>    bash scripts/agent-status.sh
>    ```
>    This shows which tools are installed, which checks are available, and the
>    current active task. Read its output.
> 4. **Read these four files, in order** (10 minutes, skim is fine):
>    - `docs/TABLEWISE_OPERATOR_MANUAL.md` — the playbook (skim §1–§4, §11, §14).
>    - `ai/AGENT_RULES.md` — the rules everyone follows.
>    - `ai/CLI_ROLES.md` — who does what; what's installed.
>    - `ai/CURRENT_TASK.md` — the one job in flight right now (may be empty).

> ### 💡 What you should understand after Block 1
> - Tablewise is a household meal app; you are operating its **development**.
> - There is a small "team": Suvir (boss), ChatGPT (planner), Claude Code
>   (builder), Codex (optional checker, not installed).
> - There is exactly **one active task at a time**, and it lives in a file.
> - The default for commit/push/deploy is **don't** — those need Suvir's say-so.

---

## Block 2 — First task walkthrough (10–22 min)

Your first task is deliberately **safe and read-only**: orient, run the checks,
and read a diff. You will not change anything.

> ### ☑️ FIRST TASK: "Observe a healthy repo"
> 1. **Confirm where you are:**
>    ```bash
>    git status --short
>    ```
>    Empty output = clean tree. Lines = pending work (read it, don't touch it).
> 2. **Run the validation gate** (this is what "green" means):
>    ```bash
>    bash scripts/agent-closeout.sh
>    ```
>    Watch it run lint → typecheck → test → build. A healthy repo ends with
>    *"all executed steps passed."* This is exactly what you'll check after any
>    real change.
> 3. **Read some history:**
>    ```bash
>    git log --oneline -n 20
>    ```
>    Notice the commit style (e.g. `docs: ...`, `feat: ...`, `chore: ...`).
> 4. **Read the last handoff:** open the top entry of `ai/SESSION_HANDOFF.md`.
>    This is how every session tells the next one what happened.

### Now walk the *shape* of a real task (no editing yet)

This is the loop you'll run for actual work later. Read it; don't do it now.

```
  1. ChatGPT turns an idea into a TASK PACKET   (ai/TASK_PACKET_TEMPLATE.md)
  2. The packet goes into ai/CURRENT_TASK.md    (you become the owner)
  3. Claude Code builds the slice
  4. Run the gate:  bash scripts/agent-closeout.sh   (must be green)
  5. Fill ai/CLOSEOUT_CHECKLIST.md + write ai/SESSION_HANDOFF.md
  6. Suvir decides: commit / push / deploy / stop
```

> ### ✅ DO THIS on your first real task
> - Pick the **smallest possible slice**. One file, one fix.
> - Keep the gate green at every step.
> - Write down what you did in the handoff before you walk away.
>
> ### 🚫 DO NOT DO THIS
> - Don't commit, push, or deploy unless Suvir asks.
> - Don't install anything to "unblock" yourself.
> - Don't run two tasks at once.

---

## Block 3 — How to recover from mistakes (22–27 min)

Mistakes are expected and recoverable. Learn the nets now, while it's calm.

> ### 🆘 "I changed a file and want to undo it (not committed)"
> ```bash
> git status --short            # see what changed
> git diff                      # read your change
> git checkout -- <path/to/file>  # discard YOUR un-committed change to that file
> ```
> Only discard if you're sure — this throws the edit away.

> ### 🆘 "The checks are failing"
> 1. Don't commit, don't push.
> 2. `git status --short` and `git diff` to see what's in play.
> 3. Fix, then re-run `bash scripts/agent-closeout.sh`.
> 4. Still stuck? Note it in `ai/SESSION_HANDOFF.md` and ask Suvir.

> ### 🆘 "My phone disconnected"
> Nothing is lost — your work runs in tmux on the Mac Mini.
> Reopen Termius → `tmux attach -t tablewise`.

> ### 🆘 "I might have exposed a secret/key"
> Don't commit or paste it anywhere. Tell Suvir immediately (keys may need
> rotating). See `docs/HANDOFF.md`.

> ### 🧭 The universal recovery move
> When in doubt: **stop**. Run `bash scripts/agent-status.sh`, read
> `ai/CURRENT_TASK.md`, find the matching section in the manual, or ask Suvir.
> **Stopping is always safe.** You will never be in trouble for stopping.

---

## Block 4 — How to ask for help (27–30 min)

You have three kinds of "help," and picking the right one saves everyone time.

| If you need... | Ask... | How |
|----------------|--------|-----|
| A decision (commit? deploy? priorities?) | **Suvir** | Plain question. Only a human makes these calls. |
| A plan / "break this idea into a task" | **ChatGPT** | "Break this into the smallest safe slice and fill the Tablewise task packet." |
| The work done / a fix built | **Claude Code** | "Read `ai/CURRENT_TASK.md` and the rules, then build it." (Prompts: `ai/PROMPT_LIBRARY.md`.) |
| To know what's true about the repo | **The scripts/files** | `bash scripts/agent-status.sh`, `git status --short`, the `/ai` docs. |

> ### ✅ Good help requests
> - "The gate fails on typecheck after my change to `X` — here's the error. What
>   should I check?"
> - "Is this change ready to commit, or should I leave it in the tree?"
>
> ### 🚫 Avoid
> - "It's broken." (Say *what* you ran and *what* you saw.)
> - Guessing and pushing forward when unsure. Ask instead.

---

## ✅ Success criteria — you're onboarded when you can:

> ### 🎓 ONBOARDING COMPLETE CHECKLIST
> - [ ] Get to the project folder and run `bash scripts/agent-status.sh`.
> - [ ] Explain, in one sentence, the rule "work lives in files, not in my head."
> - [ ] Name the cast and each one's single job (Suvir / ChatGPT / Claude / Codex).
> - [ ] Find the active task in `ai/CURRENT_TASK.md` and the last `SESSION_HANDOFF.md` entry.
> - [ ] Run the validation gate and recognize a green result.
> - [ ] State the default for commit/push/deploy (**don't, unless Suvir asks**).
> - [ ] Reconnect a phone session with `tmux attach -t tablewise` and detach with `Ctrl-b d`.
> - [ ] Undo an un-committed change to one file safely.
> - [ ] Know which of Suvir / ChatGPT / Claude Code to ask for a given need.
> - [ ] Recite the universal recovery move: stop, orient, read, ask.

When all boxes are checked, you're ready to take a real (small, scoped) task.

---

## Where to go next

- **The full playbook:** `docs/TABLEWISE_OPERATOR_MANUAL.md`
- **One-page cheat sheet:** `docs/TABLEWISE_OPERATOR_QUICK_REFERENCE.md`
- **Phone card:** `docs/TABLEWISE_MOBILE_CARD.md`
- **All diagrams:** `docs/TABLEWISE_OPERATOR_VISUALS.md`
- **Engineering detail (when you need it):** `docs/HANDOFF.md`

> Welcome aboard. The system is designed so you never have to remember it — just
> find the checklist and follow it.
