# Tablewise Operator — Visuals

*Every diagram and decision tree from the Operator's Manual, collected in one
place. ASCII art only, optimized for PDF export. Substance is unchanged — these
mirror the diagrams in `docs/TABLEWISE_OPERATOR_MANUAL.md`. Use this as a wall
chart or an appendix.*

---

## Index

1. The cast (who reports to whom)
2. Big-picture workflow (idea → done)
3. New-idea pipeline
4. "Claude finished" decision tree
5. Phone / tmux connection model
6. Commit / push / deploy decision tree
7. "When lost" recovery path
8. Where everything lives (file map)

---

## 1. The cast — who reports to whom

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

---

## 2. Big-picture workflow — idea to done

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
  [7] SUVIR decides: commit? push? deploy? stop?
   │
   ▼
  DONE — handoff written in ai/SESSION_HANDOFF.md
```

---

## 3. New-idea pipeline

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
  Hand it to Claude Code to build
```

---

## 4. "Claude finished" — decision tree

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
  Go to the commit/push/deploy decision (visual 6)
```

---

## 5. Phone / tmux connection model

```
  iPhone (Termius)  ──SSH──►  Mac Mini  ──►  tmux session "tablewise"
                                                 │
       lock phone / lose signal ──► you DETACH (work keeps running)
                                                 │
       reopen Termius ──► you ATTACH ──► right back where you were
```

Detach (safe, keeps running): press `Ctrl-b`, release, then `d`.
Reconnect: `tmux attach -t tablewise || tmux new -s tablewise`

---

## 6. Commit / push / deploy — decision tree

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

---

## 7. "When lost" — recovery path

```
  I don't know what to do
        │
        ▼
  Run:  bash scripts/agent-status.sh
        │
        ▼
  Read: ai/CURRENT_TASK.md  +  top of ai/SESSION_HANDOFF.md
        │
        ▼
  Find the matching manual section (§5–§11)
        │
        ├── found it ──► follow that checklist
        │
        ▼ still stuck
  STOP and ask Suvir.  (Stopping is always safe.)
```

---

## 8. Where everything lives — file map

```
/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os
  │
  ├── README.md ................. front door
  │
  ├── ai/  ..................... the AgentOps workflow (read first)
  │     ├── AGENT_RULES.md ........ rules every AI assistant follows
  │     ├── CLI_ROLES.md .......... which tool does what + installed status
  │     ├── CURRENT_TASK.md ....... the ONE active job
  │     ├── TASK_PACKET_TEMPLATE.md  the job form
  │     ├── CLOSEOUT_CHECKLIST.md .. end-of-job checklist
  │     ├── SESSION_HANDOFF.md ..... who-did-what logbook
  │     ├── PROMPT_LIBRARY.md ...... copy-paste prompts per tool
  │     ├── MOBILE_WORKFLOW.md ..... iPhone operating guide
  │     ├── AGENTOPS_V2_PROPOSAL.md  future plan (not active)
  │     └── BUILDER_OS_SALVAGE_PLAN.md  old-prototype lessons
  │
  ├── docs/  ................... engineering + operator docs
  │     ├── TABLEWISE_OPERATOR_MANUAL.md ......... canonical manual
  │     ├── TABLEWISE_OPERATOR_MANUAL_PRINT.md ... print/PDF edition
  │     ├── TABLEWISE_OPERATOR_QUICK_REFERENCE.md  one-page sheet
  │     ├── TABLEWISE_MOBILE_CARD.md ............. iPhone card
  │     ├── TABLEWISE_OPERATOR_VISUALS.md ........ this file
  │     ├── TABLEWISE_ONBOARDING.md .............. 30-min onboarding
  │     └── HANDOFF.md / ARCHITECTURE.md / ... ... engineering detail
  │
  └── scripts/  ................ helper scripts (run by name)
        ├── agent-status.sh ...... orientation (read-only)
        └── agent-closeout.sh .... run the validation gate
```

---

*These visuals are a mirror of the manual's diagrams. If a diagram changes in
`docs/TABLEWISE_OPERATOR_MANUAL.md`, update it here too.*
