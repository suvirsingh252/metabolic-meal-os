#!/usr/bin/env bash
#
# agent-status.sh — Tablewise AgentOps status probe.
#
# Prints the current AgentOps state for a session: which CLI tools are actually
# installed, which npm validation commands exist, and what the active task is.
# It is READ-ONLY and never installs anything. It always exits 0 so it can be
# run safely at the top of any agent session.
#
# Usage: bash scripts/agent-status.sh
#
set -u

# Resolve repo root from this script's location (works from any CWD).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

say()  { printf '%s\n' "$*"; }
hr()   { printf '%s\n' "------------------------------------------------------------"; }

# check_cli <display name> <command>
# Reports installed/missing without failing the script.
check_cli() {
  local name="$1" cmd="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    say "  [installed]   $name ($cmd)"
  else
    say "  [missing]     $name ($cmd) — candidate only, do not install"
  fi
}

# has_npm_script <name> — true if package.json defines that script.
has_npm_script() {
  local name="$1"
  if command -v node >/dev/null 2>&1 && [ -f "$ROOT/package.json" ]; then
    node -e "process.exit(require('$ROOT/package.json').scripts?.['$name']?0:1)" 2>/dev/null
    return $?
  fi
  # Fallback: crude grep if node is unavailable.
  grep -q "\"$name\"[[:space:]]*:" "$ROOT/package.json" 2>/dev/null
}

check_npm_script() {
  local name="$1"
  if has_npm_script "$name"; then
    say "  [available]   npm run $name"
  else
    say "  [n/a]         npm run $name — not defined"
  fi
}

hr
say "Tablewise AgentOps — status"
say "Repo: $ROOT"
hr

say "CLI tools (candidate tools may be absent — that is expected):"
check_cli "Claude Code"      "claude"
check_cli "Codex CLI"        "codex"
check_cli "Gemini CLI"       "gemini"
check_cli "aider"            "aider"
check_cli "GitHub CLI"       "gh"
check_cli "Vercel CLI"       "vercel"
check_cli "Neon CLI"         "neonctl"
check_cli "Node.js"          "node"
check_cli "npm"              "npm"
hr

say "Validation gate (existing npm scripts only):"
check_npm_script "lint"
check_npm_script "typecheck"
check_npm_script "test"
check_npm_script "build"
check_npm_script "db:check"
hr

say "Active task (ai/CURRENT_TASK.md):"
if [ -f "$ROOT/ai/CURRENT_TASK.md" ]; then
  # Print the owner + status lines if present; else a hint.
  grep -E "^\s*-\s*\*\*(Owner|Status)" "$ROOT/ai/CURRENT_TASK.md" 2>/dev/null \
    | sed 's/^/  /' \
    || say "  (no Owner/Status lines found — open the file)"
else
  say "  ai/CURRENT_TASK.md not found."
fi
hr

say "tmux (mobile / SSH sessions):"
if [ -n "${TMUX:-}" ] && command -v tmux >/dev/null 2>&1; then
  # Inside a tmux session: report the current session name and window count.
  tmux_session="$(tmux display-message -p '#S' 2>/dev/null)"
  tmux_windows="$(tmux list-windows 2>/dev/null | wc -l | tr -d '[:space:]')"
  say "  [inside tmux] session: ${tmux_session:-unknown}, windows: ${tmux_windows:-?}"
  say "                detach with Ctrl-b d to keep work running. See ai/MOBILE_WORKFLOW.md"
elif command -v tmux >/dev/null 2>&1; then
  say "  [not in tmux] tmux is installed — start one before long jobs:"
  say "                tmux attach -t tablewise || tmux new -s tablewise"
else
  say "  [no tmux]     tmux not installed — long jobs are not connection-safe on mobile."
fi
hr

say "Reminder: read ai/AGENT_RULES.md and ai/CLI_ROLES.md before editing."
exit 0
