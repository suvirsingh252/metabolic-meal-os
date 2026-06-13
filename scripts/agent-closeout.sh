#!/usr/bin/env bash
#
# agent-closeout.sh — Tablewise AgentOps validation gate runner.
#
# Runs the fixed validation gate (lint -> typecheck -> test -> build) using ONLY
# existing npm scripts, plus an optional db:check. Each step degrades gracefully:
# if a script is not defined it is skipped, not failed. Paste the summary into
# ai/CLOSEOUT_CHECKLIST.md.
#
# This script does NOT commit, push, install dependencies, or touch secrets.
#
# Usage:
#   bash scripts/agent-closeout.sh           # lint, typecheck, test, build
#   bash scripts/agent-closeout.sh --db      # also run db:check (read-only)
#
# Exit code: 0 if every step that ran passed; 1 if any ran step failed.
#
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT" || { echo "Cannot cd to repo root"; exit 1; }

RUN_DB=0
for arg in "$@"; do
  case "$arg" in
    --db) RUN_DB=1 ;;
    *) echo "Unknown arg: $arg (ignored)";;
  esac
done

say() { printf '%s\n' "$*"; }
hr()  { printf '%s\n' "------------------------------------------------------------"; }

has_npm_script() {
  local name="$1"
  if command -v node >/dev/null 2>&1 && [ -f "$ROOT/package.json" ]; then
    node -e "process.exit(require('$ROOT/package.json').scripts?.['$name']?0:1)" 2>/dev/null
    return $?
  fi
  grep -q "\"$name\"[[:space:]]*:" "$ROOT/package.json" 2>/dev/null
}

declare -a SUMMARY
FAILED=0

# run_step <label> <npm-script-name>
run_step() {
  local label="$1" script="$2"
  hr
  if ! command -v npm >/dev/null 2>&1; then
    say ">> $label: SKIPPED (npm not installed)"
    SUMMARY+=("$label: skipped (no npm)")
    return 0
  fi
  if ! has_npm_script "$script"; then
    say ">> $label: SKIPPED (npm run $script not defined)"
    SUMMARY+=("$label: skipped (no script)")
    return 0
  fi
  say ">> $label: running 'npm run $script' ..."
  if npm run "$script"; then
    say ">> $label: PASS"
    SUMMARY+=("$label: pass")
  else
    say ">> $label: FAIL"
    SUMMARY+=("$label: FAIL")
    FAILED=1
  fi
}

hr
say "Tablewise AgentOps — closeout validation gate"
say "Repo: $ROOT"

run_step "lint"      "lint"
run_step "typecheck" "typecheck"
run_step "test"      "test"
run_step "build"     "build"

if [ "$RUN_DB" -eq 1 ]; then
  run_step "db:check" "db:check"
else
  hr
  say ">> db:check: not requested (pass --db to include; read-only)"
  SUMMARY+=("db:check: not requested")
fi

hr
say "Summary (copy into ai/CLOSEOUT_CHECKLIST.md):"
for line in "${SUMMARY[@]}"; do
  say "  - $line"
done
hr

if [ "$FAILED" -eq 0 ]; then
  say "Result: all executed steps passed."
  exit 0
else
  say "Result: one or more steps FAILED — do not close out until resolved."
  exit 1
fi
