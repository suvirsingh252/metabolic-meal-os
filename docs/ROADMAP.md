# Roadmap

Last updated: 2026-05-23

## Completed

- [x] Scaffold Next.js App Router app.
- [x] Add responsive dashboard shell.
- [x] Add routes: `/`, `/analyze`, `/meals`, `/feedback`, `/settings`.
- [x] Add typed server-side env config.
- [x] Add OpenAI meal analysis endpoint.
- [x] Wire `/analyze` to OpenAI analysis.
- [x] Make analysis results editable.
- [x] Save analyzed meals to Notion.
- [x] Add Notion diagnostics.
- [x] Load saved meals from Notion.
- [x] Log meal feedback to Notion.
- [x] Add persistent handoff documentation.
- [x] Push project to GitHub.
- [x] Deploy project to Vercel.
- [x] Configure production Vercel environment variables.
- [x] Verify production Notion diagnostics.
- [x] Add route-scoped environment validation helpers.
- [x] Add saved-meal selection to feedback logging.
- [x] Add PWA manifest, app metadata, placeholder icons, and iPhone layout polish.

## Current Sprint

- [ ] Rotate exposed OpenAI and Notion keys if not already completed.
- [ ] Deploy route-scoped environment validation, feedback meal selection, and PWA foundation to Vercel.
- [ ] Test public HTTPS URL from iPhone/mobile network after latest changes.
- [ ] Test iPhone Safari Add to Home Screen flow.
- [ ] Confirm Notion database schemas match current property mappings.

## Next Up

- [ ] Add relation from Meal Feedback to Meals.
- [ ] Save ingredient suggestions to Notion Ingredients.
- [ ] Add meal detail view.
- [ ] Add better empty/error states where needed.
- [ ] Add optimistic refresh after saving to Notion.
- [ ] Add basic smoke tests for API validation.

## Future Ideas

- [ ] Weekly planning workflow.
- [ ] Meal templates.
- [ ] Household preference profile.
- [ ] Shopping list generation.
- [ ] Pantry-aware substitutions.
- [ ] PWA offline shell.
- [ ] Authentication and household accounts.
- [ ] Migration from Notion to a dedicated database if needed.
- [ ] Provider abstraction for AI and storage.

## Technical Debt

- [ ] Rotate leaked keys and document completion if not already completed.
- [ ] Duplicate validation helpers exist across API routes.
- [ ] Duplicate enum select/boolean input components exist in client pages.
- [ ] Need reusable success alert/card patterns.
- [ ] Need automated tests for route validators.
- [ ] Need deployment smoke test script.
