# Roadmap

Last updated: 2026-05-24 (USDA ingredient nutrient enrichment)

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
- [x] Save ingredient suggestions to Notion Ingredients without relations.
- [x] Add Notion schema diagnostics for active databases.
- [x] Add safe Meal Feedback -> Meals relation write support with fallback warning.
- [x] Analysis Framework v2: expanded OpenAI schema with numeric scores, minimal-change framing, cultural notes, shopping additions, prep notes, meal pairings, and cautions.
- [x] Display and edit all v2 fields in /analyze before save.
- [x] Persist concise v2 summary (verdict, scorecard, concerns, plate strategy, cautions) into Notion Notes without schema changes.
- [x] Add Canada-first household preference defaults.
- [x] Add recipe source metadata foundation with safe optional Notion persistence.
- [x] Add structured ingredient type foundation while preserving string compatibility.
- [x] Add future integration adapter folders for recipe parser, nutrition, Open Food Facts, grocery prices, and weather.
- [x] Add type foundations for AI analysis records, household recipe feedback, operational tags, and pantry items.
- [x] Add Recipe URL analysis support through the recipe-parser adapter with JSON-LD extraction and cleaned-page-text fallback.
- [x] Add typed approved source registry for nutrient data, clinical guidelines, public-health guidance, and crowdsourced packaged-food data.
- [x] Add safe health-guidance principles for diabetes-aware, PCOS-aware, and Canada's Food Guide-aligned analysis.
- [x] Document evidence-aware architecture in `docs/SOURCES.md`.
- [x] Add route-scoped USDA FoodData Central ingredient lookup endpoint.
- [x] Add Settings diagnostic panel for ingredient nutrient lookup.
- [x] Add explicit USDA -> Notion Ingredient enrichment endpoint that updates only existing compatible properties.
- [x] Add Settings diagnostic panel for lookup-only or lookup-and-update enrichment testing.

## Current Sprint

- [ ] Deploy Canada-centred foundation changes to Vercel and smoke-test the existing MVP paths.
- [ ] Deploy Recipe URL analysis support to Vercel and smoke-test with representative public recipe URLs.
- [ ] Rotate exposed OpenAI and Notion keys if not already completed.
- [ ] Deploy Analysis Framework v2 to Vercel and run full production smoke test.
- [ ] Verify `/analyze` v2 sections appear on live URL after analysis.
- [ ] Save a meal on live URL and confirm Notion `Notes` contains v2 summary.
- [ ] If optional source properties are added to Notion Meals, confirm manual saves populate them.
- [ ] Confirm `/meals` still loads after save on live URL.
- [ ] Verify Meal Feedback → Meals relation property is created in Notion and relation writes work in production.
- [ ] Test iPhone Safari Add to Home Screen flow on live URL.

## Next Up

- [ ] Harden Recipe URL analysis after real-site testing: consider jsdom + @mozilla/readability if the dependency tradeoff is worth it, improve SSRF protection with DNS checks, and record blocked/problematic domains.
- [ ] Plan a prompt/schema slice that can use source IDs and health-guidance principles without making medical claims.
- [ ] Add structured ingredient persistence behind the current ingredient suggestion flow.
- [ ] Decide how FoodData Central nutrient snapshots should relate to normalized ingredients without changing Notion schema prematurely.
- [ ] Manually add optional nutrient properties to Ingredients database and retest `/api/ingredients/enrich` with a real `FDC_API_KEY`.
- [ ] Add optional Meals Notion source fields manually or document the exact schema setup.
- [ ] Add a richer household recipe feedback UI/database slice using `HouseholdRecipeFeedback`.
- [ ] Add a persisted household preferences source before adding multi-household support.
- [ ] Add relation from Ingredients to Meals.
- [ ] Add meal detail view.
- [ ] Add better empty/error states where needed.
- [ ] Add optimistic refresh after saving to Notion.
- [ ] Add basic smoke tests for API validation.
- [ ] Tighten save-meal validator: stop defaulting missing v2 fields to 0/empty once backward compatibility is no longer needed.

## Future Ideas

- [ ] Weekly planning workflow.
- [ ] Meal templates.
- [ ] Household preference profile.
- [ ] Shopping list generation.
- [ ] Pantry-aware substitutions.
- [ ] Open Food Facts enrichment for Canadian grocery products.
- [ ] Canadian grocery price/flyer intelligence through adapters.
- [ ] Weather/context-aware planning for Halifax/NS seasons.
- [ ] Nutrition enrichment with estimates kept separate from canonical recipe data.
- [ ] Source-attributed analysis explanations with source IDs, confidence, and reviewed guidance language.
- [ ] Personalized planning using household feedback signals.
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
- [ ] save-meal route validator accepts v2 fields leniently (defaults scores to 0, strings to empty) for backward compatibility. Should be tightened once old saves are no longer a concern.
- [ ] Notion Notes field has a 2000-character hard limit; buildMealNotesSummary truncates at 1997 chars with ellipsis as a safety measure.
- [ ] Integration adapter interfaces are intentionally stubbed and may evolve once real providers are selected.
- [ ] Structured ingredient parsing is not implemented yet; only the compatible type/helper foundation exists.
