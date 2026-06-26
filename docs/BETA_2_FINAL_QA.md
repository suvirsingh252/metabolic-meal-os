# Beta 2 Final QA

Last updated: 2026-06-26

Purpose: track the remaining Beta 2 production and mobile closeout gates without
starting Beta 3 feature work.

Status markers:
- Not run
- Pass
- Fail
- Blocked

## Scope Boundaries

- Do not start Beta 3 feature work.
- Do not change core app behavior unless fixing a clear QA bug.
- Do not start a Notion-to-Postgres migration.
- Do not add recipe import features.
- Do not run write-producing production smoke unless it is explicitly approved,
  disposable, and cleanup-safe.

## Automated Coverage Inventory

| Check | Command | Status | Notes |
|---|---|---|---|
| Local lint | `npm run lint` | Pass | Passed 2026-06-26. Safe; no external services. |
| Local typecheck | `npm run typecheck` | Pass | Passed 2026-06-26. Safe; no external services. |
| Unit tests | `npm test` | Pass | Passed 2026-06-26: 492/492 tests. Safe; no external services. |
| Production build | `npm run build` | Pass | Passed 2026-06-26. Safe; reads local env during build. |
| Read-only production smoke | `SMOKE_BASE_URL=<production-url> npm run smoke:prod` | Blocked | Not run 2026-06-26 because `SMOKE_BASE_URL` is not set. Script is read-only: pages, manifest, diagnostics, and USDA lookup. No OpenAI calls and no Notion writes. |
| Write-flow production smoke | `SMOKE_BASE_URL=<production-url> SMOKE_WRITE_TEST=1 npm run smoke:prod:writes` | Blocked | Creates disposable Notion Meals, Ingredients, and Meal Feedback records. It prints manual cleanup instructions but does not clean up automatically, so do not run without explicit operator approval and cleanup plan. |
| Analyze reliability smoke | `SMOKE_BASE_URL=<production-url> npm run smoke:analyze-reliability` | Blocked | Calls production `/api/analyze-meal`, can invoke OpenAI, and does not save records. Useful for URL recovery QA, but not read-only from a provider-cost perspective. |

## Production Route QA

Use the deployed production URL:
`https://metabolic-meal-os.vercel.app`.

| Area | Status | Notes |
|---|---|---|
| `/` loads after auth and shows the current primary household experience. | Not run | Confirm no unauthenticated access if production auth is enabled. |
| `/` primary cards/actions fit mobile and desktop without horizontal overflow. | Not run | Check 390px width and normal desktop. |
| `/analyze` loads and accepts pasted meal text. | Not run | Do not save unless running write-flow QA. |
| `/analyze` URL flow handles a public recipe URL or shows recoverable fallback copy. | Not run | OpenAI call may incur cost. |
| `/analyze` save flow persists a reviewed meal. | Blocked | Write-producing; needs explicit disposable record and cleanup plan. |
| `/meals` loads saved meals. | Not run | Confirm cards/titles are tappable on mobile. |
| Representative `/meals/[id]` loads from a real saved meal. | Not run | Select a known meal from `/meals`; verify cookbook content and advanced details. |
| Representative `/meals/[id]` image state is correct. | Not run | Verify Blob-backed image, pending image, failed image, or placeholder state is clear. |
| `/planner` loads Monday-Sunday Lunch and Dinner slots. | Not run | Confirm current week and no missing-table/missing-column errors. |
| `/planner` Lunch/Dinner save persists independently for the same day. | Blocked | Write-producing Postgres operation; use an approved test slot and restore/clear after. |
| `/planner` duplicate, clear, and suggestion replacement flows work. | Blocked | Write-producing; use approved test plan state. |
| `/grocery` loads and can generate from selected meals or planner. | Blocked | Write-producing when saving generated lists. Use disposable/generated list and cleanup expectations. |
| `/grocery` saved list can reopen and checklist state persists. | Blocked | Write-producing persisted checklist state. |
| `/dashboard` loads household takeaways and nutrition/quality summaries. | Not run | Confirm sparse-data copy is cautious. |
| `/feedback` loads and saved-meal selection works. | Not run | Do not submit unless running write-flow QA. |
| `/feedback` submission creates Meal Feedback and relation when schema supports it. | Blocked | Write-producing; requires disposable feedback and Notion relation/schema verification. |
| `/settings` loads diagnostics. | Not run | Confirm Notion diagnostics and schema diagnostics are readable. |
| `/settings` Notion relation/schema diagnostics are reviewed. | Not run | Required for the Notion relation/schema gate. |

## iPhone Safari QA

Run on physical iPhone Safari against the production HTTPS URL.

| Area | Status | Notes |
|---|---|---|
| Auth gate redirects unauthenticated browser to `/login`. | Not run | Verify production does not fail open. |
| Login succeeds with `APP_AUTH_TOKEN` and persists session cookie. | Not run | Confirm refresh and new tab stay authenticated. |
| Bottom navigation is visible, tappable, and not obscured by Safari chrome. | Not run | Check portrait orientation. |
| No page-level horizontal overflow on `/`, `/analyze`, `/meals`, representative `/meals/[id]`, `/planner`, `/grocery`, `/dashboard`, `/feedback`, and `/settings`. | Not run | Test by dragging horizontally and checking clipped text/buttons. |
| `/planner` Lunch and Dinner slots are readable and independently save. | Blocked | Write-producing; use approved test day/slot and restore state. |
| `/grocery` can generate a list, reopen it, and check off an item. | Blocked | Write-producing; use disposable list. |
| `/analyze` pasted text flow reaches review state. | Not run | OpenAI call may incur cost. |
| `/analyze` recipe URL flow succeeds or gives recoverable fallback. | Not run | Use representative URL. |
| Save meal flow works from iPhone review screen. | Blocked | Write-producing; requires disposable meal and cleanup plan. |
| Saved meal detail opens from save success and displays cookbook/image state. | Blocked | Depends on save meal write-flow QA. |
| Existing meal detail image state renders correctly. | Not run | Use known real meal with Blob-backed image if available. |
| Add to Home Screen creates app icon with Hearth branding. | Not run | Use Safari Share -> Add to Home Screen. |
| Home-screen launch uses standalone display and expected app icon/splash behavior. | Not run | Confirm manifest/icon paths work behind auth. |

## Write-Flow Verification Plan

The write-flow gate is not closed by read-only smoke. Close it only after one of
these is completed:

| Option | Status | Notes |
|---|---|---|
| Manual disposable production write QA | Not run | Create a named disposable meal, ingredient relation, feedback record, planner assignment, and grocery list; verify them; then delete/restore manually. |
| `npm run smoke:prod:writes` with explicit opt-in | Blocked | Requires `SMOKE_BASE_URL` and `SMOKE_WRITE_TEST=1`; creates disposable Notion records and lacks automatic cleanup. |

Minimum write-flow evidence to record:
- saved meal page ID/URL,
- ingredient save response counts and relation behavior,
- feedback page ID/URL and relation behavior,
- planner Lunch/Dinner persisted independently,
- grocery list reopened and checklist state persisted,
- cleanup actions completed.

## Notion Relation/Schema Verification Plan

Use `/settings` and `/api/diagnostics/notion-schemas` in production.

| Schema item | Status | Notes |
|---|---|---|
| Meals database is reachable and shared with integration. | Not run | Required for saved meal archive. |
| Ingredients database is reachable and shared with integration. | Not run | Required for ingredient persistence. |
| Meal Feedback database is reachable and shared with integration. | Not run | Required for feedback writes. |
| Ingredients -> Meals relation exists and targets Meals. | Not run | Required for relation write verification. |
| Meal Feedback -> Meals relation exists and targets Meals. | Not run | Required for feedback relation verification. |
| Optional Meals nutrition/source/quality properties are compatible or documented as absent. | Not run | Diagnostics should distinguish warnings from blockers. |
| Optional Meal Intake storage schema is compatible if enabled. | Not run | Required only when `NOTION_MEAL_INTAKE_DATABASE_ID` is configured. |

## Gate Summary

| Gate | Status | Notes |
|---|---|---|
| Migration runbook and repo hygiene | Pass | Closed by commit `258f66c72e31ba544383edd4aa7763853ef1363f`. |
| Mobile QA | Not run | This document defines the checklist; physical iPhone Safari pass still required. |
| Write-flow verification | Blocked | Requires explicit disposable production write and cleanup plan. |
| Notion relation/schema verification | Not run | Requires production `/settings` or schema diagnostics review. |
| Beta 3 start | Blocked | Do not start until all Beta 2 gates pass. |
