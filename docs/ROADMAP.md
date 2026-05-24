# Roadmap

Last updated: 2026-05-24 (FoodData Central Matching Quality)

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
- [x] Add Evidence-Aware Analysis v3 fields to runtime analysis: evidence notes, confidence notes, safety disclaimer, and source/principle-linked guidance basis.
- [x] Wire approved source registry and health-guidance principles into analysis prompt context without adding medical claims or runtime USDA enrichment.
- [x] Display and edit Evidence-Aware Analysis v3 fields in `/analyze`.
- [x] Persist concise Evidence-Aware Analysis v3 summary into Notion Notes without schema changes.
- [x] Add best-effort known Ingredient context from Notion into meal analysis prompts without calorie/macro tracking or runtime USDA enrichment.
- [x] Add small `/analyze` indicator when known Ingredient context was used.
- [x] Verify Evidence-Aware Analysis v3 in production.
- [x] Verify Recipe URL analysis in production.
- [x] Verify `/analyze` ingredient persistence from the editable ingredient textarea in production.
- [x] Verify production `/api/notion/save-ingredients`, including duplicate prevention.
- [x] Verify Ingredients nutrient properties, USDA lookup, and page-ID-based USDA enrichment in production.
- [x] Verify V2 and V3 Notes summaries persist into Notion.
- [x] Verify production Meals loading and Feedback save.
- [x] Add read-only production smoke-test automation with `SMOKE_BASE_URL`.
- [x] Verify production smoke-test automation passes 9/9 against live Vercel URL.
- [x] Rotate previously exposed OpenAI and Notion keys.
- [x] Add `GET /api/notion/ingredients` for simplified Ingredient summaries.
- [x] Add Settings Ingredient picker/enrichment UX so selected Ingredients can be enriched without manual page ID copy/paste.
- [x] Preserve manual lookup-only enrichment mode when no Ingredient is selected.
- [x] Improve FoodData Central matching ranker to prefer suitable generic USDA data types over branded records.
- [x] Add richer FoodData Central matching notes and optional matching metadata.
- [x] Validate staple lookup cases: paneer, chickpeas, basmati rice, lentils, yogurt, atta flour, and whole wheat flour.

## Current Sprint

- [ ] Improve trust and quality for ingredient intelligence.
- [ ] Review FoodData Central matching quality on a larger household ingredient set.
- [ ] Review evidence-aware guidance quality on real household meals.
- [ ] Harden recipe parser robustness for representative recipe sites.
- [ ] If optional source properties are added to Notion Meals, confirm manual saves populate them.
- [ ] Verify Meal Feedback → Meals relation property is created in Notion and relation writes work in production.
- [ ] Test iPhone Safari Add to Home Screen flow on live URL.

## Next Up

- [ ] Add relation from Ingredients to Meals.
- [ ] Add structured ingredient persistence behind the current ingredient suggestion flow.
- [ ] Add meal detail view.
- [ ] Harden Recipe URL analysis after real-site testing: consider jsdom + @mozilla/readability if the dependency tradeoff is worth it, improve SSRF protection with DNS checks, and record blocked/problematic domains.
- [ ] Review Evidence-Aware Analysis v3 output quality on representative Indian, Atlantic Canadian, and mixed household meals.
- [ ] Review whether known Ingredient context improves protein/fiber and blood-sugar reasoning without becoming too numeric.
- [ ] Decide how FoodData Central nutrient snapshots should relate to normalized ingredients without changing Notion schema prematurely.
- [ ] Add optional Meals Notion source fields manually or document the exact schema setup.
- [ ] Add a richer household recipe feedback UI/database slice using `HouseholdRecipeFeedback`.
- [ ] Add a persisted household preferences source before adding multi-household support.
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

- [ ] Duplicate validation helpers exist across API routes.
- [ ] Duplicate enum select/boolean input components exist in client pages.
- [ ] Need reusable success alert/card patterns.
- [ ] Need automated tests for route validators.
- [ ] save-meal route validator accepts v2 fields leniently (defaults scores to 0, strings to empty) for backward compatibility. Should be tightened once old saves are no longer a concern.
- [ ] Notion Notes field has a 2000-character hard limit; buildMealNotesSummary truncates at 1997 chars with ellipsis as a safety measure.
- [ ] Integration adapter interfaces are intentionally stubbed and may evolve once real providers are selected.
- [ ] Structured ingredient parsing is not implemented yet; only the compatible type/helper foundation exists.
- [ ] Recipe parser remains dependency-free/basic and is not robust across every recipe site.
- [ ] FoodData Central matching is improved but remains heuristic and needs ongoing quality review.
