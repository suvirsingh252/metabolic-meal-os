# Roadmap

Last updated: 2026-05-25 (Session Closeout: Dashboard + Nutrition Persistence)

For a brand-new PM/chat, start with `docs/PM_HANDOVER.md` before using this roadmap.

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
- [x] Save ingredient suggestions to Notion Ingredients with duplicate prevention and optional schema-aware Meal relation writes.
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
- [x] Simplify `/analyze` review UI with a household-first summary and progressive disclosure for editable details.
- [x] Add `docs/PM_HANDOVER.md` as a concise start-here package for a new PM/chat.
- [x] Tune `/analyze` first-screen meal guidance toward plain household language, culturally preserving same-dish nudges, shorter evidence/confidence notes, and mobile scroll/focus to the result.
- [x] Add schema-aware Ingredient -> Meal relation support during ingredient suggestion persistence, including duplicate Ingredient relation updates and non-blocking missing-schema warnings.
- [x] Harden `/analyze` shared URL intake with source classification, tracking-param cleanup, short/social/video link handling, bounded metadata/page-text extraction, and clear caption/transcript fallback messages.
- [x] Add beta-safe private deployment/token guardrails, request-size limits, and route-level rate limits for high-risk API paths.
- [x] Harden recipe URL import with DNS-based private/reserved IP rejection and manually checked redirects.
- [x] Add canonical nutrition provenance snapshots for FoodData Central mappings.
- [x] Stop writing plain nutrient values to Notion unless basis projection fields exist.
- [x] Tighten `save-meal` validation so missing v2/v3 generated fields fail explicitly.
- [x] Add pagination/search parameters to Meals and Ingredients APIs.
- [x] Add focused `npm test` coverage for ingredient normalization/matching, save validation, nutrition provenance, and recipe URL security.
- [x] Fully extract meal-analysis v1 prompt/schema/model/source-context/parsing/fallback/service out of the API route.
- [x] Refactor `/analyze` into reducer, hook, and component sections without redesigning the UX.
- [x] Add configured household ownership metadata and Notion projection/filtering where schema supports it.
- [x] Abstract rate limiting behind a provider interface with a memory implementation.
- [x] Document SSRF socket/IP pinning limitation and keep defensive mitigations explicit.
- [x] Add Dashboard Behavioral Intelligence slice with `/api/dashboard`, `DashboardViewModel`, daily/weekly aggregation, rule-based insights, recent meals, and dashboard UI.
- [x] Add configurable dashboard targets for calories, protein, fiber, and sodium.
- [x] Add meal-level nutrition persistence v1 for recipe JSON-LD nutrition facts and user-entered review totals.
- [x] Add editable nutrition totals in the `/analyze` review flow.
- [x] Add meal quality v1 scoring and dashboard quality surfaces.
- [x] Add legacy scorecard read-time quality backfill for saved meals without exact nutrition totals.

## Current Sprint

- [x] Improve trust and quality for ingredient intelligence.
- [ ] Review FoodData Central matching quality on a larger household ingredient set.
- [x] Review evidence-aware guidance quality on representative real household meals and tune the first household answer.
- [ ] Audit remaining household UX flows for clarity, mobile readability, and supportive tone.
- [x] Harden recipe parser robustness for first-pass representative recipe and social/shared URL intake.
- [ ] Continue real-world recipe/social URL testing and record domains that are blocked, login-gated, or script-rendered.
- [ ] If optional source properties are added to Notion Meals, confirm manual saves populate them.
- [ ] If optional nutrition and quality properties are added to Notion Meals, confirm new saves populate them.
- [ ] Verify Meal Feedback → Meals relation property is created in Notion and relation writes work in production.
- [ ] Test iPhone Safari Add to Home Screen flow on live URL.

## Next Up

- [ ] Add structured ingredient persistence behind the current ingredient suggestion flow.
- [ ] Add a Notion schema checklist/migration path for explicit nutrition and quality fields, then an operator-triggered backfill job for legacy score fields.
- [ ] Add meal detail view.
- [ ] Harden Recipe URL analysis further after more real-site testing: consider jsdom + @mozilla/readability if the dependency tradeoff is worth it, add socket-level IP pinning if needed, and record blocked/problematic domains.
- [ ] Review whether known Ingredient context improves protein/fiber and blood-sugar reasoning without becoming too numeric.
- [x] Decide first-pass FoodData Central nutrient provenance model with explicit per-100g basis and source metadata.
- [ ] Add optional Meals Notion source fields manually or document the exact schema setup.
- [ ] Add optional Meals Notion nutrition and quality fields manually, then verify `/api/dashboard` and new saves use them.
- [ ] Add a richer household recipe feedback UI/database slice using `HouseholdRecipeFeedback`.
- [ ] Simplify `/feedback`, `/meals`, and `/settings` flows after the `/analyze` hierarchy pass.
- [ ] Add a persisted household preferences source before adding multi-household support.
- [ ] Add better empty/error states where needed.
- [ ] Add optimistic refresh after saving to Notion.
- [x] Add basic unit tests for API/domain validation.
- [x] Tighten save-meal validator: stop defaulting missing v2 fields to 0/empty.

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
- [ ] Replace beta token/private-mode guardrails with full household authentication and ownership checks.
- [ ] Server-side persisted nutrition targets.
- [ ] Household-level analytics after auth/tenancy exists.
- [ ] Predictive coaching or ML only after reliable nutrition/feedback data exists.
- [ ] Add real model-quality golden fixtures/evals beyond parser/schema unit tests.
- [ ] Migration from Notion to a dedicated database if needed.
- [ ] Provider abstraction for AI and storage.

## Technical Debt

- [ ] Duplicate validation helpers exist across API routes.
- [ ] Duplicate enum select/boolean input components exist in client pages.
- [ ] Need reusable success alert/card patterns.
- [ ] Need broader integration tests for API route validators and Notion adapter behavior.
- [ ] Notion Notes field has a 2000-character hard limit; buildMealNotesSummary truncates with an explicit marker as a safety measure.
- [ ] Integration adapter interfaces are intentionally stubbed and may evolve once real providers are selected.
- [ ] Structured ingredient parsing is not implemented yet; only the compatible type/helper foundation exists.
- [ ] Recipe parser remains dependency-free. It now handles shared/social intake more gracefully, but it is still not as robust as a full Readability parser and cannot access blocked captions/transcripts.
- [ ] FoodData Central matching is improved but remains heuristic and needs ongoing quality review.
- [ ] The `/analyze` review UI has a first hierarchy pass, but the rest of the app still needs household UX simplification.
- [ ] Dashboard targets are client-side only and need persisted user/household settings later.
- [ ] Legacy nutrition and quality backfill is read-time only; no Notion write-back migration exists yet.
