# Tablewise Operator — Quick Reference

*One page. Exact commands. Full detail: `docs/TABLEWISE_OPERATOR_MANUAL.md`.*

---

## Golden rule
**Find the checklist. Follow it top to bottom. Don't trust memory. Stopping is safe.**

## Project location
```bash
cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"
```

## Start every session
```bash
bash scripts/agent-status.sh        # tools + active task + tmux (read-only)
```
Then read: `ai/CURRENT_TASK.md` (the one active job) and the top of
`ai/SESSION_HANDOFF.md` (what happened last).

## Run the checks (the "gate")
```bash
bash scripts/agent-closeout.sh      # lint → typecheck → test → build
bash scripts/agent-closeout.sh --db # also read-only DB check
```
Want green on all four before trusting a change.

## Look around (all safe / read-only)
```bash
git status --short
git diff
git log --oneline -n 20
```

## The cast (one job each)
- **Suvir** — boss, approves commit/push/deploy.
- **ChatGPT** — planner. Idea → task packet. No code.
- **Claude Code** — builder. Codes in the terminal.
- **Codex** — checker / second opinion. *Not installed; optional.*
- Only **Claude Code + npm** are installed today. Never assume others; never install.

## New idea → work
1. ChatGPT: "Break into smallest safe slice + fill the task packet."
2. Save packet into `ai/CURRENT_TASK.md` (only ONE active job).
3. Tell Claude: "Read `ai/CURRENT_TASK.md` + rules, then build."

## Claude says "done" — verify
1. Gate green? (`bash scripts/agent-closeout.sh`)
2. `git status --short` + `git diff` — matches the task?
3. `ai/CLOSEOUT_CHECKLIST.md` filled? Handoff written?
4. Then → decision below.

## Commit / push / deploy decision
```
Done + gate green
  Commit?  only if Suvir asked → if on main, branch first:
           git checkout -b <type>/<name>
  Push?    only if Suvir asked (pushing = publishing)
  Deploy?  only if Suvir asked → desktop only, never phone
  Else:    STOP. Leave it in the working tree.
```
**Default = do nothing.** "Leave it in the tree" is a valid, safe outcome.

## Phone (Termius + tmux)
```bash
tmux attach -t tablewise || tmux new -s tablewise   # reconnect to work
# detach (keeps running):  Ctrl-b  then  d
```
Safe on phone: `agent-status.sh`, `agent-closeout.sh`, `git status/diff/log`,
small readable edits.
Never on phone: commit, push, deploy, migrate, install, edit secrets.

## Closeout (before you leave)
1. Gate (only if you changed scripts/app code) — record real results.
2. Fill `ai/CLOSEOUT_CHECKLIST.md`.
3. Add top entry to `ai/SESSION_HANDOFF.md` (changed / verified / next / owner).
4. Set status in `ai/CURRENT_TASK.md`.
5. `git status --short` so the next person sees what's pending.

## Never
Commit/push/deploy/migrate/install without being asked · print or commit secrets
· run two tasks at once · force-push / `reset --hard` / delete branches · change
app behavior during a docs task · revive Builder-os (idea donor only).

## Emergencies
- **Broke something:** don't commit; `git status` + `git diff`; rerun gate; ask Suvir.
- **Phone dropped:** work is safe in tmux → `tmux attach -t tablewise`.
- **Secret exposed:** don't commit/paste it; tell Suvir (rotate keys).
- **Lost:** `agent-status.sh` → read `CURRENT_TASK.md` → find manual section → ask Suvir.
