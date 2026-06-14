# 📱 Tablewise Mobile Card

*For operating from an iPhone. Keep it short. Full guide: `ai/MOBILE_WORKFLOW.md`.*

---

## 🔑 Golden rule
**Always work inside tmux.**
If your phone locks or drops, tmux keeps the work alive on the Mac Mini.

---

## 1. Connect (Termius)
1. Open **Termius**.
2. Tap the **Mac Mini** host.
3. Open an SSH session.

Tip: turn on **Keep Alive** for the host, and show the **Ctrl / Esc** keys row.

---

## 2. Reconnect to your work
Paste this one line (save it as a Termius Snippet):
```bash
tmux attach -t tablewise || tmux new -s tablewise
```
Go to the project if needed:
```bash
cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os"
```

---

## 3. Detach (step away safely)
```
Press:  Ctrl-b   then   d
```
Everything keeps running. Lock your phone — come back anytime.

---

## 4. tmux basics
```
Ctrl-b  d     detach (safe)
Ctrl-b  c     new window
Ctrl-b  n/p   next / previous window
Ctrl-b  [     scroll mode (q to exit)
tmux ls       list sessions
```

---

## 5. ✅ Safe on phone
```bash
bash scripts/agent-status.sh      # where am I? what's the job?
bash scripts/agent-closeout.sh    # run the checks (detach, come back)
git status --short
git diff
git log --oneline -n 20
```
Also OK: reading files, small Claude Code edits you can fully read on screen.

---

## 6. 🚫 Avoid on phone
- Commit or push
- Deploy
- Database migrations
- Installing anything
- Editing secrets (`.env*`)
- Big multi-file changes

➡️ Do these on a **desktop** where you can review the full diff.

---

## 7. 🆘 Stuck / recovery
- **Phone disconnected?** Work is safe in tmux. Reopen Termius →
  `tmux attach -t tablewise`.
- **`tmux ls` shows nothing?** The job finished or the Mac restarted.
  Check `git status --short` to see the result.
- **Confused what's going on?** Run `bash scripts/agent-status.sh`, then read
  `ai/CURRENT_TASK.md`.
- **Something feels wrong?** Don't commit, don't push. Detach (`Ctrl-b d`) and
  finish on a desktop, or ask Suvir.

---

*Stopping is always safe. When unsure, detach and wait for a desktop.*
