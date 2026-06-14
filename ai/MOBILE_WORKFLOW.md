# MOBILE_WORKFLOW.md — Operating Tablewise from an iPhone

AgentOps v1.1: Mobile Operations. This is how to drive the Tablewise repo over
SSH from an iPhone using **Termius + tmux**, without losing work when the phone
sleeps, the app backgrounds, or the cellular connection drops.

Read this with `ai/AGENT_RULES.md`. The rules don't change on mobile — only the
ergonomics do. The golden rule: **always work inside tmux**, so a dropped
connection detaches you instead of killing your work.

---

## Why tmux

A bare SSH session dies when the phone locks, switches apps, or loses signal —
and any long-running command (a build, a test run, an agent session) dies with
it. tmux keeps the session alive on the host. You reconnect and reattach exactly
where you left off.

**Rule: never run lint/typecheck/test/build or an agent session outside tmux on
mobile.** If it runs longer than a glance, it belongs in tmux.

---

## Reconnecting with Termius

1. Open **Termius** → **Hosts** → select the dev host (the Mac running this repo,
   or its remote).
2. Tap to open an SSH session. If you use Termius "Snippets", a reconnect snippet
   like the one below gets you straight back into your work.
3. Re-attach tmux (see next section). You should see your previous panes.

Termius tips for phones:
- Enable **Keep Alive** on the host (Termius host settings) so brief network
  blips don't drop the SSH layer.
- Add the **extra keys row** (Esc, Ctrl, Tab, arrows) — tmux and shell editing
  need Ctrl and Esc constantly.
- Save a **Snippet** for the reconnect one-liner so it's one tap.

Reconnect one-liner (attach if a session exists, else create one):

```bash
cd "/Volumes/Mac Mini - Extended/Projects/metabolic-meal-os" && \
  tmux attach -t tablewise || tmux new -s tablewise
```

---

## Attaching / detaching tmux

| Action | Command / keys |
|--------|----------------|
| Create a named session | `tmux new -s tablewise` |
| List sessions | `tmux ls` |
| Attach to a session | `tmux attach -t tablewise` |
| Attach, detaching others | `tmux attach -d -t tablewise` |
| **Detach** (leave it running) | `Ctrl-b` then `d` |
| Kill a session (careful) | `tmux kill-session -t tablewise` |

**Detaching is safe and is the whole point** — `Ctrl-b d` leaves everything
running on the host. Closing Termius or locking the phone effectively detaches
too; your panes keep running.

> The tmux prefix is `Ctrl-b` by default. On a phone keyboard, that's the Ctrl
> key in the Termius accessory row, then `b`, then release, then the next key.

---

## Core tmux commands

All of these are prefixed by `Ctrl-b` (press prefix, release, then the key):

| Keys | Does |
|------|------|
| `d` | Detach (keep session running) |
| `c` | Create a new window |
| `n` / `p` | Next / previous window |
| `0`–`9` | Jump to window by number |
| `w` | Window list (pick from a menu) |
| `,` | Rename current window |
| `"` | Split pane horizontally |
| `%` | Split pane vertically |
| `o` | Cycle panes |
| `x` | Kill current pane (confirms) |
| `z` | Zoom/unzoom current pane (full-screen) |
| `[` | Enter scroll/copy mode (then arrows / PageUp; `q` to exit) |

On a phone, prefer **windows over panes** — small split panes are hard to read.
One window per concern (one for the agent, one for the validation gate, one for
git/status) reads far better on a 6-inch screen. `Ctrl-b z` to zoom is your
friend when you do split.

Scrolling output on a phone: `Ctrl-b [` enters copy mode so you can scroll with
the arrow keys or swipe; press `q` to leave it. (Without copy mode, swiping
scrolls the terminal's own scrollback, which fights with tmux.)

---

## Safe from a phone

These are short, read-mostly, or resumable-in-tmux. Good for thumbs:

- **Status / orientation:**
  `bash scripts/agent-status.sh` (now shows tmux session + window count)
- **The validation gate, inside tmux:**
  `bash scripts/agent-closeout.sh` (runs lint/typecheck/test/build; detach and
  let it run, reattach to read the summary)
- **Individual gate steps, inside tmux:**
  `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- **Read-only DB check:** `npm run db:check`
- **Git inspection:** `git status`, `git diff`, `git log --oneline -n 20`
- **Reading files:** `less <file>`, `cat`, `grep -n`, viewing `ai/` docs.
- **Driving an agent session (Claude Code) inside tmux** for small, well-scoped
  edits where you can read the diff on screen.

Habit: start the long ones, **`Ctrl-b d` to detach**, lock the phone, reattach
later to read results. Don't babysit a build on cellular.

---

## Do NOT attempt from a phone

Avoid these on mobile — they're destructive, interactive in ways phone keyboards
fight with, or need a real screen to review safely:

- **Anything that commits or pushes by reflex.** Commit/push only when you've
  reviewed the full diff — hard to do on a phone. (And per `ai/AGENT_RULES.md`,
  only when explicitly intended.)
- **Destructive git:** `git reset --hard`, `git push --force`, `git rebase -i`,
  branch deletion. Easy to mis-tap, hard to undo from a phone.
- **`drizzle-kit migrate` against any real database**, or any production-facing
  migration/deploy. Read-only `npm run db:check` is fine; mutations are not.
- **`vercel deploy` / production promotion.** Deploys deserve a desktop and a
  diff review.
- **Installing or upgrading dependencies / CLIs** (`npm install <pkg>`, global
  installs). Forbidden by AgentOps regardless of device.
- **Editing secrets / `.env*` files**, or pasting secrets into the terminal.
- **Large multi-file refactors** where you can't read the whole diff on screen —
  scope these to a desktop session.
- **Interactive full-screen TUIs that fight the phone keyboard** (e.g. `git
  add -i`, complex `vim` sessions). Prefer non-interactive flags.

When in doubt on a phone: **start it in tmux, detach, and finish the review on a
desktop.**

---

## Quick reference card

```
Reconnect:   tmux attach -t tablewise || tmux new -s tablewise
Detach:      Ctrl-b d              (safe; keeps running)
New window:  Ctrl-b c             Switch: Ctrl-b n / p / 0-9
Zoom pane:   Ctrl-b z             Scroll: Ctrl-b [   (q to exit)
Orient:      bash scripts/agent-status.sh
Gate:        bash scripts/agent-closeout.sh   (detach, let it run)
```
