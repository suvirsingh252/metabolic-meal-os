<!--
  TABLEWISE OPERATOR'S MANUAL v1.0 — PRINT EDITION
  This is a formatting-enhanced version of docs/TABLEWISE_OPERATOR_MANUAL.md,
  optimized for PDF export. Operational guidance is unchanged — only layout,
  callouts, page breaks, and screenshot placeholders were added.
  PAGE BREAK markers (<!-- PAGE BREAK -->) are hints for the PDF renderer.
-->

<div align="center">

# 📘 Tablewise Operator's Manual
## v1.0 — Founder's Edition

### *How to Operate Tablewise Without Having to Remember Anything*

---

**A practical operating playbook**

For: Suvir · Future contributors · Contractors · Family operators · Early employees

*Document type: operating playbook (not architecture). For engineering detail see `docs/HANDOFF.md`.*

</div>

<!-- PAGE BREAK -->

---

## How to read this manual

> ### 📖 In one sentence
> **Find the checklist for your situation, follow it top to bottom, and you can
> operate Tablewise safely without remembering anything.**

This print edition mirrors `docs/TABLEWISE_OPERATOR_MANUAL.md` exactly in
substance. It adds page breaks, callout boxes, command cards, and screenshot
placeholders so it prints and onboards cleanly. Companion artifacts:

| Artifact | Use it for |
|----------|-----------|
| `docs/TABLEWISE_OPERATOR_MANUAL.md` | The canonical manual (source of truth). |
| `docs/TABLEWISE_OPERATOR_MANUAL_PRINT.md` | **This file** — print/PDF edition. |
| `docs/TABLEWISE_OPERATOR_QUICK_REFERENCE.md` | One-page command sheet. |
| `docs/TABLEWISE_MOBILE_CARD.md` | iPhone operating card. |
| `docs/TABLEWISE_OPERATOR_VISUALS.md` | All diagrams & decision trees in one place. |
| `docs/TABLEWISE_ONBOARDING.md` | 30-minute new-contributor guide. |

### Table of contents

1. Cover / purpose
2. Golden rule: follow the checklist
3. The cast: who does what
4. Big-picture workflow
5. Daily startup checklist
6. "I have a new idea" workflow
7. "Claude finished work" workflow
8. "I need a review" workflow
9. "I am on my phone" workflow
10. Session closeout checklist
11. Commit / push / deploy decision guide
12. Emergency procedures
13. Common commands
14. Things we never do
15. Glossary
16. Quick reference appendix

<!-- PAGE BREAK -->

---

## 1. Cover / purpose

Tablewise is a household meal-intelligence app (formerly "Metabolic Meal OS" /
"Meal OS"). This manual is about **operating the development of Tablewise** —
running the AI assistants, keeping work organized, and not breaking anything —
not about using the app itself.

The whole system is built around one simple idea:

> ### 🎯 The core idea
> **Work lives in files, not in your head or in a chat window.**
> Every task, every handoff, every rule is written down in the `/ai` folder.
> When you sit down (or pick up your phone), you read the relevant file and
> follow it. That is the entire operating model.

**Where everything lives:**

```
Project folder:  /Volumes/Mac Mini - Extended/Projects/metabolic-meal-os

  README.md ................. front door, points to everything
  /ai/ ...................... the AI operating workflow (read these first)
      AGENT_RULES.md ........ the rules every AI assistant must follow
      CLI_ROLES.md .......... which tool does what + what's installed
      CURRENT_TASK.md ....... the ONE job being worked on right now
      TASK_PACKET_TEMPLATE.md  the form used to define a job
      CLOSEOUT_CHECKLIST.md .. the end-of-job checklist
      SESSION_HANDOFF.md ..... the logbook of who did what, handed to whom
      PROMPT_LIBRARY.md ...... copy-paste prompts for each AI tool
      MOBILE_WORKFLOW.md ..... how to operate from an iPhone
      AGENTOPS_V2_PROPOSAL.md  future plan (proposed, not active)
      BUILDER_OS_SALVAGE_PLAN.md  lessons from an old prototype
  /docs/ ................... engineering + operating docs (incl. this manual)
  /scripts/ ................ helper scripts you run by name
```

<!-- PAGE BREAK -->

---

## 2. Golden rule: follow the checklist

> ## ⭐ THE GOLDEN RULE
> **When in doubt, find the checklist and follow it top to bottom.**
> Do not improvise. Do not skip steps. Do not trust memory.
> If there is no checklist for your situation, stop and ask Suvir.

Everything else in this manual is just checklists for specific situations. The
skill you need is not "remember how Tablewise works" — it is "find the right
checklist and follow it honestly."

<table>
<tr>
<td width="50%" valign="top">

> ### ✅ DO THIS
> - Read the file before acting.
> - Run the steps in order.
> - Write down what actually happened (including failures).

</td>
<td width="50%" valign="top">

> ### 🚫 DO NOT DO THIS
> - Guess.
> - Skip the validation gate "just this once."
> - Say a step passed when you did not run it.

</td>
</tr>
</table>

<!-- PAGE BREAK -->

---

## 3. The cast: who does what

Think of Tablewise development as a small team. Each member has one job. Staying
in lane is what keeps them from stepping on each other.

```
   ┌───────────┐     gives jobs to      ┌──────────────┐
   │   SUVIR   │ ─────────────────────► │   ChatGPT    │  (the planner)
   │ (the boss)│ ◄───────────────────── │   PM / brain │
   └───────────┘   asks for decisions   └──────┬───────┘
        ▲                                       │ writes a "task packet"
        │ approves                              ▼
        │                                ┌──────────────┐
        │                                │ CURRENT_TASK │  (the job board)
        │                                └──────┬───────┘
        │                                       │ Claude reads it
        │ reviews results                       ▼
        │                                ┌──────────────┐
        └─────────────────────────────── │ Claude Code  │  (the builder)
                                          │  terminal    │
                                          └──────┬───────┘
                                                 │ optional second opinion
                                                 ▼
                                          ┌──────────────┐
                                          │    Codex     │  (the checker)
                                          │ *not installed*
                                          └──────────────┘
```

| Who | Role in plain English | Where they live |
|-----|----------------------|-----------------|
| **Suvir** | The boss. Decides what matters, approves commits/deploys, makes the calls only a human should make. | Anywhere |
| **ChatGPT** | The planner / project manager. Turns a fuzzy idea into a clear written job ("task packet"). Does **not** touch the code. | Web browser |
| **Claude Code** | The builder. Does the actual coding, runs the checks, updates the docs. The main worker. | Terminal on the Mac Mini |
| **Codex** | The checker / second opinion. Reviews work or makes one small fix. **Not installed yet** — treat as optional. | Terminal (when added) |
| **Mac Mini** | The machine that actually runs everything. Always on, holds the project. | The Mac Mini |
| **Termius + tmux** | Your remote control from a phone. Termius connects; tmux keeps work alive if your phone disconnects. | iPhone → Mac Mini |

> ### ⚠️ Important
> Today only **Claude Code** and the project's built-in commands are installed.
> Codex, Gemini, aider, and other tools are *candidates* — they may not exist on
> the machine. Never assume a tool is installed; the script in §13 tells you the
> truth. Never install one to "unblock" yourself.

<!-- PAGE BREAK -->

---

## 4. Big-picture workflow

This is the whole life of a piece of work, start to finish:

```
  IDEA
   │
   ▼
  [1] ChatGPT turns the idea into a TASK PACKET
   │        (one small, clear slice of work)
   ▼
  [2] The packet is placed in ai/CURRENT_TASK.md
   │        (now there is exactly ONE active job)
   ▼
  [3] Claude Code reads it and builds the slice
   │
   ▼
  [4] Claude runs the VALIDATION GATE
   │        lint → typecheck → test → build
   │
   ├── ❌ fails ──► fix, run again (do not proceed on red)
   │
   ▼ ✅ passes
  [5] (Optional) Codex or Claude reviews the change
   │
   ▼
  [6] Claude fills the CLOSEOUT CHECKLIST + updates HANDOFF
   │
   ▼
  [7] SUVIR decides: commit? push? deploy? stop?   ◄── see §11
   │
   ▼
  DONE — handoff written in ai/SESSION_HANDOFF.md
```

Every arrow is a checklist in this manual. You never have to invent the next
step — you just look it up.

<!-- PAGE BREAK -->

---

## 5. Daily startup checklist

Do this every time you begin a Tablewise session, on desktop or phone.

> ### ☑️ STARTUP
> 1. **Get to the project.**
>    `cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"`
> 2. **See the lay of the land.**
>    `bash scripts/agent-status.sh`
>    This tells you: which tools are installed, whether the checks are
>    available, the active task, and (on a phone) your tmux session.
> 3. **Read the active job.** Open `ai/CURRENT_TASK.md`. Who owns it? What's the
>    status? If it says **"No active task"**, there is nothing in flight.
> 4. **Read the last handoff.** Open the top entry of `ai/SESSION_HANDOFF.md` to
>    see what happened last and what's next.
> 5. **Check for uncommitted work.** `git status --short`
>    - Empty output = clean, nothing pending.
>    - Lines listed = there is work in the tree; read it before changing anything.
> 6. **Now decide which workflow you're in** (§6–§9) and go to that section.

`[SCREENSHOT: agent-status output]`
*Caption: A healthy `bash scripts/agent-status.sh` run — installed tools, the
available checks, the active task, and tmux state.*

`[SCREENSHOT: git status examples]`
*Caption: `git status --short` — left, a clean tree (no output); right, a tree
with pending changes listed.*

<table>
<tr>
<td width="50%" valign="top">

> ### ✅ DO THIS
> - Always run `agent-status.sh` first. It is read-only and safe.

</td>
<td width="50%" valign="top">

> ### 🚫 DO NOT DO THIS
> - Start editing before reading `CURRENT_TASK.md`. You might stomp on work
>   another session left in progress.

</td>
</tr>
</table>

<!-- PAGE BREAK -->

---

## 6. "I have a new idea" workflow

You thought of something Tablewise should do. Here is how to turn it into safe,
organized work.

```
  Your idea
     │
     ▼
  Talk it through with ChatGPT (planner)
     │   "Break this into the smallest safe slice."
     ▼
  ChatGPT writes a TASK PACKET (using TASK_PACKET_TEMPLATE.md)
     │
     ▼
  You paste/save that packet into ai/CURRENT_TASK.md
     │
     ▼
  Hand it to Claude Code to build (§7 covers what comes back)
```

> ### ☑️ NEW IDEA
> 1. Open ChatGPT. Describe the idea in plain words.
> 2. Ask: *"Break this into the smallest safe vertical slice and fill out the
>    Tablewise task packet."* (The template is `ai/TASK_PACKET_TEMPLATE.md`.)
> 3. Make sure the packet answers: **What's the goal? Does it change how the app
>    behaves? Which files? What does 'done' look like?**
> 4. Save the finished packet into `ai/CURRENT_TASK.md`. There should only ever
>    be **one** active task there.
> 5. Tell Claude Code: *"Read `ai/CURRENT_TASK.md` and the rules, then build it."*
>    (Use the Claude prompt in `ai/PROMPT_LIBRARY.md`.)

<table>
<tr>
<td width="50%" valign="top">

> ### ✅ DO THIS
> - Keep slices small. One screen, one fix, one feature at a time.
> - Write down what is **out of scope** so it doesn't sneak in.

</td>
<td width="50%" valign="top">

> ### 🚫 DO NOT DO THIS
> - Hand Claude a giant vague idea ("make the planner better"). It will guess.
> - Run two tasks at once. One active task, one owner.

</td>
</tr>
</table>

<!-- PAGE BREAK -->

---

## 7. "Claude finished work" workflow

Claude Code says it's done. Before you believe it, walk this checklist.

> ### ☑️ CLAUDE FINISHED
> 1. **Did the validation gate pass?** Ask for the results, or run:
>    `bash scripts/agent-closeout.sh`
>    You want to see: **lint pass, typecheck pass, test pass, build pass.**
> 2. **Look at what changed.** `git status --short` then `git diff`
>    Read it. Does it match what the task asked for? Anything surprising?
> 3. **Was the closeout filled in?** Check `ai/CLOSEOUT_CHECKLIST.md` — real
>    results, not blanks.
> 4. **Was the handoff written?** Check the top of `ai/SESSION_HANDOFF.md`.
> 5. **Decide what to do with it** → go to §11 (commit / push / deploy / stop).

**Decision tree:**

```
  Claude says "done"
        │
        ▼
  Gate green?  ── no ──►  send it back. Not done.
        │ yes
        ▼
  Diff matches the task?  ── no ──►  ask why. Maybe send back.
        │ yes
        ▼
  Closeout + handoff written?  ── no ──►  ask Claude to finish paperwork.
        │ yes
        ▼
  Go to §11 (commit/push/deploy/stop)
```

> ### 🚫 DO NOT DO THIS
> - Accept "all tests pass" without seeing the numbers. Ask for "369/369"-style
>   evidence.
> - Commit a diff you have not actually looked at.

<!-- PAGE BREAK -->

---

## 8. "I need a review" workflow

You want a second pair of eyes on a change before trusting it.

> ### ☑️ REVIEW
> 1. Make sure the change is in the working tree and the gate is green (§7).
> 2. **If Codex is installed** (check with `agent-status.sh`): hand it the diff
>    in *audit mode* — read-only, list problems, don't edit. Use the Codex audit
>    prompt in `ai/PROMPT_LIBRARY.md`.
> 3. **If Codex is NOT installed** (the normal case today): ask Claude Code to do
>    a self-review pass, or run the built-in `/code-review` in a Claude session.
> 4. Collect the findings. Decide: fix now, log as follow-up, or accept as-is.
> 5. Record the decision in `ai/CURRENT_TASK.md` notes.

<table>
<tr>
<td width="50%" valign="top">

> ### ✅ DO THIS
> - Prefer the reviewer to be a *different* tool than the one that wrote the code.

</td>
<td width="50%" valign="top">

> ### 🚫 DO NOT DO THIS
> - Install Codex just to get a review. If it's not there, use Claude's review.
> - Let the reviewer start editing without first taking ownership via a handoff.

</td>
</tr>
</table>

<!-- PAGE BREAK -->

---

## 9. "I am on my phone" workflow

You're away from the Mac Mini and want to operate from your iPhone using
**Termius** (the SSH app) and **tmux** (keeps work alive across drops). The full
guide is `ai/MOBILE_WORKFLOW.md`; this is the operating version.

> ### 🔑 THE PHONE GOLDEN RULE
> **Always work inside tmux.** If your phone locks or loses signal, tmux keeps
> everything running on the Mac Mini. Without it, a dropped connection kills your
> work.

```
  iPhone (Termius)  ──SSH──►  Mac Mini  ──►  tmux session "tablewise"
                                                 │
       lock phone / lose signal ──► you DETACH (work keeps running)
                                                 │
       reopen Termius ──► you ATTACH ──► right back where you were
```

`[SCREENSHOT: Termius connection]`
*Caption: Termius host list → tapping the Mac Mini → an open SSH session.*

`[SCREENSHOT: tmux attach]`
*Caption: Running `tmux attach -t tablewise` and landing back in the live
session, windows intact.*

> ### ☑️ PHONE SESSION
> 1. Open **Termius** → tap the Mac Mini host → open an SSH session.
> 2. **Reconnect to your work** (attach if it exists, else start it):
>    `tmux attach -t tablewise || tmux new -s tablewise`
> 3. Go to the project if needed:
>    `cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"`
> 4. **Orient:** `bash scripts/agent-status.sh` (now shows your tmux session).
> 5. Do safe work (see box below). Start long jobs, then **detach** and lock the
>    phone — come back later for the result.
> 6. **Detach (safe, keeps running):** press `Ctrl-b`, release, then press `d`.

<table>
<tr>
<td width="50%" valign="top">

> ### ✅ SAFE FROM A PHONE
> - `bash scripts/agent-status.sh` — orientation
> - `bash scripts/agent-closeout.sh` — run the checks (detach, come back)
> - `git status`, `git diff`, `git log --oneline -n 20` — look around
> - Reading files; small, well-scoped Claude Code edits you can read on screen

</td>
<td width="50%" valign="top">

> ### 🚫 NEVER FROM A PHONE
> - Commit or push
> - Database migrations or deploys
> - Installing anything / editing secrets (`.env*`)
> - Big multi-file changes you can't fully read on a small screen
> - Save those for a desktop where you can review the whole diff.

</td>
</tr>
</table>

> **If your phone disconnects:** don't panic. Your work is still running in tmux
> on the Mac Mini. Just reopen Termius and run the attach command in step 2.

<!-- PAGE BREAK -->

---

## 10. Session closeout checklist

Before you walk away, leave the project clean and the next person (maybe future
you) informed. This mirrors `ai/CLOSEOUT_CHECKLIST.md` and the end-of-session
procedure in `docs/HANDOFF.md`.

> ### ☑️ CLOSEOUT
> 1. **Run the gate** (only if you changed scripts or app code):
>    `bash scripts/agent-closeout.sh` — record real results.
> 2. **Fill the closeout file:** `ai/CLOSEOUT_CHECKLIST.md` with actual pass/fail.
> 3. **Write the handoff:** add a top entry to `ai/SESSION_HANDOFF.md` —
>    what changed, what's verified, what's next, who owns the tree now.
> 4. **Update the job board:** set the status in `ai/CURRENT_TASK.md`
>    (Complete / Blocked) or replace it with the next packet.
> 5. **Update docs if app behavior or routes/env changed** (`docs/HANDOFF.md`,
>    `docs/ROADMAP.md`, `docs/SESSION_LOG.md`, etc.).
> 6. **List the files you changed** and write a one-line commit recommendation.
> 7. **Leave the tree clean or clearly noted.** Run `git status --short` so the
>    next person sees exactly what's pending.

> ### 🚫 DO NOT DO THIS
> - Leave without writing a handoff. The next session won't know what you did.
> - Claim the gate passed if you skipped it — say "skipped, docs only" instead.

<!-- PAGE BREAK -->

---

## 11. Commit / push / deploy decision guide

This is the most important decision in the manual. **Committing, pushing, and
deploying are separate steps, and each one needs a reason.** Default to doing
nothing until Suvir says so.

```
  Work is done and the gate is green.
        │
        ▼
  Did Suvir (or the task) ask to COMMIT?
        │
        ├── no ──►  STOP. Leave it in the working tree. You're done.
        │
        ▼ yes
  Are you on the main branch?
        │
        ├── yes ──►  make a branch first:
        │             git checkout -b <type>/<short-name>
        │
        ▼
  Commit (scoped, clear message).  ── then ──►
        │
        ▼
  Did Suvir ask to PUSH?
        │
        ├── no ──►  STOP. Commit stays local.
        │
        ▼ yes
  Push the branch.  ── then ──►
        │
        ▼
  Did Suvir ask to DEPLOY?
        │
        ├── no ──►  STOP. Pushed, not deployed.
        │
        ▼ yes
  Deploy is a DESKTOP, reviewed action. Never from a phone.
```

| Action | When it's OK | Never |
|--------|-------------|-------|
| **Commit** | Suvir asked; gate is green; you've read the diff. | On a whim; on red; on `main` without a branch. |
| **Push** | Suvir asked; commit reviewed. | "To back it up." Pushing is publishing. |
| **Deploy** | Suvir asked; on a desktop; change reviewed. | From a phone; without review; to "just try it." |

<table>
<tr>
<td width="50%" valign="top">

> ### ✅ DO THIS
> - Treat "do nothing yet" as a valid, safe outcome.
> - Branch off `main` before committing if you're on `main`.

</td>
<td width="50%" valign="top">

> ### 🚫 DO NOT DO THIS
> - Auto-commit because the work looks finished. **Default is: do not commit.**
> - Force-push, reset --hard, or delete branches without explicit instruction.

</td>
</tr>
</table>

<!-- PAGE BREAK -->

---

## 12. Emergency procedures

Calm, specific steps for when something goes wrong. None of these are
catastrophic if you follow the steps.

> ### 🆘 "I think I broke something / the checks are failing"
> 1. Don't commit. Don't push.
> 2. See what's changed: `git status --short` and `git diff`.
> 3. If the change is small and wrong, you can throw away **un-committed** edits
>    to a single file: `git checkout -- <path/to/file>` (this discards your
>    changes to that file — only do it if you're sure).
> 4. Run the gate again: `bash scripts/agent-closeout.sh`.
> 5. Still broken? Write what happened in `ai/SESSION_HANDOFF.md` and ask Suvir.

> ### 🆘 "My phone disconnected mid-task"
> 1. Your work is still running in tmux on the Mac Mini. Nothing is lost.
> 2. Reopen Termius → SSH to the Mac Mini.
> 3. `tmux attach -t tablewise` — you're back.
> 4. If `tmux ls` shows the session is gone, the job finished or the machine
>    restarted; check `git status --short` to see the result.

> ### 🆘 "Two sessions edited at once / I'm confused who owns the work"
> 1. Stop editing.
> 2. Read `ai/CURRENT_TASK.md` (who's the owner?) and the top of
>    `ai/SESSION_HANDOFF.md`.
> 3. Whoever is **not** named owner backs off. Ownership passes only via a
>    written handoff entry.

> ### 🆘 "A secret/key might have been exposed"
> 1. Do **not** commit or push anything containing it.
> 2. Do not paste it into ChatGPT, a browser, or any external tool.
> 3. Tell Suvir immediately — keys may need rotating (see `docs/HANDOFF.md`).

> ### 🆘 "I don't know what to do"
> 1. That's fine. Run `bash scripts/agent-status.sh`.
> 2. Read `ai/CURRENT_TASK.md` and the latest handoff.
> 3. Find the matching section in this manual (§5–§11).
> 4. Still stuck? Stop and ask Suvir. Stopping is always safe.

> ### 🚫 IN ANY EMERGENCY, NEVER
> - Force-push or `git reset --hard` to "clean things up."
> - Delete files or branches to make an error go away.
> - Run database migrations or deploys to "reset" the situation.

<!-- PAGE BREAK -->

---

## 13. Common commands

You can operate Tablewise with this short list. Copy-paste; don't memorize.

> ### 🗂️ COMMAND CARD — orientation & checks (always safe)
> ```bash
> # Go to the project
> cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"
>
> # See what's installed + active task + tmux state (READ-ONLY)
> bash scripts/agent-status.sh
>
> # Run all the checks (lint, typecheck, test, build)
> bash scripts/agent-closeout.sh
> bash scripts/agent-closeout.sh --db    # also run the read-only DB check
> ```

> ### 🗂️ COMMAND CARD — look around (read-only)
> ```bash
> git status --short
> git diff
> git log --oneline -n 20
> ```

> ### 🗂️ COMMAND CARD — checks one at a time
> ```bash
> npm run lint
> npm run typecheck
> npm test
> npm run build
> npm run db:check        # read-only database check
> ```

> ### 🗂️ COMMAND CARD — phone (tmux)
> ```bash
> tmux attach -t tablewise || tmux new -s tablewise   # reconnect to work
> tmux ls                                             # list running sessions
> # Detach (keep it running):  press Ctrl-b, then d
> ```

> ### ⚠️ Note
> Everything above is safe to run. The dangerous actions (commit, push, deploy,
> migrate, install) are **not** in this list on purpose — those need a decision
> (§11), not a reflex.

<!-- PAGE BREAK -->

---

## 14. Things we never do

> ### 🚫 THE NEVER LIST
> - **Never commit or push unless Suvir asks.** Default is leave-it-in-the-tree.
> - **Never deploy or run a database migration from a phone.**
> - **Never install dependencies or new CLIs** to unblock yourself. Candidate
>   tools that aren't installed are simply not options this session.
> - **Never print, paste, or commit secrets** or `.env*` files. Not into ChatGPT,
>   not anywhere.
> - **Never change how the app behaves** during a docs/tooling task.
> - **Never run two active tasks at once.** One job, one owner.
> - **Never claim a check passed that you didn't run.** Say "skipped" honestly.
> - **Never force-push, `reset --hard`, or delete branches** without explicit
>   instruction.
> - **Never revive Builder-os as a foundation** (see the lesson below).

### The Builder-os lesson

Builder-os was an **earlier prototype** — a web app that tried to manage AI
development through a browser GUI and a server. It worked, but it was the wrong
shape: it needed a backend, stored everything in fragile browser storage, and
added a server to maintain.

> ### 💡 The lesson
> Tablewise AgentOps deliberately does the same job with plain files and small
> scripts instead. We **salvage good ideas** from Builder-os (like its role
> prompts and its "stop after this slice" discipline) but we **do not revive the
> app.** The full reasoning is in `ai/BUILDER_OS_SALVAGE_PLAN.md`.
>
> Plain version: *old prototype = idea donor, not a thing to bring back to life.*

<!-- PAGE BREAK -->

---

## 15. Glossary

| Term | Plain meaning |
|------|---------------|
| **AgentOps** | Our system for running AI assistants without them stepping on each other. Lives in `/ai`. |
| **Task packet** | A filled-out form describing one small job. Made from `ai/TASK_PACKET_TEMPLATE.md`. |
| **CURRENT_TASK** | The one job being worked on right now (`ai/CURRENT_TASK.md`). |
| **The gate / validation gate** | The four checks every change must pass: lint, typecheck, test, build. |
| **lint** | Checks the code's style/quality. |
| **typecheck** | Checks the code's types line up (catches a class of bugs). |
| **test** | Runs the automated tests. |
| **build** | Confirms the app can be assembled for release. |
| **Closeout** | The end-of-job checklist (`ai/CLOSEOUT_CHECKLIST.md`). |
| **Handoff** | The logbook passing work between sessions/tools (`ai/SESSION_HANDOFF.md`). |
| **Owner** | The one person/tool allowed to edit the project right now. |
| **Working tree** | Your uncommitted changes — work that exists but isn't saved into history yet. |
| **Commit** | Saving a change into the project's history (local). |
| **Push** | Sending committed changes to the shared/remote copy (publishing). |
| **Deploy** | Putting changes live for real users. |
| **tmux** | Software that keeps your terminal work alive even if your phone disconnects. |
| **Termius** | The iPhone app used to connect to the Mac Mini. |
| **Attach / Detach** | Reconnect to / step away from a tmux session (work keeps running when detached). |
| **CLI** | A "command-line tool" — something you run by typing its name. |
| **Candidate tool** | A tool we *might* use but that **isn't installed** (e.g. Codex, Gemini). |
| **ChatGPT** | The planner. Turns ideas into task packets. Doesn't touch code. |
| **Claude Code** | The builder. Does the coding in the terminal. |
| **Codex** | The optional checker/second-opinion tool (not installed yet). |
| **Builder-os** | An old prototype. Idea donor only — never revived. |

<!-- PAGE BREAK -->

---

## 16. Quick reference appendix

The one-screen version. (Also available as its own file:
`docs/TABLEWISE_OPERATOR_QUICK_REFERENCE.md`, and a phone card:
`docs/TABLEWISE_MOBILE_CARD.md`.)

**Start every session:**
```bash
cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"
bash scripts/agent-status.sh
# then read ai/CURRENT_TASK.md and the top of ai/SESSION_HANDOFF.md
```

**Run the checks:**
```bash
bash scripts/agent-closeout.sh
```

**The four-question decision (after work is done & green):**
```
Commit?  only if Suvir asked  → branch off main first
Push?    only if Suvir asked
Deploy?  only if Suvir asked  → desktop only, never phone
Else:    STOP. Leave it in the tree.
```

**Phone:**
```bash
tmux attach -t tablewise || tmux new -s tablewise   # reconnect
# detach (safe): Ctrl-b then d
```

**Never:** commit/push/deploy/migrate/install without being asked · print secrets
· run two tasks · revive Builder-os.

**When lost:** run `agent-status.sh`, read `CURRENT_TASK.md`, find the matching
section above, or ask Suvir. Stopping is always safe.

---

<div align="center">

*End of Tablewise Operator's Manual v1.0 — Founder's Edition (Print Edition).*

*This is an operating playbook. For engineering detail see `docs/HANDOFF.md`.*

</div>
