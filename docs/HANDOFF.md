# Metabolic Meal OS Handoff

Last updated: 2026-06-13 (Postgres Phase 1 foundation; Notion pagination hardening)

For a brand-new PM/chat with no prior context, start with `docs/PM_HANDOVER.md`, then read this file, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, and `docs/NOTION_SCHEMA_CHECKLIST.md`. This remains the detailed engineering resume document for future Codex sessions. Keep it current.

## Current Project Status

Metabolic Meal OS is a production-oriented MVP Next.js app for household meal optimization. It remains a private/beta household tool, not a publicly hardened multi-tenant product.

### Current QA Status (2026-06-13 Postgres Phase 1 + Notion pagination hardening)

Local validation gate (post Phase 1 commit):
- `npm run lint`: passed (clean).
- `npm run typecheck`: passed (clean).
- `npm test`: passed, 369/369 tests.
- `npm run build`: passed; 28 routes, route inventory unchanged.

No live database was touched in Phase 1. `drizzle-kit generate` ran locally to produce the migration SQL; `drizzle-kit migrate` has not been run yet.

### QA Status (2026-06-13 Beta 6 QA Closeout — prior baseline)

Local validation gate, run against `main` including the guided-recovery change (`ce7dc0d`, committed locally mid-session by the user, not yet pushed):
- `npm run typecheck`: passed (clean).
- `npm run lint`: passed (clean).
- `npm test`: passed, 358/358 tests across 41 files.
- `npm run build`: passed; 28 routes generated, matching the route inventory below.

This was a documentation/QA closeout: no runtime behavior was changed. Docs were verified against the code for routes, API endpoints, auth/open-mode, intake/Instagram recovery, nutrition estimation, feedback, planner, Cook Again Loop, saved-meal intelligence summary, and save continuity, and found accurate.

Security audit reconciliation after that closeout found the blanket B1–B7 OPEN language was stale. As of `main` at `a4c03d2`, B1, B2, B3, B4, and B6 are fixed and B7 is reworked. B5 was then closed by the 2026-06-13 consolidation pass: the remaining Notion-context helper duplicates (`isRecord`, `validationError`, `getNotionPageUrl`, `getPrimaryDataSourceId`) across `log-feedback`, `save-ingredients`, `ingredients/enrich`, `ingredients/lookup`, `intake/share`, `notion/ingredients`, and the `meals-query`/`meal-plan`/`ingredient-context`/`feedback-summary` lib modules now import from `src/lib/notion/route-helpers.ts`, with per-call error strings preserved and new `tests/notion-route-helpers.test.ts` coverage. Behavior is unchanged; validation stayed green (typecheck/lint clean, 366/366 tests, build clean). The only remaining `isRecord` copies are in non-Notion domain/AI/parser modules, intentionally not coupled to the Next-server helper module. See `docs/AUDIT-2026-06-11.md` for evidence and commit hashes.

In progress (committed locally as `ce7dc0d`, not yet pushed): `getUrlRecoveryCopy` in `src/app/analyze/components/status-banner.tsx` plus `tests/analyze-guided-recovery.test.ts` — the first step of the Beta 6.6 URL Recovery slice (see Immediate Next Tasks).

Production verified:
- Public Vercel deployment exists and is live.
- Previously exposed OpenAI and Notion keys have been rotated.
- Evidence-Aware Analysis v3 is deployed and functioning in production.
- Recipe URL analysis works in production.
- `/analyze` save flow persists ingredient suggestions from the editable ingredient textarea.
- `/api/notion/save-ingredients` works in production, including duplicate prevention.
- Local validation confirms `/api/notion/save-ingredients` can write Ingredient -> Meal relations when the active Ingredients data source has a compatible relation property pointing to Meals.
- Ingredients database nutrient properties exist.
- USDA lookup works in production.
- USDA enrichment works when a valid Ingredient page ID is provided.
- V2 and V3 Notes summaries persist correctly into Notion.
- Meals load correctly from production.
- Feedback save works.
- PWA manifest/mobile shell exists.
- Canada-centred defaults are implemented.
- Known Ingredient context indicator exists in `/analyze`.
- Read-only production smoke-test automation exists and passes against the live Vercel URL.

Implemented:
- Responsive dashboard shell and route navigation.
- Dashboard Behavioral Intelligence slice: `/` and `/dashboard` now load `/api/dashboard`, render daily nutrition snapshot cards, weekly summaries, rule-based insights, recent meals, and meal quality summaries from a stable `DashboardViewModel`.
- Dashboard analytics domain layer under `src/lib/domain/analytics`, with pure aggregation, insight, target-progress, meal-quality, and view-model builders.
- Configurable dashboard targets for calories, protein, fiber, and sodium. Current target preferences are client-side only and passed to `/api/dashboard`; there is no persisted user settings backend yet.
- Recipe/meal analysis via OpenAI structured outputs.
- Editable analysis review form.
- Save analyzed meals to the Notion Meals database.
- Notion diagnostics from Settings.
- Meals list loaded from the Notion Meals database.
- Meal feedback logging to the Notion Meal Feedback database.
- Saved-meal selection on feedback form, with manual entry fallback.
- Today is the root experience at `/`; `/dashboard` remains available.
- Meal Detail is available at `/meals/[id]`, and Today/Meals cards link internally to it.
- Today and Meal Detail feedback actions save through the existing Notion feedback API, update visible household feedback summaries optimistically, and refresh server data when practical.
- Today shows a compact Recent Household Learning strip derived from existing feedback summaries.
- Today feedback undo is client-side only. It restores the local Today view and learning strip but does not delete or reverse persisted feedback history.
- Today recommendations now use Adaptive Recommendation Engine v1: deterministic component scoring from saved meal metadata and existing household feedback summaries, with preference score, recency score, variety penalty, saved scheduling metadata score, and expandable `Why this meal?` explanations.
- Beta 3 usability closeout: normal household flows now use Meal OS language instead of Notion-facing copy. Analyze says `Save meal` / `Saved to Meal OS`, Meals describes saved meals, Feedback uses Meal OS success copy, and external saved-record links are only under Advanced details where kept.
- Beta 3.5 functional audit: local end-to-end verification found and fixed a critical nutrition persistence bug. `save-meal` now reads the active Meals data source before optional writes, so compatible nutrition/source/quality fields persist and dashboard aggregation reflects them.
- Beta 3.5 verified known meal lifecycle: Analyze generated `755 kcal`, `26 g protein`, `15 g fiber`, `medium` confidence, `estimated` source, and provenance; after Save, Notion retrieval returned the same nutrition fields and `/api/dashboard` counted them in today/week totals.
- Beta 3.5 mobile hardening: Today `Suggest Another` rotates through alternatives after temporary exclusions exhaust, recommendation copy no longer treats repeated saved records as feedback success, and Meals title links have block-level mobile tap targets.
- Beta 3.6 iPhone Share Intake: `POST /api/intake/share` accepts iOS Shortcut POSTs with `IOS_SHORTCUT_TOKEN` bearer auth, classifies URL/text as `recipe-url`, `social-url`, `plain-text`, or `unknown-url`, persists intake to optional Notion Meal Intake database, and returns `analyzeUrl` with intake page ID. `/analyze?intake=<id>` loads the intake record server-side and shows an amber bridge panel with classification, source, preview, and social fallback copy. The `AnalyzeClient` is pre-filled with the URL or text. The middleware was updated to accept `IOS_SHORTCUT_TOKEN` specifically for the intake path.
- Weekly Planner v1.1: `/planner` loads the current Monday-Sunday plan from a dedicated Notion Meal Plan data source, shows Breakfast, Lunch, Dinner, and Snack slots, offers saved Meals as assignment options, can clear a planned meal, and can mark `Planned`, `Cooked`, `Skipped`, or `Swapped`. Writes are keyed by date plus slot so same-day meals do not overwrite each other. Missing planner config or schema gaps show safe diagnostics and block writes without crashing. Prefer `NOTION_MEAL_PLAN_SOURCE_ID`; `NOTION_MEAL_PLAN_DATABASE_ID` remains a fallback.
- Beta 5 Family Cookbook: `/meals/[id]` is now cooking-first. It starts with Make This Again, Ate This, Loved It, Add to Planner, then `How We Make It`, structured Ingredients, large mobile Instructions, Original Recipe access, Nutrition, and Advanced details. Family adjustments are stored as marked feedback notes and layered over source recipe data without overwriting the original recipe.
- Beta 5.1 Cookbook Data Capture Hardening: newly analyzed and saved meals reliably persist Source URL, verbatim ingredients, and instructions. Parser-extracted recipe content is canonical; AI `extractedIngredients`/`extractedInstructions` are a verbatim-copy fallback for pasted text. Persistence uses canonical `Ingredients:`/`Instructions:` Notes sections (zero schema change) plus optional dedicated rich_text properties, with Notes chunked past the single 2000-character block. The household `Original Source` url property is now a recognized Source URL alias on save and reload. See `docs/ARCHITECTURE.md` "Cookbook Data Pipeline".
- Notion schema hardening: Meals household filtering checks the active data source for `Household ID`, new saves write `Meal Date` when compatible, and schema diagnostics now check Feedback Meal relations, Ingredients Meal relations/nutrient basis fields, and optional Meal Intake storage fields. `Energy Density Score` and `Processing Score` remain read/backfill-only and are documented in `docs/NOTION_SCHEMA_CHECKLIST.md`.
- Beta 6.1 Analyze Optimization: after a completed analysis, `/analyze` shows four optimization buttons — More Protein, Healthier, Kid-Friendly, and Budget. Each calls `POST /api/optimize-meal` lazily on first click, is cached per analysis in reducer state, and is cleared when a new analysis starts. Backed by a versioned `src/lib/ai/meal-optimization/v1` module (config, prompt, strict JSON schema, parser, service) with its own rate limit. No Notion schema changes.
- Beta 6.2 Cook Again Loop v1: Meal Detail's existing Add to Planner button deep-links to `/planner?meal=<id>`; the planner reads the query param and preselects that meal into the matching slot (by Meal Type, defaulting to Dinner) on the default day, with a guidance banner. After assigning, Meal Detail shows a lightweight planning-context badge — "Planned for Tuesday dinner", "Cooked — ...", "Skipped — ...", or "Not planned this week" — fetched in parallel with the meal detail and degrading gracefully when the planner is not configured. The status path remains the existing Planned / Cooked / Skipped buttons. No Notion schema changes.
- Beta 6.3 Save Continuity (`f49d023`): Analyze save success now routes users into Meal OS instead of treating Notion as the destination. The primary CTA is `View saved meal`, the secondary CTA is `Add to Planner`, and Notion links moved to a secondary/advanced position. This addressed family feedback that Save felt like an endpoint instead of continuity.
- Beta 6.4 Saved Intelligence Summary (`8be7817`): Meal Detail now shows a first-class `Meal OS Summary` with Quick Verdict, Why It Works, Minimal Change / Optimization, Nutrition Confidence, and Family Consideration. It reuses existing persisted Notes, optimized version, nutrition metadata, recommendation reasons, and feedback summaries; it adds no new storage architecture, AI call, or required Notion property. This addressed the expectation that Analyze intelligence should stay attached to saved meals.
- Beta 6.5 Nutrition Reliability v1 (`9a04047`): structured recipe nutrition still wins, but when it is unavailable Analyze can now estimate calories, protein, and fiber from parsed recipe ingredients and social-normalized ingredient lists. The deterministic estimator's common-food coverage expanded, provenance remains `estimated`, and manual entry stays optional. This addressed the family complaint that manual nutrition entry was too tedious and often skipped.
- Social intake normalization (parallel share-intake hardening; landed outside the approved Beta 6 PR sequence): a dedicated `src/lib/intake/source-classifier.ts` classifies pasted/shared input (TikTok, Instagram, YouTube/Shorts/youtu.be, Pinterest, Facebook, recipe pages, plain text), and a new versioned `src/lib/ai/social-recipe-normalization/v1` module can normalize caption/transcript-style social text into recipe candidates with confidence labels. Analyze input/status/evidence UI reflects the detected source, and a social fallback path re-attaches source URL metadata when users paste caption text after a social link fails. No Notion schema changes.
- Analyze now has staged loading copy for long analysis runs and tells users detailed meals can take about 20-30 seconds.
- Feedback quick actions now have explicit semantics: `Ate This` logs eaten only, `Loved It` logs eaten/loved/worth repeating, and Meal Detail `Would Make Again` is repeat-only in household summaries.
- Dashboard starts with household takeaways before detailed metrics and keeps data coverage/source diagnostics behind Advanced data coverage.
- Meal Detail is the family cookbook surface: quick cooking actions first, then `How We Make It`, ingredients, instructions, original recipe access, nutrition, and advanced metadata.
- Ingredient suggestion persistence to Notion Ingredients after meal save. The production `/analyze` flow saves from the editable ingredient textarea, duplicate detection works, and the local code now relates new or duplicate Ingredients back to the saved Meal when a compatible Notion relation property exists.
- Notion schema diagnostics for Meals, Ingredients, and Meal Feedback from Settings.
- PWA foundation with app metadata, manifest, placeholder SVG/PNG icons, and iPhone-friendly layout polish.
- Typed server-side environment configuration.
- Analysis Framework v2: expanded OpenAI structured output with numeric scores, minimal-change framing, cultural notes, shopping additions, prep notes, meal pairings, and cautions. All v2 fields are editable in /analyze before save. Notion Notes field stores a concise v2 summary without schema changes.
- Canada-centred foundation types: household defaults are CA/NS/Halifax, mixed units, CAD, Celsius, and preferred stores.
- Recipe source metadata foundation: `sourceType`, `sourceUrl`, `sourceName`, `importedAt`, `lastParsedAt`, and `parserVersion`.
- Structured ingredient foundation: `RecipeIngredient` and Beta 5 `CookbookIngredient` support raw text, parsed name, quantity, and unit while preserving string compatibility.
- Adapter directories exist for future Open Food Facts, nutrition, recipe parser, grocery prices, and weather integrations.
- Recipe/shared URL analysis support: `/analyze` accepts normal recipe URLs, shortened/shared URLs, TikTok links, Instagram Reels, YouTube Shorts, and pasted text in the existing input. `/api/analyze-meal` classifies the source, fetches safely server-side through the recipe-parser adapter, prefers Recipe JSON-LD when present, falls back to bounded metadata/page text, and returns source metadata plus source notes with the analysis.
- Recipe JSON-LD nutrition extraction: when a recipe page exposes structured nutrition facts, the parser carries meal-level totals into `nutritionEstimate` with confidence and provenance. Structured nutrition remains preferred over estimates.
- Good Enough Nutrition Estimation v1 plus Serving Size Controls v1: manual/free-text meal descriptions with recognizable components can produce conservative `nutritionEstimate.source: estimated` values for calories, protein, and fiber only. The estimator parses simple quantities, bowl phrases, large/small portions, household shorthand such as `2 rotis and dal`, `paneer wrap`, `rice and chicken`, `egg bhurji and toast`, `oats with yogurt`, `salad with chicken`, `leftover curry and rice`, and butter inclusion/exclusion; sodium, sugar, fat, and carbs stay blank/null unless a structured source or user review supplies them.
- Social/video link handling: the parser only uses accessible HTML/OpenGraph metadata and does not bypass platform protections. If TikTok, Instagram, YouTube Shorts, or similar links do not expose enough recipe-like detail, the API returns a clear fallback asking for a caption, transcript, ingredients, or spoken recipe summary instead of calling OpenAI.
- Household recipe feedback, AI analysis, pantry item, operational tag, and localization types are present for future workflows.
- Evidence-aware foundation: static approved source registry and safe health-guidance principles for diabetes-aware, PCOS-aware, and Canada's Food Guide-aligned future analysis.
- Evidence-Aware Analysis v3: runtime meal analysis now uses the approved source registry and health-guidance principles to produce evidence notes, confidence notes, a safety disclaimer, and source/principle-linked guidance basis. V3 fields are production-active, editable in `/analyze`, and summarized into Notion Notes without schema changes.
- Ingredient-aware analysis context: `/api/analyze-meal` now does a best-effort read of matching known Ingredients from Notion before the OpenAI call and adds a compact "Known household ingredient context" block when matches exist. This can include household flags, nutrient confidence, FDC description, and ingredient-level protein/fiber/carbohydrate/energy hints already stored in Notion.
- USDA FoodData Central ingredient lookup foundation: server-side `/api/ingredients/lookup` route, scoped `FDC_API_KEY`, normalized nutrient snapshot mapper, and Settings diagnostics panel.
- Meal-level nutrition persistence v1: reviewed meals can carry calories, protein, carbs, fat, fiber, sodium, sugar, confidence, provenance, and source. `/analyze` exposes editable nutrition totals in the review flow, labels structured, estimated, user-edited/manual, and unavailable states distinctly, shows matched estimate assumptions, offers coarse serving multiplier controls (`0.5x`, `1x`, `1.5x`, `2x`) plus add/remove butter when relevant, and `save-meal` writes compatible Notion properties when they already exist.
- Visual/mobile estimate hardening: estimate assumption badges wrap, serving buttons use larger mobile tap targets, dashboard chips/cards avoid truncating important state, and repeated serving/butter review actions replace stale provenance notes.
- Meal quality v1: rule-based quality scoring considers protein density, fiber density, sodium load, sugar load, ingredient diversity, and minimally processed signal where available. Existing meals without exact nutrition can receive read-time quality backfill from legacy scorecards in Notion Notes.
- Nutrition + quality reliability v1: saved Meals now get conservative read-time metadata backfill from existing Notion fields and legacy Notes when evidence exists. Backfill can infer quality score, protein/fiber/energy density/processing scores, nutrition source, provenance, and confidence, but never invents precise nutrition totals and never overwrites explicit values.
- Dashboard data confidence indicators: `/dashboard` now shows weekly source mix, missing nutrition count, backfilled record count, nutrient completeness sample sizes, and quality sample-size labels. Weekly quality and best/opportunity callouts require enough scored meals to avoid overstating one-record summaries.
- Meals schema health check: `/api/diagnostics/notion-schemas` evaluates optional Meals nutrition, provenance, quality, and Meal Date fields; `/settings` surfaces non-blocking warnings for missing or incompatible properties. The app still does not mutate Notion schema.
- Explicit USDA -> Notion ingredient enrichment endpoint: `/api/ingredients/enrich` can lookup only or lookup and update an Ingredient page when compatible Notion properties already exist.
- FoodData Central matching quality improvements: lookup now fetches preferred generic USDA data types more robustly, ranks Foundation/SR Legacy/Survey ahead of Experimental and Branded where suitable, penalizes prepared/flavored/plain-staple mismatches, adds limited query expansion for paneer and atta, and returns optional match metadata explaining the selected data type and fallback reason.
- Ingredient picker/enrichment UX: Settings loads existing Notion Ingredients, lets the user select an Ingredient by name, and enriches the selected page without manual Notion page ID copy/paste. Manual lookup-only mode remains available when no Ingredient is selected.
- Production smoke-test script: `npm run smoke:prod` runs `scripts/smoke-test.ts` against `SMOKE_BASE_URL` and verifies read-only production health checks without OpenAI calls or Notion writes.
- `/analyze` household review UX first pass: analysis results now start with a practical household summary, then keep editable details in progressively disclosed sections for guidance, quick edits, deeper tuning, shopping/prep, scores, evidence/safety, and advanced saved fields.
- `/analyze` household-tone tuning: first-screen analysis fields now steer toward plain household language, same-dish minimal nudges, culturally realistic Indian rice/starch guidance, shorter evidence/confidence notes, and less clinical phrasing. After analysis completes, the client scrolls/focuses the review result and the household summary is slightly tighter on mobile.
- PM handover package: `docs/PM_HANDOVER.md` is the concise start-here document for a new PM/chat.

Not implemented yet:
- Full user-account authentication and household RBAC. Beta token/private-mode guardrails are implemented.
- Dedicated per-meal structured ingredient persistence beyond parsed cookbook display and normalized suggestions.
- AI-generated weekly planning, grocery lists, drag-and-drop planning, and meal-slot-specific recommendation generation.
- Meal template workflows.
- Service worker/offline PWA support.
- Full settings persistence UI.
- Server-side persisted user nutrition targets.
- Full pantry management.
- Live Open Food Facts, nutrition, grocery price, flyer, or weather API integrations.
- Persistence for structured ingredients, pantry items, household preferences, or separate AI analysis records beyond current safe Notion meal-source writes.
- Automatic meal-level nutrition calculation from FoodData Central ingredient records. The app does not calculate serving-level totals from USDA ingredient records; automatic nutrition remains limited to structured recipe nutrition and deterministic calories/protein/fiber estimates from free text or parsed recipe ingredients with coarse beta-grade serving controls.
- Automatic USDA lookup/enrichment during meal analysis or ingredient suggestion persistence.
- Multi-household Notion partitioning.

Manual Vercel/Notion verification recommended after deploying the Beta 6.3-6.5 family-feedback cycle:
1. Analyze still saves meals successfully to Notion.
2. Save success shows `View saved meal` as the primary continuation and `Add to Planner` as secondary; Notion links are not the primary next step.
3. Newly saved meals with JSON-LD nutrition persist imported nutrition when compatible properties exist.
4. Newly saved meals without structured nutrition but with recognizable recipe ingredients persist estimated Calories, Protein, Fiber, Nutrition Source, Nutrition Provenance, and Nutrition Confidence when compatible properties exist.
5. `/api/notion/meals` retrieves those values and `/api/dashboard` aggregates them.
6. Saved meals appear in Meals with Meal OS wording, not Notion wording.
7. Meal Detail shows `Meal OS Summary` near the top with available Analyze-derived intelligence and omits unavailable rows gracefully.
8. Today feedback writes to Notion as expected.
9. `Ate This`, `Loved It`, and `Would Make Again` semantics appear correctly in saved feedback summaries.
10. Dashboard household takeaways update after feedback/data changes.
11. Mobile deployment has no horizontal overflow on Analyze, Today, Dashboard, Meals, Feedback, and Meal Detail.
12. Today `Suggest Another` works on phone-sized viewports for categories with alternatives.
13. No user-facing copy implies feedback can be persistently undone unless that feature is actually implemented.
14. `/planner` loads on the Vercel URL; with `NOTION_MEAL_PLAN_SOURCE_ID` configured, assign, clear, and status updates work for Breakfast, Lunch, Dinner, and Snack against the Meal Plan data source.

## Current Architecture

Stack:
- Next.js App Router with TypeScript.
- React client components where interactivity is needed.
- Tailwind CSS and local shadcn-style UI primitives.
- OpenAI SDK for meal analysis.
- Notion SDK for persistence.
- Vercel is the intended deployment target.

Code organization:
- `src/app`: App Router pages and API routes.
- `src/app/manifest.ts`: web app manifest for mobile/home-screen installs.
- `src/lib/ingredients`: ingredient normalization and deduplication helpers.
- `src/lib/env.ts`: typed server-only environment validation with route-scoped helpers.
- `src/lib/types`: shared app types.
- `src/lib/types/recipe.ts`: recipe source metadata, structured ingredient shape, and operational tags.
- `src/lib/types/localization.ts`: Canada-first household preference types and defaults.
- `src/lib/types/ai-analysis.ts`: separate AI-generated analysis record shape.
- `src/lib/types/pantry.ts`: lightweight pantry item foundation.
- `src/lib/integrations/*`: future API adapter boundaries. `recipe-parser` has a basic URL parser; the other adapters are currently stubs only.
- `src/lib/integrations/food-data-central/*`: server-side USDA FoodData Central client, types, and nutrient snapshot mapper.
- `src/lib/domain/meal`: shared meal validation.
- `src/lib/domain/nutrition`: canonical nutrition snapshot/provenance types, validation, and the small free-text calories/protein/fiber estimator.
- `src/lib/domain/analytics`: dashboard view-model, aggregation, insight, target-progress, and meal-quality scoring logic.
- `src/lib/domain/recommendations`: Today ranking, component scoring, explanation generation, reason badges, variety helpers, and Today view-model construction.
- `src/lib/ai/meal-analysis/v1`: first versioned AI config/response parser boundary.
- `src/lib/ai/meal-analysis/v1`: full versioned meal-analysis service boundary: config, prompt, schema, source context, request validation, recipe prep, parser, fallback, and service.
- `src/lib/server/request-guards.ts`: private deployment checks, bounded JSON parsing, and in-memory rate limiting.
- `src/lib/server/rate-limit`: rate limiter interface and memory provider.
- `src/app/analyze/reducer.ts`, `src/app/analyze/hooks`, `src/app/analyze/components`: maintainable `/analyze` client flow.
- `src/lib/sources/source-registry.ts`: typed approved source records with allowed/prohibited uses and confidence levels.
- `src/lib/health-guidance/*`: safe guidance principles and global health safety rules.
- `src/lib/household/preferences.ts`: default household preference access.
- `src/lib/notion`: Notion client, mappers, and page summary extraction.
- `src/lib/notion/meal-backfill.ts`: read-time historical metadata backfill for saved Meals.
- `src/lib/notion/schema-health.ts`: optional Meals schema health evaluation for Settings diagnostics.
- `src/lib/notion/meals-query.ts`: shared Notion Meals read path used by `/api/notion/meals` and `/api/dashboard`.
- `src/lib/notion/ingredient-context.ts`: best-effort read-only helper for matching known Ingredients and formatting lightweight household ingredient context for analysis prompts.
- `src/lib/notion/ingredient-summary.ts`: maps Notion Ingredient pages into simplified summaries for Settings picker/enrichment UX.
- `components`: reusable UI and layout components.
- `public/icons`: original placeholder PWA icon assets.

Architecture rule:
- Keep trusted canonical recipe fields separate from AI-generated analysis or enrichment. AI nutrition/substitution/grocery notes should land in `RecipeAiAnalysis`-style records until reviewed or deliberately promoted.
- Future external services must enter through `src/lib/integrations/*` adapters, not directly from pages/components.
- Canada-centred assumptions are first-class defaults, not scattered literals.
- Health-related analysis uses source IDs and safe-language principles from `src/lib/sources` and `src/lib/health-guidance`.
- The app must not diagnose diabetes or PCOS, claim treatment/cure/prevention, replace clinician/dietitian advice, or provide medication/supplement/fertility guidance.

## Current Routes

Pages:
- `/`: Today, with deterministic saved-meal suggestions, direct household reasons, `Why this meal?` explanations, quick feedback actions with explicit semantics, optimistic feedback summaries, Recent Household Learning, and client-only undo.
- `/dashboard`: dashboard intelligence surface, with household takeaways first, daily snapshot, configurable targets, quality summary, Advanced data coverage, insights, weekly trends, and recent meals.
- `/analyze`: paste recipe text or URL, call analysis API with staged loading copy, review a household-first summary, request optional optimization prompts (More Protein, Healthier, Kid-Friendly, Budget), edit progressively disclosed details, and save the meal.
- `/meals`: fetch and display saved meals with Meal OS wording and internal detail links.
- `/meals/[id]`: family cookbook detail with quick cooking actions, `How We Make It`, ingredients, mobile cooking instructions, original recipe access, nutrition, advanced details, and a weekly planning-context badge (Planned/Cooked/Skipped for this week, or "Not planned this week") when the planner is configured. Add to Planner deep-links to `/planner?meal=<id>`.
- `/planner`: weekly planner; accepts a `?meal=<id>` query param to preselect that meal into the matching slot for assignment.
- `/feedback`: select a saved meal or enter a manual meal name, then log post-meal feedback with Meal OS success copy.
- `/settings`: Notion diagnostics and server environment status.
- `/settings`: also includes a diagnostic Ingredient Lookup Test panel backed by the server-side USDA lookup route.

## Current API Endpoints

- `POST /api/analyze-meal`
  - Input: `{ recipeText: string }`
  - Uses OpenAI structured JSON output.
  - Returns `MealAnalysisResult`.
  - Evidence-Aware Analysis v3 fields include `evidenceNotes`, `confidenceNotes`, `safetyDisclaimer`, and `guidanceBasis`.
  - V3 prompt context is generated from `globalHealthSafetyRules`, `healthGuidancePrinciples`, and approved source IDs. It does not call USDA or other nutrition APIs at runtime.
  - Before calling OpenAI, performs a best-effort Notion Ingredients lookup against the prepared recipe text. Matching known Ingredients are included as lightweight household context only; failures are logged and analysis continues without that context.
  - Response metadata may include `knownIngredientContextUsed` and `knownIngredientContextNames` so `/analyze` can show a small indicator.
  - Accepts optional source metadata and returns source defaults for current manual paste flows.
  - If `recipeText` looks like a URL, including common bare shared hosts such as TikTok, Instagram, YouTube, or `youtu.be`, treats it as a URL, normalizes common tracking parameters, follows normal redirects, fetches it server-side, parses JSON-LD recipe data when available, falls back to metadata/page text, and then analyzes only when enough recipe detail is available.
  - Classifies intake as `manual-text`, `recipe-page`, `social-video`, `video-page`, `short-link`, or `unknown-url` and returns `sourceClassification` plus `sourceNotes` in the response.
  - Uses a shared request-size limit and rate limit.
  - Blocks local/private/reserved URL hosts using hostname checks plus DNS resolution before fetches and after redirects. Redirects are followed manually through the same checks.
  - Returns `analysisVersion` and `analysisModel`.
  - Carries recipe-page JSON-LD nutrition facts through to `nutritionEstimate` when present.
  - For manual/free-text meals without structured nutrition, runs the deterministic free-text estimator only when the description has enough recognizable food detail. Current coverage includes paratha/parantha, gobi/cauliflower, butter, eggs, chicken, paneer, dal/lentils, chickpeas/chana, rice, quinoa, pasta/noodles, potatoes/aloo, yogurt/curd, milk, roti/chapati, bread, oats, tofu, fish/salmon, shrimp, cheese, fruit, nuts, salad/vegetables, toast, wraps/rolls, and leftover curry/sabzi.
  - For parsed recipe URLs and social-normalized recipes without structured nutrition, runs the same deterministic estimator against recovered ingredient lines. This fills many formerly blank saved meals while keeping provenance as `estimated`.
  - Estimates fill calories/protein/fiber only, leave sodium/sugar/fat/carbs null, and include provenance naming matched components, serving assumptions, quantity multipliers, confidence, and review guidance. It still does not ask OpenAI to calculate exact calories or macros.
  - Serving-size parsing currently supports simple numeric/word quantities for eggs, rotis/chapatis, parathas/paranthas, `half bowl`, `one bowl`, `large`, `small`, `extra butter`, `with butter`, and `without butter`. It is conservative and does not infer full macros or micronutrients.

- `POST /api/optimize-meal`
  - Input: `{ analysis: MealAnalysisResult-like summary, optimizationType: "higher-protein" | "healthier" | "kid-friendly" | "budget-friendly" }`
  - Uses OpenAI structured JSON output through the versioned `src/lib/ai/meal-optimization/v1` module.
  - Returns a `MealOptimizationResult`: headline, 1-3 minimal changes, why it helps, and an optional cultural-preservation note.
  - Has its own request-size limit and rate limit (6 per window), separate from `/api/analyze-meal`.
  - Does not write to Notion and requires no Notion schema changes.

- `GET /api/dashboard`
  - Queries recent saved Meals through the shared Notion Meals read utility.
  - Builds and returns a `DashboardViewModel`.
  - Accepts optional query params for dashboard targets: `calories`, `protein`, `fiber`, and `sodium`.
  - Does not call OpenAI.
  - Uses persisted meal-level nutrition where available, including saved estimates, and falls back to read-time Notion backfill for derived metadata only. Provenance/source distinguish structured, estimated, user-entered, reviewed, unavailable, and `notion-backfill` records.
  - Returns nutrition completeness and source mix metadata so sparse historical data is labeled with sample sizes instead of treated as complete.

- `POST /api/ingredients/lookup`
  - Input: `{ ingredient: string }`
  - Validates ingredient length from 2 to 100 characters.
  - Uses `FDC_API_KEY` via `getFoodDataCentralEnv()`.
  - Calls USDA FoodData Central server-side and returns a normalized nutrient snapshot.
  - Prefers generic/common data types when suitable and can return optional `matching` metadata with selected data type, generic/branded fallback flags, and confidence reason.
  - Does not enrich analysis output, Notion ingredients, or Notion schema.

- `POST /api/ingredients/enrich`
  - Input: `{ ingredientName: string, ingredientPageId?: string | null }`
  - Uses `FDC_API_KEY` server-side for USDA lookup.
  - If `ingredientPageId` is omitted, returns lookup plus skipped fields.
  - If `ingredientPageId` is present, inspects the Ingredients database schema and updates only compatible properties that already exist.
  - Never creates Notion schema properties.
  - Emits nutrition snapshots with explicit per-100g basis and skips plain nutrient writes unless the Notion schema has compatible basis projection fields.

- `GET /api/notion/ingredients`
  - Queries the Notion Ingredients database's primary data source.
  - Supports `pageSize`, `cursor`, and `search`.
  - Returns simplified Ingredient summaries for Settings picker/enrichment UX: page ID, name, URL, category, household flags, nutrient confidence, and FDC description.
  - Does not write to Notion.

- `GET /api/diagnostics/notion`
  - Verifies Notion API key, Meals database ID, and database access.
  - Returns safe success/failure JSON.

- `GET /api/diagnostics/notion-schemas`
  - Retrieves safe schema summaries for Meals, Ingredients, and Meal Feedback.
  - Returns database key, ID, title, and property name/type pairs.
  - Uses scoped env helpers and never returns API keys.
  - Can return partial schema results with safe per-database errors.

- `GET /api/notion/meals`
  - Queries the Notion Meals database's primary data source.
  - Returns simplified meal summaries.
  - Supports `pageSize`, `cursor`, and `search`.
  - Filters by configured `householdId` when a compatible `Household ID` rich_text property exists.
  - Reads optional meal-level nutrition, nutrition provenance, quality score, explicit analysis scores, and legacy Notes scorecards for dashboard compatibility.

- `POST /api/notion/save-meal`
  - Input: `MealAnalysisResult`
  - Strictly validates required v2/v3 generated fields and returns safe validation details instead of defaulting missing values.
  - Saves core meal fields to Notion Meals.
  - Writes a concise Analysis Framework v2 and Evidence-Aware v3 summary into the existing `Notes` field via `buildMealNotesSummary`, including canonical `Ingredients:` and `Instructions:` cookbook sections when the analysis captured recipe content (Beta 5.1).
  - Notes are written as multiple 2000-character rich_text chunks (20,000-character total cap) instead of truncating at one block.
  - Defaults current saves to `sourceType: manual`, `importedAt: now`, and `parserVersion: manual-v1`.
  - Writes optional source tracking fields only if compatible Notion Meals properties already exist. Source URL aliases include the household `Original Source` url property.
  - Writes optional dedicated `Ingredients` / `Recipe Ingredients` and `Instructions` / `Recipe Instructions` / `Method` rich_text properties when they exist; never creates them.
  - Writes optional nutrition totals, nutrition confidence/provenance/source, explicit analysis scores, and meal quality score only if compatible Notion Meals properties already exist.
  - User edits to nutrition totals and reviewed estimate controls convert the source to `user-entered` and append review-edit/reviewed-estimate provenance. Repeated serving multiplier or butter changes replace stale review notes. Blank nutrition fields remain null and are not written as zero.
  - Does not create Notion properties or relations.

- `POST /api/notion/save-ingredients`
  - Input: `{ mealName: string, ingredients: string[], mealPageId?: string | null }`
  - Normalizes, deduplicates, and persists ingredient suggestions to Notion Ingredients.
  - Avoids creating duplicate ingredient pages by normalized ingredient title.
  - Saves source meal name and created date only when compatible Ingredients properties exist.
  - If `mealPageId` is present and Ingredients has a compatible relation property pointing to Meals, creates or updates the Ingredient relation to include the saved Meal.
  - If no compatible relation exists, still saves ingredients and returns a non-blocking `relationWarning`.
  - Returns `createdCount`, `skippedCount`, `duplicateCount`, `relatedCount`, `malformedCount`, and optional `relationWarning`.

- `POST /api/notion/log-feedback`
  - Input: `MealFeedbackRequest`
  - Saves meal feedback fields to Notion Meal Feedback.
  - Saves the meal name in the feedback title for readability.
  - If `selectedMealId` is present and the Feedback database has a compatible `Meal` relation property, writes the relation to the selected Meal page.
  - If the `Meal` relation property is missing, saves feedback without relation and returns a non-blocking warning.
  - Used by `/feedback`, Today quick actions, and Meal Detail quick actions. Today and Meal Detail apply local optimistic updates after successful saves; no additional Notion fields are required.

## Environment Variables

Required server-side variables:

```bash
OPENAI_API_KEY=
FDC_API_KEY=
NOTION_API_KEY=
NOTION_MEALS_DATABASE_ID=
NOTION_INGREDIENTS_DATABASE_ID=
NOTION_FEEDBACK_DATABASE_ID=
NOTION_WEEKLY_PLANS_DATABASE_ID=
NOTION_MEAL_TEMPLATES_DATABASE_ID=
```

Auth variables (private by default since 2026-06-12; `APP_AUTH_TOKEN` is required in production — without it and without an explicit opt-out every request returns 503):

```bash
APP_AUTH_TOKEN=
# Trusted family/beta open mode; bypasses app auth for browser/API app routes.
ALLOW_UNAUTHENTICATED=false
# Deprecated legacy opt-out, warns at runtime: PRIVATE_DEPLOYMENT_MODE=false
APP_HOUSEHOLD_ID=
APP_CREATED_BY=
APP_RECORD_VISIBILITY=private
```

Current route-scoped usage:
- `/api/analyze-meal`: `OPENAI_API_KEY`
- `/api/ingredients/lookup`: `FDC_API_KEY`
- `/api/diagnostics/notion`: `NOTION_API_KEY`, `NOTION_MEALS_DATABASE_ID`
- `/api/diagnostics/notion-schemas`: scoped Meals, Ingredients, and Feedback env helpers
- `/api/notion/ingredients`: `NOTION_API_KEY`, `NOTION_INGREDIENTS_DATABASE_ID`
- `/api/notion/meals`: `NOTION_API_KEY`, `NOTION_MEALS_DATABASE_ID`
- `/api/notion/save-meal`: `NOTION_API_KEY`, `NOTION_MEALS_DATABASE_ID`
- `/api/notion/save-ingredients`: `NOTION_API_KEY`, `NOTION_INGREDIENTS_DATABASE_ID`, `NOTION_MEALS_DATABASE_ID`
- `/api/notion/log-feedback`: `NOTION_API_KEY`, `NOTION_FEEDBACK_DATABASE_ID`

Smoke test:
- `SMOKE_BASE_URL`: required only for `npm run smoke:prod`.
- Example: `SMOKE_BASE_URL=https://your-vercel-url npm run smoke:prod`.
- The script performs read-only checks for pages, manifest, Notion diagnostics, schema diagnostics, and USDA paneer lookup. It does not call OpenAI and does not create Notion records.

## Manual Vercel Deployment Checklist

Do not deploy automatically from Codex. When Suvir is ready:

1. Confirm these pass locally:
   - `npm run test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
2. Review the dirty worktree and commit only intended changes.
3. Push from the local machine when ready.
4. In Vercel, confirm required environment variables are present:
   - `OPENAI_API_KEY`
   - `FDC_API_KEY`
   - `NOTION_API_KEY`
   - `NOTION_MEALS_DATABASE_ID`
   - `NOTION_INGREDIENTS_DATABASE_ID`
   - `NOTION_FEEDBACK_DATABASE_ID`
   - `NOTION_WEEKLY_PLANS_DATABASE_ID`
   - `NOTION_MEAL_TEMPLATES_DATABASE_ID`
   - **required** `APP_AUTH_TOKEN` (long random secret — deploying without it fails closed with 503)
   - **required** `IOS_SHORTCUT_TOKEN` (long random secret for the iPhone Shortcut)
   - `ALLOW_UNAUTHENTICATED=false`
   - optional household metadata env vars

   > Do not deploy the auth release to production until `APP_AUTH_TOKEN` and `IOS_SHORTCUT_TOKEN` are set in Vercel production.
5. Trigger or wait for deployment from `main`.
6. After deploy, smoke test:
   - `/`
   - `/analyze`
   - `/dashboard`
   - `/api/dashboard`
   - `/api/analyze-meal`
7. Verify production requires authentication:
   - An incognito page request redirects to `/login`; entering `APP_AUTH_TOKEN` opens the app.
   - Unauthenticated `/api/today` returns JSON 401.
   - API access works with `Authorization: Bearer <APP_AUTH_TOKEN>` or `x-app-auth-token: <APP_AUTH_TOKEN>`.
   - The iPhone Shortcut still works with `Authorization: Bearer <IOS_SHORTCUT_TOKEN>`.
   - If `ALLOW_UNAUTHENTICATED=true` is intentionally set for a trusted family beta, browser pages and guarded app API routes skip app auth even when `APP_AUTH_TOKEN` is present. The iPhone Shortcut intake endpoint still requires `IOS_SHORTCUT_TOKEN`.

## Manual Notion Schema Checklist

The app does not create or mutate Notion schema automatically. Nutrition, score, and quality fields are written only when compatible properties already exist in the Meals database.

Ask the operator whether they want to add these Meals properties:

- `Calories` — Number
- `Protein` or `Protein (g)` — Number
- `Carbs` or `Carbs (g)` — Number
- `Fat` or `Fat (g)` — Number
- `Fiber` or `Fiber (g)` — Number
- `Sodium` or `Sodium (mg)` — Number
- `Sugar` or `Sugar (g)` — Number
- `Nutrition Confidence` — Select or Rich text for current high/medium/low app compatibility. If a Number field is preferred, add a follow-up code adjustment.
- `Nutrition Provenance` — Select or Rich text
- `Nutrition Source` — Select or Rich text
- `Meal Quality Score` — Number
- `Metabolic Score` — Number
- `Protein Score` — Number
- `Fiber Score` — Number
- `Satiety Score` — Number
- `Blood Sugar Risk Score` — Number

The operator also requested considering these more granular quality component fields. They are not written by the current app yet:

- `Sodium Score` — Number
- `Sugar Score` — Number
- `Diversity Score` — Number
- `Processing Score` — Number

Operator-requested candidate checklist, before compatibility review:
- `Calories` — Number
- `Protein` — Number
- `Carbs` — Number
- `Fat` — Number
- `Fiber` — Number
- `Sodium` — Number
- `Sugar` — Number
- `Nutrition Confidence` — Number
- `Nutrition Provenance` — Select or Rich text
- `Nutrition Source` — Select or Rich text
- `Meal Quality Score` — Number
- `Protein Score` — Number
- `Fiber Score` — Number
- `Sodium Score` — Number
- `Sugar Score` — Number
- `Diversity Score` — Number
- `Processing Score` — Number

Compatibility note: current code writes `Nutrition Confidence` as high/medium/low text through Select or Rich text, not Number. If the operator wants `Nutrition Confidence` as Number, update the mapper and review UI first.

Available env helpers:
- `getOpenAIEnv()`
- `getFoodDataCentralEnv()`
- `getNotionMealsEnv()`
- `getNotionFeedbackEnv()`
- `getNotionIngredientsEnv()`
- `getFullNotionEnv()`
- `getFullServerEnv()`
- `getServerEnv()` remains as a compatibility alias for full server env validation.

Rules:
- Never use `NEXT_PUBLIC_` for OpenAI or Notion secrets.
- Never commit `.env.local`.
- `.env.example` must contain placeholders only.
- Vercel environment variables must be configured in Project Settings before remote testing.

## Deployment Status

Current status:
- Local build passes.
- No `vercel.json` is currently necessary.
- GitHub repo exists and is pushed.
- Vercel deployment exists and has succeeded.
- Public HTTPS deployment is live.
- Production Notion diagnostics works after Vercel env vars were completed.

Deployment risks:
- Serverless API routes depend on correct Vercel env vars.
- Notion integration must be shared with every Notion database used by the app.
- If secrets are ever exposed again, rotate them before continuing production work.

## Mobile/PWA Strategy

Current strategy:
- Next.js web app.
- Vercel deployment.
- Mobile-friendly responsive UI.
- Progressive Web App enhancement.
- iPhone home-screen support.
- Basic manifest and original placeholder SVG/PNG icons.
- Safe-area padding and larger mobile form/tap targets.

Deferred:
- Service worker/offline mode.
- React Native.
- Expo.
- Native iOS.
- App Store deployment.

Reasoning:
- Maximize iteration speed.
- Maintain one codebase.
- Reduce operational complexity.
- Validate workflows before native investment.

## Current Blockers

- Token auth with a browser login flow exists (private by default since 2026-06-12), but there are no per-user accounts; do not broaden public sharing before real multi-user auth exists.
- Optional source tracking fields require matching Notion Meals properties before they persist in Notion. The app detects compatible fields but does not create schema.
- Recipe URL parsing is intentionally basic and dependency-free. Some recipe sites may block server-side fetches or hide recipe content behind scripts.
- Evidence-Aware Analysis v3 works in production; continue reviewing real-meal output for safe language drift.
- FoodData Central lookup is not called during meal analysis or automatic ingredient persistence. Analysis can read already-saved Ingredient context from Notion as lightweight background.
- FoodData Central matching is improved but still heuristic. Some culturally specific or variety-specific staples may still fall back to branded/product-specific records when no suitable generic result is returned.
- Ingredient enrichment remains explicit/manual from Settings; it is not automatic during analysis or ingredient persistence.
- Ingredient suggestions are saved as normalized records; Ingredient -> Meal relations are now supported when the active Ingredients schema exposes a compatible Meals relation.
- Structured ingredient persistence is not implemented yet.

## Immediate Next Tasks

Recommended next slice — Beta 6.6 URL Recovery / Guided Intake Fallback v1 (small reliability/UX slice, not a rewrite): when a URL paste fails because a publisher blocks automated reading or hides recipe text behind scripts, Analyze should reassure the user the app still works and guide them to paste caption/transcript/ingredients/recipe text into the same box and re-run, while preserving the existing source-URL re-attachment behavior. A first step already exists, committed locally as `ce7dc0d` but not yet pushed (`getUrlRecoveryCopy` + `tests/analyze-guided-recovery.test.ts`). No Notion schema changes and no new AI calls.

1. Review FoodData Central matching quality on a larger household ingredient set and add targeted query expansions only where needed.
2. Review Evidence-Aware Analysis v3 plus known Ingredient context output quality on real household meals and tighten prompt/schema language if it drifts into medical claims or over-precise nutrition claims.
3. Test Serving Size Controls v1 on more household shorthand meals and add only deterministic rules with clear provenance.
4. Deploy and manually verify the Beta 3 usability pass on Vercel/Notion, then continue simplification only for remaining admin/operator surfaces such as `/settings`.
5. Add structured ingredient persistence after confirming the normalized Ingredient relation behavior in production.
6. Add structured ingredient persistence behind the current string-compatible ingredient flow.
7. Decide whether a persisted feedback reversal/delete workflow is needed; current Today undo is local UI only and does not alter persisted feedback history.
8. Harden Recipe URL analysis after real-site testing.

## Manual Testing Checklist

Local:
- Run `npm install`.
- Copy `.env.example` to `.env.local`.
- Fill in server env vars with real local values.
- Run `npm run dev -- -p 3011`.
- Open `/settings` and test Notion connection.
- In `/settings`, click `Test Notion Schemas` and verify Meals, Ingredients, and Feedback property lists appear.
- Open `/analyze`, paste at least 10 characters, and verify the Analyze button enables.
- Paste a public recipe URL into `/analyze`; verify an analysis is produced and the Review Result shows source type `url`, source name/URL, and parser version `recipe-parser-basic-v1`.
- Analyze a meal and verify the Review Result begins with `Household answer`, including the quick verdict, smallest helpful change, why it helps, and cultural-preservation note when available.
- Verify Analysis Framework v2 sections remain editable through progressive sections: Practical Guidance, Quick Edits, More Ways to Make It Work, Shopping/Prep/Pairings, Scores, and Advanced Saved Fields.
- Verify Evidence-Aware Analysis v3 remains editable inside the collapsed Evidence and Safety section: Evidence Notes, Confidence Notes, Safety Disclaimer, and Guidance Basis.
- Edit at least one score, one text field, and one array field to confirm they are editable before save.
- Click `Save meal`; verify the success state says `Saved to Meal OS.` and open the saved record from Advanced details if needed.
- In Notion, confirm the `Notes` field contains: original notes, Analysis Framework v2 Summary header, Quick Verdict, Scorecard, Main Concerns, Plate Strategy, Cautions, and Evidence-Aware v3 Summary sections.
- If optional source properties exist in Meals, confirm Source Type is `manual`, Imported At is populated, and Parser Version is `manual-v1`.
- If optional source properties do not exist, confirm meal save still succeeds.
- Verify ingredient persistence status appears after meal save.
- Open the Ingredients database and verify new normalized suggestions are created without duplicate repeats.
- Open `/meals` and verify the saved meal appears.
- Open a meal detail page from `/meals` or Today and verify household feedback counts render.
- On Meal Detail, tap `Ate This` or `Loved It`; verify the button shows `Saving...`, duplicate actions are disabled while pending, the card shows success copy, and household feedback counts update without a manual reload.
- Open `/`, verify Today suggestions and the Recent Household Learning strip render.
- On a Today card, tap `Ate This` or `Loved It`; verify only that card's feedback buttons are disabled while pending, the clicked button shows `Saving...`, card feedback badges and the learning strip update after success, and `Saved. Undo?` appears.
- Tap `Undo local view`; verify Today card feedback and the learning strip restore locally and the copy states the saved feedback record was kept.
- Open `/feedback`, verify saved meals load in the Meal dropdown.
- Select a saved meal and verify it fills Feedback Entry.
- Edit Feedback Entry manually and submit feedback.
- If the `Meal` relation property is missing, verify feedback still saves and displays the warning.
- Verify the success state says `Saved to Meal OS.` and open the saved record from Advanced details if needed.
- Open `/manifest.webmanifest` and verify it returns manifest JSON.
- From iPhone Safari, use Share -> Add to Home Screen on the Vercel URL.

Verification commands:

```bash
npm run typecheck
npm run lint
npm run build
SMOKE_BASE_URL=https://your-vercel-url npm run smoke:prod
```

## How To Start Local Dev

```bash
npm install
cp .env.example .env.local
npm run dev -- -p 3011
```

If another Next dev server is running, find it:

```bash
lsof -ti :3011
```

Then stop the process if it is safe to do so:

```bash
kill <pid>
```

## How To Deploy To Vercel

1. Push the project to GitHub.
2. In Vercel, create a new project from the GitHub repo.
3. Use the default Next.js framework settings.
4. Add all required environment variables in Vercel Project Settings.
5. Deploy.
6. Open the public HTTPS URL on desktop and mobile.
7. Test `/settings` first, then the full Analyze -> Save -> Meals -> Feedback path.

Redeploy after changes:
- Push to the connected GitHub branch, or
- Use Vercel Dashboard -> Deployments -> Redeploy.

No `vercel.json` is required at the moment.

## Important Notion Setup Details

Required databases:
- Meals.
- Ingredients.
- Meal Feedback.
- Weekly Plans.
- Meal Templates.

Current write/read usage:
- Meals: save analyzed meals and list saved meals.
- Ingredients: save normalized ingredient suggestions after meal save.
- Meal Feedback: save post-meal feedback with a saved or manual meal name.
- Other database IDs are configured but not actively used yet.

Required sharing:
- Each used database must be shared with the Notion integration tied to `NOTION_API_KEY`.
- If diagnostics fail, first verify database sharing and database IDs.

Current Meals properties used:
- `Meal Name` title
- `Cuisine` select
- `Meal Type` select
- `Protein Level` select
- `Satiety Level` select
- `Blood Sugar Impact` select
- `Effort Level` select
- `Family Approved` checkbox
- `Weeknight Friendly` checkbox
- `Comfort Meal` checkbox
- `Optimized Version` rich_text
- `Notes` rich_text — now contains original notes plus concise Analysis Framework v2 and Evidence-Aware v3 summaries. Built by `src/lib/notion/meal-notes.ts`. No new Notion properties were added.

Current Feedback properties used:
- `Feedback Entry` title
- `Meal` relation to Meals, optional but required for true selected-meal relation writes
- `Energy After` select
- `Hunger Later` select
- `Cravings Later` checkbox
- `Would Repeat` checkbox
- `Notes` rich_text

Manual Notion setup required for feedback relations:
1. Open the Meal Feedback database in Notion.
2. Confirm it is the same active database/data source configured by `NOTION_FEEDBACK_DATABASE_ID`; `/settings` -> `Test Notion Schemas` must list the relation under Meal Feedback.
3. Add a Relation property named `Meal`, or any relation property pointing to the configured Meals database.
4. Point the relation to the Meals database.
5. Share both databases with the same Notion integration.
6. Run `/settings` -> `Test Notion Schemas` and confirm Meal Feedback includes a `relation` property with a relation target matching Meals.
7. Selected-meal feedback will then write the relation automatically.

Feedback relation status:
- The app code supports writing the Meal Feedback → Meals relation when a relation property exists on the active Feedback data source.
- It prefers a relation property named `Meal`; if absent, it can use any relation property targeting the configured Meals database/data source.
- If the relation property is absent, feedback still saves and returns a non-blocking warning.
- Production smoke testing showed selected-meal feedback still warns because the active Feedback data source did not expose a relation property.

Current Ingredients behavior:
- Uses the active Ingredients data source title property for ingredient name.
- Optional source meal property is used if named `Source Meal`, `Source Meal Name`, `Meal`, or `Meal Name` and typed as rich_text or select.
- Optional created date property is used if named `Created`, `Created Date`, `Created At`, or `Added Date` and typed as date.
- Optional Meal relation property is used when typed as relation and targeting the configured Meals database or primary Meals data source. The app prefers a compatible property named `Meal` or `Meals`, then falls back to any compatible relation.
- Duplicate detection uses trimmed, lowercase, lightly singularized ingredient names.
- Empty ingredient lists return `200`; local relation testing confirmed a new ingredient can be created and related, a same-meal duplicate is skipped without duplicate relation writes, and a different-meal duplicate preserves the existing relation while adding the new Meal relation.

# Mandatory Start-of-Session Procedure

## Current State - 2026-06-13 Beta 6.3-6.5 Family Feedback Cycle

The latest family-feedback cycle is complete on `main`:

- `f49d023` Beta 6.3: Add app-native save continuity links
- `8be7817` Beta 6.4: Surface saved meal intelligence summary
- `9a04047` Beta 6.5: Estimate nutrition from recipe ingredients

Verification completed during implementation:
- Beta 6.4: `npm run typecheck`, `npm test` (352/352), `npm run lint`, and `npm run build` passed.
- Beta 6.5: `npm run typecheck`, `npm test` (356/356), `npm run lint`, and `npm run build` passed.

None of these slices change Notion schema or add a new persistence architecture. Next step after deploying: observe whether users follow the Save -> View saved meal/Add to Planner path, whether Meal Detail's Meal OS Summary closes the Analyze-to-Meals expectation gap, and whether ingredient-based estimates materially reduce missing Dashboard nutrition.

## Current State - 2026-06-11 Beta 4 Mobile-First Redesign

Metabolic Meal OS is a functional family MVP. New feature development is paused while the app is hardened for iPhone use.

Completed in Beta 4:
- Added explicit `/today` route alias while preserving `/`.
- Reduced mobile page header height globally.
- Reworked Today so daily suggestions and feedback actions are primary; learning, fresh ideas, and health snapshot are secondary disclosure.
- Reworked Analyze so mobile intake is shorter and `Save meal` appears before advanced nutrition/scores/evidence/provenance sections.
- Reworked Meals so mobile defaults to Recent/Favorites/All controls plus a six-item list and explicit `Show all`; desktop keeps full filtered grid.
- Reworked Planner so mobile uses a horizontal day selector and one-day-at-a-time planning; desktop keeps the full week grid.
- Reworked Dashboard so household takeaways and today metrics are primary, with targets, quality/data, details, and recent meals expandable.
- Reworked Feedback so meal selection, feedback entry, and save are primary; after-meal details are expandable.
- Reworked Meal Detail so reuse/feedback actions come first and `Would Make Again` is the first action.
- Added source-level mobile UX regression tests in `tests/mobile-ux.test.ts`.

Verification completed:
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed.
- `npm run build` passed.
- Local HTTP mobile-user-agent smoke returned `200` for `/today`, `/`, `/analyze`, `/meals`, `/planner`, `/dashboard`, `/feedback`, `/settings`, and `/meals/not-a-real-meal-id`.

Verification limitation:
- The in-app Browser connector was unavailable in this session, so visual mobile smoke screenshots/interactions could not be completed. Run an on-device iPhone Safari pass before calling Beta 4 visually complete.

At the beginning of EVERY future Codex session:

1. Read:
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

2. Summarize:
- current project state
- current priorities
- blockers
- technical debt
- next recommended task

3. Do NOT begin coding until the current state is understood.

# Mandatory End-of-Session Procedure

At the end of EVERY future Codex session:

1. Update `HANDOFF.md`
2. Update `ROADMAP.md`
3. Update `SESSION_LOG.md`
4. Update `KNOWN_ISSUES.md` if needed
5. Update `DECISIONS.md` if architectural decisions changed
6. Add any new environment variables
7. Add any new API routes
8. Add any deployment changes
9. Add unfinished work and blockers
10. Verify all docs remain internally consistent

This is REQUIRED before ending a session.

# Development Standards

Requirements:
- Keep secrets server-side only.
- Never expose OpenAI or Notion keys.
- Prefer typed interfaces.
- Prefer server actions/API routes for backend work.
- Add safe error handling.
- Log detailed errors server-side only.
- Use incremental vertical slices.
- Keep MVP complexity low.
- Avoid premature optimization.
- Prefer composable architecture.
- Avoid large refactors without documentation updates.
- Keep documentation current with routes, env vars, API routes, and deployment changes.

## Deployment And Recovery Procedures

Local startup:
- Run `npm install`.
- Create `.env.local`.
- Run `npm run dev -- -p 3011`.

LAN testing:
- Local LAN testing may work from `http://<machine-ip>:3011`, but public mobile testing should use Vercel HTTPS.
- Do not hardcode localhost in app code.

Vercel deployment:
- GitHub repo is already connected.
- Vercel deployment is already live.
- Add or update server-side environment variables in Vercel Project Settings.
- Deploy with default Next.js settings.

GitHub workflow:
- Before pushing, run a secret scan with a tool such as `gitleaks` or a carefully scoped `rg` search for real provider key prefixes.
- Verify `.env.local` is ignored.
- Verify `.env.example` contains placeholders only.

Recover from broken env config:
- Check Vercel Project Settings -> Environment Variables.
- Confirm values are set for the target environment.
- Redeploy after changing env vars.
- Use `/settings` -> `Test Notion Connection`.

Rotate API keys:
- Revoke the old OpenAI key in the OpenAI dashboard.
- Create a new OpenAI key and update `.env.local` and Vercel.
- Revoke or replace the Notion integration secret.
- Update `.env.local` and Vercel.
- Redeploy.

Reconnect Notion integrations:
- Open each database in Notion.
- Use Share and invite the integration.
- Confirm the integration has access.
- Run `/settings` diagnostics.
