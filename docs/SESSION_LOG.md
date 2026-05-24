# Session Log

## 2026-05-24 Analyze Ingredient Persistence Payload Fix

Goal:
- Fix the warning shown after saving from `/analyze` when direct production calls to `/api/notion/save-ingredients` succeed.
- Do not change Notion schema, Evidence-Aware Analysis v3 output, or the save-ingredients API behavior unless necessary.

Finding:
- Direct production payload `{ mealName: string, ingredients: string[] }` succeeds.
- The `/analyze` client was passing `meal.ingredientSuggestions` directly after meal save.
- The editable UI stores ingredient suggestions as newline text, so the safest client payload source is the current textarea value normalized to a string array at save time, with the analysis array as fallback.

Completed work:
- Added `normalizeIngredientSuggestionText()` in `/analyze`.
- Ingredient persistence now sends exactly `{ mealName, ingredients }`, where `ingredients` is a trimmed, blank-filtered `string[]` derived from the editable ingredient textarea.
- If the textarea is empty, it falls back to a defensive string-only normalization of `meal.ingredientSuggestions`.
- Added a distinct `empty` client state so the UI can say no ingredient suggestions were available instead of showing an API failure.
- Kept meal save non-blocking if ingredient persistence fails.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.

Next recommended action:
- Deploy and test `/analyze` end to end in production with ingredient suggestions populated. Confirm ingredient persistence reports success or duplicate skips, and confirm no warning appears when the API succeeds.

## 2026-05-24 Evidence-Aware Analysis v3

Goals:
- Wire the existing evidence-aware foundation into runtime meal analysis safely and incrementally.
- Support family diabetes risk awareness, insulin-sensitivity-friendly eating, possible PCOS-supportive food patterns, sustainable household nutrition, Canadian context, Indian and Atlantic Canadian food patterns, and culturally preserving guidance.
- Do not implement calorie counting, macro tracking, medical scoring, or automated USDA runtime enrichment.

Files changed:
- `src/lib/types/meal.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/api/notion/save-meal/route.ts`
- `src/app/analyze/page.tsx`
- `src/lib/notion/meal-notes.ts`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`
- `docs/SOURCES.md`

Completed work:
- Added Evidence-Aware Analysis v3 fields to `MealAnalysisResult`:
  - `evidenceNotes: string[]`
  - `confidenceNotes: string[]`
  - `safetyDisclaimer: string`
  - `guidanceBasis: { sourceId: string; principleId: string; relevance: string }[]`
- Updated `/api/analyze-meal` to build prompt context from `globalHealthSafetyRules`, `healthGuidancePrinciples`, and approved source records.
- Updated the OpenAI structured output schema to require the four v3 fields.
- Restricted `guidanceBasis.sourceId` and `guidanceBasis.principleId` to known source/principle IDs.
- Kept v3 focused on general food-pattern guidance; no medical claims, no diagnosis, no treatment/cure/prevention language, no supplement/medication/fertility/dosing advice, and no runtime USDA enrichment.
- Updated `/analyze` to display and edit a compact Evidence & Safety section with evidence notes, confidence notes, safety disclaimer, and guidance basis.
- Updated save-meal validation to accept v3 fields leniently for backward compatibility.
- Updated Notion Notes summary to include a concise Evidence-Aware v3 Summary without adding Notion schema properties.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local `POST /api/analyze-meal` smoke test returned `200 OK` with all v3 fields present.
- Local `POST /api/notion/save-meal` smoke test with v3 fields returned `200 OK`.
- Notion fetch verified the saved smoke-test Meal Notes include the Evidence-Aware v3 Summary.

Known limitations:
- V3 output is model-generated and needs production smoke testing and real-meal review for language drift.
- `guidanceBasis` is source/principle-ID linked, not a full citation layer.
- Notion persistence remains constrained by the existing 2000-character Notes rich_text limit.
- USDA FoodData Central remains diagnostic/manual and is not used during runtime meal analysis.

Next recommended actions:
- Deploy v3 to Vercel.
- Production smoke-test plain text analysis, recipe URL analysis, v3 UI display/editing, save to Notion, and Notion Notes summary.
- Review output on representative Indian, Atlantic Canadian, and mixed household meals before broad use.

## 2026-05-24 Production Blocker Fix Slice Before Evidence-Aware Analysis v3

Goals:
- Fix the two production blockers found during smoke testing before starting Evidence-Aware Analysis v3.
- Do not implement Evidence-Aware Analysis v3.

Blocker 1 — Ingredient persistence 500:
- Root cause: `src/app/api/notion/save-ingredients/route.ts` retrieved the Ingredients database with `notion.databases.retrieve()` and then tried to read `database.properties`.
- With the current Notion SDK/API shape, database objects contain `data_sources` but do not contain the active property map. Properties live on the retrieved data source.
- Empty ingredient lists returned `200` because that path exits before schema inspection.
- Real ingredient creation returned `500` because schema detection was using the wrong object.

Ingredient fix:
- Updated `save-ingredients` to retrieve the primary Ingredients data source and derive the title/source/created schema from that data source.
- Added safe server logging for the detected ingredient schema: title property, optional source meal property/type, and optional created date property.
- Preserved existing behavior:
  - Empty list returns `200`.
  - Duplicate prevention still queries the active data source.
  - App code still does not create Notion schema.
  - Optional source/created properties are only written when compatible.

Ingredient verification:
- Local `POST /api/notion/save-ingredients` with `["smoke-test-ingredient-fix-2026-05-24"]` returned `200` with `createdCount: 1`.
- Repeating the same request returned `200` with `createdCount: 0`, `skippedCount: 1`.
- Notion search verified the new Ingredient page exists.
- Production deploy/retest is still needed for this fix to affect the live Vercel URL.

Blocker 2 — Meal Feedback -> Meals relation:
- Root cause/mismatch identified: the active Meal Feedback data source configured by `NOTION_FEEDBACK_DATABASE_ID` does not expose any relation property.
- Direct schema inspection shows the Feedback data source properties are only: `Cravings Later`, `Energy After`, `Feedback Entry`, `Hunger Later`, `Notes`, and `Would Repeat`.
- The only `Meal` relation found in diagnostics is on the Meals data source itself, where it points back to the Meals database/data source. That is not usable for writing Feedback -> Meal relations.

Feedback relation code improvement:
- Updated selected-feedback relation detection to prefer a relation property named `Meal`.
- If `Meal` is absent, detection now checks for any relation property targeting the configured Meals database or Meals data source.
- Updated feedback mapping so it can write to the detected relation property name instead of hardcoding `Meal`.
- If no relation exists, feedback still saves and returns the existing safe warning.
- Added safe server logging with Feedback database ID, Meals database/data source ID, and Feedback property summaries when no relation is found.
- Enhanced schema diagnostics to include relation target database/data source IDs for relation properties.

Feedback verification:
- Local selected-meal feedback still saves successfully but returns the expected missing-relation warning because the active Feedback data source lacks a relation property.
- Exact manual fix: add a relation property on the active `Meal Feedback` data source/database configured by `NOTION_FEEDBACK_DATABASE_ID`, pointing to the `Meals` database configured by `NOTION_MEALS_DATABASE_ID`. The property may be named `Meal`, or any relation name targeting Meals after this code change.
- Production deploy/retest is needed after the Notion relation is corrected.

Files changed:
- `src/app/api/notion/save-ingredients/route.ts`
- `src/app/api/notion/log-feedback/route.ts`
- `src/app/api/diagnostics/notion-schemas/route.ts`
- `src/lib/notion/mappers.ts`
- `docs/SESSION_LOG.md`
- `docs/KNOWN_ISSUES.md`
- `docs/HANDOFF.md`

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.

Next required actions:
- Deploy the code fix to Vercel.
- Re-run production ingredient persistence with a new ingredient and duplicate check.
- Add/fix the Meal Feedback relation on the active production Feedback data source, then rerun selected-meal feedback.

## 2026-05-24 Production Smoke Test Retry After Vercel Protection Disabled

Goal:
- Retry the production smoke checklist against `https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app` after Vercel deployment protection was temporarily disabled.
- Do not implement Evidence-Aware Analysis v3.

Production route/page checks:
- `HEAD /settings`: `200 OK`.
- `HEAD /analyze`: `200 OK`.
- `HEAD /meals`: `200 OK`.
- `HEAD /feedback`: `200 OK`.
- `GET /manifest.webmanifest`: `200 OK`; manifest returned expected `Metabolic Meal OS` app metadata and icons.

Settings/API diagnostics:
- `GET /api/diagnostics/notion`: `200 OK`, returned Meals database title/id.
- `GET /api/diagnostics/notion-schemas`: `200 OK`, returned Meals, Ingredients, and Meal Feedback schema summaries.
- Ingredients schema includes nutrient fields: `FDC ID`, `FDC Description`, `Nutrient Source`, `Nutrient Confidence`, `Protein (g)`, `Fiber (g)`, `Carbohydrates (g)`, `Sugars (g)`, `Sodium (mg)`, `Energy (kcal)`, and `Last Nutrient Lookup`.
- Meal Feedback schema returned by production diagnostics does **not** include a `Meal` relation property.
- `POST /api/ingredients/lookup` with `paneer`: `200 OK`, returned USDA FoodData Central match with nutrient snapshot.
- `POST /api/ingredients/enrich` lookup-only with `paneer`: `200 OK`, returned lookup mode, no updated fields, and expected skipped fields because no `ingredientPageId` was provided.

Analyze smoke tests:
- Plain-text meal analysis: `200 OK`.
- Plain-text test meal: chana masala bowl with chickpeas, basmati rice, cucumber kachumber, plain yogurt, lemon, and mango pickle.
- Result meal name: `Chana Masala Bowl`.
- Analysis Framework v2 fields were present in the API response.
- Recipe URL analysis with `https://www.hungrypaprikas.com/kofta-smash-tacos/`: `200 OK`.
- URL result meal name: `Kofta Smash Tacos`.
- URL result source metadata: `sourceType: url`, `sourceName: Kofta Smash Tacos`, `parserVersion: recipe-parser-basic-v1`, and the original source URL.

Notion meal persistence:
- `POST /api/notion/save-meal`: `200 OK`.
- Created Notion Meal page: `36a682da-780a-8188-9fda-c49a767ade2f`.
- `GET /api/notion/meals`: `200 OK`; saved meal was present in returned list.
- Notion fetch verified the saved Meal page exists.
- Notion `Notes` contains the Analysis Framework v2 summary, including Quick Verdict, Scorecard, Main Concerns, Plate Strategy, and Cautions.

Ingredient persistence:
- Ingredient persistence after save failed in production.
- `POST /api/notion/save-ingredients` with the analyzed meal's ingredient suggestions returned `500`.
- A follow-up empty-list request returned `200`, but a single real ingredient creation request also returned `500`.
- Duplicate-avoidance behavior could not be verified because ingredient creation is failing in production.

Feedback:
- Manual feedback save: `200 OK`; Notion Feedback page created and verified.
- Selected-meal feedback save: `200 OK`; Notion Feedback page created and verified.
- Selected-meal feedback returned warning: `Meal Feedback -> Meals relation property is missing. Feedback was saved without a Meal relation.`
- Because production schema diagnostics do not show the `Meal` relation property on Meal Feedback, relation behavior is not working in production.

Production blockers found:
- Ingredient creation/persistence to Notion Ingredients fails with `500` in production when at least one ingredient needs to be created.
- Meal Feedback -> Meals relation is not detected in production; selected-meal feedback saves without relation and returns the missing-relation warning.

Commands/checks run:
- `curl -I` for `/settings`, `/analyze`, `/meals`, and `/feedback`.
- `curl -i` for Notion diagnostics, schema diagnostics, USDA lookup, USDA enrichment lookup-only, manifest, and focused ingredient persistence tests.
- Node-based production workflow for Analyze -> Save -> Ingredients -> Meals -> Feedback after elevated network access was approved.
- Notion connector fetches for the saved Meal page and both Feedback pages.

Recommended next actions:
- Fix production ingredient persistence before adding Evidence-Aware Analysis v3.
- Recheck Notion Meal Feedback data source/schema; ensure the `Meal` relation is on the active data source queried by production, not only visible somewhere else in the Notion UI.
- After those two blockers are fixed, rerun the production smoke checklist once more, then proceed to Evidence-Aware Analysis v3 implementation.

## 2026-05-24 Production Smoke Test Attempt + Evidence-Aware Analysis v3 Prep

Goals:
- Run the production smoke checklist against the deployed Vercel URL before layering Evidence-Aware Analysis v3 on top.
- Use `https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app`.
- Use recipe URL `https://www.hungrypaprikas.com/kofta-smash-tacos/` for recipe URL analysis testing.
- Do not implement Evidence-Aware Analysis v3 yet.

User-confirmed setup before testing:
- Local `.env.local` has required keys including `FDC_API_KEY`.
- Meal Feedback has a `Meal` relation to Meals.
- Ingredients database nutrient fields have been added.
- Paneer enrichment successfully updated Notion locally.

Production smoke-test result:
- Blocked by Vercel deployment protection/authentication before any product behavior could be verified.
- `HEAD /settings`, `/analyze`, `/meals`, and `/feedback` all returned `401` from Vercel with `Authentication Required`, `_vercel_sso_nonce`, and `x-robots-tag: noindex`.
- `GET /api/diagnostics/notion`, `GET /api/diagnostics/notion-schemas`, `POST /api/ingredients/lookup`, and `POST /api/ingredients/enrich` also returned the Vercel authentication page with `401`.
- Vercel CLI is not installed in this workspace, and no Vercel MCP tool was available in this session.
- No production Analyze, Save, Meals, Feedback, USDA, or Notion behavior was verified.

Files inspected for Evidence-Aware Analysis v3 prep:
- `src/lib/sources/source-registry.ts`
- `src/lib/health-guidance/index.ts`
- `src/lib/health-guidance/types.ts`
- `src/lib/health-guidance/diabetes.ts`
- `src/lib/health-guidance/pcos.ts`
- `src/lib/health-guidance/canada-food-guide.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/lib/types/meal.ts`
- `src/app/analyze/page.tsx`
- `src/lib/notion/meal-notes.ts`

V3 prep findings:
- Approved source records and health-guidance principles are well-structured and source-ID based.
- Current analysis prompt already contains general diabetes-aware and PCOS-aware safety language, but it is hand-written and not generated from the source registry or health-guidance modules.
- Current `MealAnalysisResult` has Analysis Framework v2 fields only; no `evidenceNotes`, `guidanceBasis`, `safetyDisclaimer`, or `confidenceNotes` fields exist yet.
- `/analyze` displays and edits all current v2 fields locally in the analysis state.
- Notion persistence writes a concise v2 summary into the existing `Notes` rich_text field via `buildMealNotesSummary`.
- Because Notion `Notes` has a 2000-character limit, v3 Notion persistence should stay concise or deliberately omit detailed source lists until a richer persistence model exists.

Recommended Evidence-Aware Analysis v3 implementation plan:
1. Add typed v3 fields to `MealAnalysisResult`: `evidenceNotes: string[]`, `guidanceBasis: { sourceId: ApprovedSourceId; principleId: string; relevance: string }[]`, `safetyDisclaimer: string`, and `confidenceNotes: string[]`.
2. Add a small helper that formats `globalHealthSafetyRules` and selected `healthGuidancePrinciples` into concise prompt context, rather than duplicating guidance text by hand inside `route.ts`.
3. Update the OpenAI JSON schema and system prompt to require v3 fields, with strict instructions to cite only known `sourceId` and `principleId` values.
4. Keep v3 language general: family diabetes risk support, possible PCOS-supportive patterns, protein/fibre/satiety/carbohydrate-quality nudges, Canadian household context, Indian and Atlantic Canadian food-pattern preservation.
5. Explicitly prohibit diagnosis, treatment/cure/prevention claims, fertility claims, medication/supplement advice, and individualized clinical targets in both prompt context and output descriptions.
6. Update `/analyze` to display/edit v3 fields in one compact "Evidence & safety" section after the existing v2 strategy sections.
7. Update `buildMealNotesSummary` to include only a concise v3 summary: safety disclaimer, up to 3 evidence notes, up to 3 confidence notes, and compact `sourceId/principleId` references if space allows.
8. Keep USDA nutrient lookup out of v3 runtime analysis for now; use source registry and health-guidance principles only.
9. Add focused validation once implementation starts: typecheck, lint, build, and at least one API smoke test confirming the v3 shape.

Next required action before production smoke can complete:
- Provide a Vercel protection bypass token, use an authenticated `vercel curl` setup, or temporarily disable deployment protection for the test deployment.

## 2026-05-24 Ingredient Nutrient Enrichment USDA To Notion

Goals:
- Allow explicit Ingredient records in Notion to store lightweight USDA FoodData Central nutrient metadata.
- Inspect the existing Ingredients database schema first.
- Do not auto-create Notion schema from code.
- Do not change analysis prompts, Notion schema, auth, or runtime enrichment during meal analysis.

Schema inspection:
- Used `GET /api/diagnostics/notion-schemas`.
- Current Ingredients database properties:
  - `Category` select
  - `Fiber Source` checkbox
  - `Household Favorite` checkbox
  - `Ingredient` title
  - `Notes` rich_text
  - `Protein Source` checkbox
  - `Staple` checkbox
- Missing requested nutrient properties:
  - `FDC ID`
  - `FDC Description`
  - `Nutrient Source`
  - `Nutrient Confidence`
  - `Protein (g)`
  - `Fiber (g)`
  - `Carbohydrates (g)`
  - `Sugars (g)`
  - `Sodium (mg)`
  - `Energy (kcal)`
  - `Last Nutrient Lookup`

Files changed:
- `src/app/api/ingredients/enrich/route.ts`
- `src/app/settings/page.tsx`
- `docs/SOURCES.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added `POST /api/ingredients/enrich`.
- Input: `{ ingredientName: string, ingredientPageId?: string | null }`.
- Performs USDA lookup through existing FoodData Central integration.
- If no `ingredientPageId` is provided, returns lookup-only response and reports all Notion fields skipped.
- If `ingredientPageId` is provided, retrieves Ingredients database schema and updates only compatible existing properties.
- Skips missing/incompatible fields gracefully with per-field reasons.
- Added Settings `Enrich Ingredient Test` panel with ingredient name and optional Ingredient page ID inputs.
- Enrichment is explicit only; it is not called by meal analysis or ingredient suggestion persistence.

Commands run:
- `GET /api/diagnostics/notion-schemas` via local dev server.
- `npm run typecheck`
- `FDC_API_KEY=DEMO_KEY npm run dev -- -p 3011`
- `curl -i -X POST http://localhost:3011/api/ingredients/enrich ...` for `chickpeas`, `paneer`, and `basmati rice`.
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.
- Build output includes `/api/ingredients/enrich`.
- Enrichment endpoint tests with `DEMO_KEY` returned safe `502` responses because USDA returned `429` rate limits. This is expected with repeated DEMO_KEY diagnostics; use a real `FDC_API_KEY` to verify successful lookup/update behavior.

Decisions made:
- Do not create Notion nutrient properties automatically.
- Do not persist nutrient snapshots unless a page ID is explicitly provided and compatible properties already exist.
- Keep enrichment out of meal analysis and ingredient saving for now.
- Use direct page ID in Settings as a diagnostic tool, not a family-facing workflow.

Next recommended actions:
- Add the optional nutrient properties manually to the Ingredients database if persistence is desired.
- Configure a real `FDC_API_KEY` locally and in Vercel.
- Retest `/api/ingredients/enrich` with `chickpeas`, `paneer`, and `basmati rice`.
- Consider a future Ingredients list/detail UI so page IDs do not need to be pasted manually.

## 2026-05-24 USDA FoodData Central Ingredient Lookup Foundation

Goals:
- Add a narrow server-side USDA FoodData Central ingredient lookup endpoint.
- Keep `FDC_API_KEY` route-scoped through `getFoodDataCentralEnv()`.
- Add a Settings diagnostics/testing panel.
- Do not change analysis prompts, Notion ingredients, Notion schema, or auth.

Files changed:
- `.env.example`
- `src/lib/env.ts`
- `src/lib/sources/source-registry.ts`
- `src/lib/integrations/food-data-central/types.ts`
- `src/lib/integrations/food-data-central/client.ts`
- `src/lib/integrations/food-data-central/mappers.ts`
- `src/lib/integrations/food-data-central/index.ts`
- `src/app/api/ingredients/lookup/route.ts`
- `src/app/settings/page.tsx`
- `docs/SOURCES.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added `FDC_API_KEY` to server env typing and `.env.example`.
- Added `getFoodDataCentralEnv()` so only `/api/ingredients/lookup` requires the USDA key.
- Added FoodData Central client with timeout, safe server-side fetch, common-food-first search, and broader fallback.
- Added FoodData Central mapper that returns the normalized nutrient snapshot shape requested by the task.
- Added confidence heuristic and notes for branded/uncertain matches.
- Added `POST /api/ingredients/lookup` with validation: required ingredient, min 2 chars, max 100 chars.
- Added Settings `Ingredient Lookup Test` panel that calls the server route and displays nutrient snapshot fields.
- Kept analysis prompts, Notion schemas, Notion ingredient enrichment, and auth unchanged.

Commands run:
- `sed -n ...` inspections of env/settings/API/integration files.
- `rg --files -g '.env*' -g '!node_modules'`
- `rg "getFullServerEnv|getServerEnv|serverEnv" -n`
- `node -e ...` to check whether local `FDC_API_KEY` is present without printing its value.
- `FDC_API_KEY=DEMO_KEY npm run dev -- -p 3011`
- `curl -i -X POST http://localhost:3011/api/ingredients/lookup ...` for `chickpeas`, `basmati rice`, and `paneer`.
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.
- Initial endpoint tests using USDA `DEMO_KEY` returned `200 OK` for:
  - `chickpeas`
  - `basmati rice`
  - `paneer`
- Repeated endpoint tests later hit USDA `429` rate limiting from `DEMO_KEY`, returning the app's safe `502` response. Configure a real `FDC_API_KEY` for reliable diagnostics.

Decisions made:
- Keep FoodData Central lookup diagnostic-only for now.
- Prefer common USDA datasets when they produce a reasonable match, but allow broader/branded fallback.
- Mark branded or uncertain matches with limited confidence and review notes.
- Do not persist nutrient snapshots yet.

Known limitations:
- Matching is heuristic and should be reviewed via `matchedDescription`, `fdcId`, and `confidence`.
- Nutrient values are diagnostic snapshots, usually per 100 g, not recipe-level nutrition.
- DEMO_KEY is not reliable for repeated testing.

Next recommended actions:
- Add a real `FDC_API_KEY` locally and in deployment env vars.
- Smoke-test Settings lookup with common household ingredients.
- Decide later whether/how nutrient snapshots should attach to normalized ingredients without changing Notion schema prematurely.

## 2026-05-24 Verifiable Source and Health-Guidance Foundation

Goals:
- Create a typed approved source registry.
- Create safe health-guidance principle modules for diabetes-aware, PCOS-aware, and Canada's Food Guide-aligned future analysis.
- Do not call external APIs, change Notion schema, change analysis output, or add auth.
- Document the evidence-aware architecture.

Files changed:
- `src/lib/sources/source-registry.ts`
- `src/lib/health-guidance/types.ts`
- `src/lib/health-guidance/diabetes.ts`
- `src/lib/health-guidance/pcos.ts`
- `src/lib/health-guidance/canada-food-guide.ts`
- `src/lib/health-guidance/index.ts`
- `docs/SOURCES.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added approved source records for USDA FoodData Central, Health Canada / Canadian Nutrient File, Diabetes Canada, 2023 International Evidence-Based PCOS Guideline, Canada's Food Guide, and Open Food Facts.
- Source records include ID, name, source type, jurisdiction, URL, confidence, allowed uses, prohibited uses, and last-reviewed date.
- Added global health safety rules: no diagnosis, no treatment/cure/prevention claims, no replacement of clinician/dietitian advice, and general food-pattern support only.
- Added diabetes-aware principles with safe language and prohibited claims.
- Added PCOS-aware principles with safe language, weight-stigma avoidance, and prohibited clinical/fertility claims.
- Added Canada's Food Guide principles for balanced plate guidance and neutral highly processed food language.
- Added `docs/SOURCES.md` to explain the source registry, health-guidance principles, safety rules, and future architecture.
- Updated handoff docs to clarify this is a static foundation and is not wired into runtime analysis yet.

Commands run:
- Web verification for official source URLs.
- `mkdir -p src/lib/sources src/lib/health-guidance`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.

Decisions made:
- Add evidence-aware primitives before changing prompts, output schemas, UI, or persistence.
- Treat Open Food Facts as lower-confidence crowdsourced data.
- Keep health guidance source-linked through source IDs rather than free-text source names.
- Keep medical safety constraints explicit in code, not only in prompts.

Intentionally not changed:
- No external API calls.
- No Notion schema changes.
- No analysis output changes.
- No auth changes.
- No runtime behavior changes.

Next recommended actions:
- Plan a dedicated prompt/schema slice that uses source IDs and health-guidance principles without expanding medical claims.
- Add tests around source IDs if/when this foundation is used at runtime.
- Review source dates periodically and update `lastReviewed`.

## 2026-05-24 Recipe URL Analysis Support

Goals:
- Read current handoff docs and summarize the app state before editing.
- Start Recipe URL analysis support through the existing `src/lib/integrations/recipe-parser` boundary.
- Preserve manual paste analysis, editable review, meal saving, ingredient persistence, and feedback workflows.

Current state summary:
- MVP is a Next.js App Router app with OpenAI structured meal analysis and Notion persistence.
- `/analyze` previously accepted pasted recipe text or meal ideas only.
- Canada-first defaults, source metadata, structured ingredient types, and integration adapter folders were already added.
- URL import was the documented next slice.

Files changed:
- `src/lib/types/recipe.ts`
- `src/lib/integrations/recipe-parser/index.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/analyze/page.tsx`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Activated the recipe-parser adapter with a basic server-side URL parser.
- Added URL validation for `http`/`https` only and blocked obvious local/private hostnames.
- Added guarded server-side fetch with timeout, content-type check, and page-size limits.
- Added schema.org Recipe JSON-LD extraction for recipe name, ingredients, instructions, and description.
- Added cleaned HTML text fallback when JSON-LD is unavailable.
- Updated `/api/analyze-meal` to detect URL inputs in `recipeText`, parse the URL, and pass extracted recipe text into the existing OpenAI analysis flow.
- Returned source metadata (`sourceType: url`, source URL/name, parsed timestamp, parser version) with analysis results.
- Updated `/analyze` copy to accept recipe URLs and show a Recipe Source summary after analysis.
- Removed the visible debug text panel and Force Analyze button from `/analyze`.

Commands run:
- `sed -n ...` inspections of handoff docs, roadmap, decisions, known issues, analyze page, analyze API route, recipe parser stub, and package metadata.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `lsof -ti :3011`
- `npm run dev -- -p 3011`
- `curl -I http://localhost:3011/analyze`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.
- Local dev server started on `http://localhost:3011`.
- `curl -I http://localhost:3011/analyze` returned `200 OK`.

Decisions made:
- Use a dependency-free parser first instead of adding jsdom + @mozilla/readability in this slice.
- Keep `/api/analyze-meal` as the single analysis endpoint.
- Keep URL parser logic out of React components and route-local string parsing.
- Return clear 400-level parser errors that tell the user to paste recipe text when fetch/parse fails.

Known limitations:
- Cleaned HTML fallback is basic and less accurate than Readability.
- Some recipe sites may block server-side fetching or render content client-side.
- SSRF protection blocks obvious local/private hostnames but does not yet perform DNS resolution checks.
- No automated tests were added.

Next recommended actions:
- Deploy and smoke-test URL analysis with representative public recipe URLs.
- If real-site coverage is weak, add jsdom + @mozilla/readability behind the same adapter.
- Add structured ingredient persistence after URL parsing stabilizes.

## 2026-05-24 Canada-Centred Foundation

Goals:
- Review current MVP data model and codebase before editing.
- Prepare the foundation for a Canada-centred AI household meal operating system without rebuilding the app or adding live integrations.
- Preserve current recipe analysis, meal saving, ingredient persistence, meals list, and feedback workflows.
- Update the handoff package before ending the session.

Codebase assessment:
- Current app is a compact Next.js App Router MVP with OpenAI analysis and Notion persistence.
- Core data model lives in `src/lib/types`, Notion mapping lives in `src/lib/notion`, ingredient normalization lives in `src/lib/ingredients`, and persistence is handled by API routes.
- Notion schema is intentionally stable; prior sessions avoided new required properties and relation writes are schema-aware.
- Best minimal slice was a typed foundation plus backwards-compatible helper changes, not a full schema/UI migration.

Files changed:
- `src/lib/types/meal.ts`
- `src/lib/types/recipe.ts`
- `src/lib/types/localization.ts`
- `src/lib/types/pantry.ts`
- `src/lib/types/ai-analysis.ts`
- `src/lib/types/feedback.ts`
- `src/lib/ingredients/index.ts`
- `src/lib/household/preferences.ts`
- `src/lib/integrations/shared.ts`
- `src/lib/integrations/open-food-facts/index.ts`
- `src/lib/integrations/nutrition/index.ts`
- `src/lib/integrations/recipe-parser/index.ts`
- `src/lib/integrations/grocery-prices/index.ts`
- `src/lib/integrations/weather/index.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/api/notion/save-meal/route.ts`
- `src/app/settings/page.tsx`
- `src/lib/notion/mappers.ts`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added recipe source metadata fields and defaults for current manual/paste-based analysis.
- Updated `/api/analyze-meal` to accept optional source metadata and return source defaults.
- Updated `/api/notion/save-meal` to default source metadata and write optional source fields only when compatible Notion Meals properties already exist.
- Added structured `RecipeIngredient` support and updated ingredient normalization to accept either strings or structured ingredients.
- Added Canada-first household preference defaults and displayed them read-only in Settings.
- Added integration adapter stub folders for Open Food Facts, nutrition, recipe parser, grocery prices, and weather.
- Added type foundations for separate AI analysis records, household recipe feedback, operational recipe tags, and pantry items.
- Updated handoff docs with architecture notes, decisions, roadmap, known issues, and next slice.

Commands run:
- `pwd && rg --files -g '!*node_modules*' -g '!*.png' -g '!*.jpg' -g '!*.jpeg' -g '!*.gif'`
- `git status --short`
- `ls`
- Multiple `sed -n ...` inspections of core types, routes, pages, and docs.
- `mkdir -p src/lib/integrations/open-food-facts src/lib/integrations/nutrition src/lib/integrations/recipe-parser src/lib/integrations/grocery-prices src/lib/integrations/weather src/lib/household`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed: Node experimental Type Stripping warning from Next/build environment. Build still completed successfully.

Decisions made:
- Canada-first defaults are typed and read-only for now; no settings persistence UI yet.
- Future external APIs must go through adapter folders.
- AI enrichment remains separate from trusted canonical recipe fields.
- Structured ingredients were introduced through a compatible type/helper layer, not a destructive migration.
- Source tracking writes are optional and schema-aware so missing Notion properties do not break meal saving.
- Household recipe feedback is a future personalization layer; current feedback UI was preserved.

Intentionally not changed:
- No live Open Food Facts, nutrition, grocery pricing, flyer, weather, or parser integrations.
- No full pantry management.
- No full recipe URL import.
- No Notion schema creation from app code.
- No rewrite of current Analyze, Meals, or Feedback pages.

Open questions:
- Should optional Notion Meals properties be added manually now for source tracking, or wait until URL import is implemented?
- Which Canadian stores should seed `preferredStores` for Halifax/NS once settings persistence exists?
- Should structured ingredients be persisted in Notion first, or should recipe URL import come first and produce structured ingredient drafts?

Next recommended slice:
- Implement Recipe URL analysis through `src/lib/integrations/recipe-parser`, using server-side fetch/readability extraction, graceful fallback, and the source metadata already added here.

## 2026-05-23 Session Closeout

Goals:
- Update all persistent handoff docs to accurately reflect the completed Analysis Framework v2 state.
- Document the deferred Recipe URL analysis slice.
- No product feature changes.

Completed work:
- HANDOFF.md: updated timestamp, implemented features list, "Not implemented yet" list, "Immediate Next Tasks", "Current Blockers", Manual Testing Checklist (added v2 verification steps), feedback relation status note, Notion Notes property description for v2 summary. Removed stale deploy items that were already completed.
- ROADMAP.md: updated timestamp, replaced stale "Current Sprint" with current production verification tasks, added Recipe URL analysis to "Next Up", added validator tightening to "Next Up".
- KNOWN_ISSUES.md: updated timestamp, corrected feedback relation status wording, added v2 production smoke test needed, removed stale "Add PWA manifest" from Future Migrations (PWA is implemented).
- DECISIONS.md: updated timestamp, added decision record for deferring Recipe URL analysis with planned approach.
- SESSION_LOG.md: added this closeout entry.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Next recommended actions:
- Deploy to Vercel and smoke-test the full Analyze → Save → Meals path on the live URL.
- Confirm Notion Notes contains v2 summary on a saved meal.
- Next feature session: Recipe URL analysis support.

## 2026-05-23 Analysis Framework v2

Goals:
- Expand OpenAI structured output with v2 metabolic analysis fields.
- Display and edit all v2 fields in /analyze before save.
- Persist a concise v2 summary into the existing Notion Notes field without schema changes.

Completed work:

Slice 1 — Types and API:
- Extended `MealAnalysisResult` in `src/lib/types/meal.ts` with 16 required v2 fields: 5 numeric scores (1–10) and 11 string/array fields.
- Updated `src/app/api/analyze-meal/route.ts` JSON schema and system prompt to produce all v2 fields with minimal-change framing, cultural awareness, and insulin-resistance-supportive scoring.
- Updated `src/app/api/notion/save-meal/route.ts` validator to pass v2 fields through for TypeScript compatibility; v2 fields accepted leniently (defaults to 0/empty) for backward compatibility.

Slice 2 — UI:
- Updated `src/app/analyze/page.tsx` to initialize, display, and edit all v2 fields.
- Added `EditableScoreField` type, 5 v2 array text state vars, `updateScore` and `updateArrayField` handlers.
- Added 12 new UI sections organized into: Quick Verdict, Scorecard (5 number inputs), Concerns & Improvements, Strategy, Shopping & Prep.
- Added `SectionHeader` and `ScoreInput` components.

Slice 3 — Notion persistence:
- Created `src/lib/notion/meal-notes.ts` with `buildMealNotesSummary()`.
- Summary includes: original notes, quick verdict, scorecard, main concerns, plate strategy, cautions.
- Truncates at 1997 characters to respect the Notion 2000-character rich_text block limit.
- Updated `src/lib/notion/mappers.ts` to write `buildMealNotesSummary(meal)` to the Notion `Notes` property.
- No new Notion properties added. Existing schema unchanged.
- Updated HANDOFF, ROADMAP, DECISIONS, and KNOWN_ISSUES docs.

Verification:
- `npm run typecheck` passed (all slices).
- `npm run lint` passed (all slices).
- `npm run build` passed (all slices).
- `POST /api/analyze-meal` curl test returned full v2 shape.
- v2 field identifiers confirmed in compiled JS bundle.

Known issues introduced:
- save-meal validator leniency (documented in KNOWN_ISSUES).
- Notes field 2000-char truncation (documented in KNOWN_ISSUES).

Next recommended actions:
- Deploy to Vercel and confirm /analyze v2 fields appear after a real analysis.
- Save one analyzed meal and confirm Notion Notes contains the v2 summary.
- Confirm /meals still loads after save.

## 2026-05-23

Goals:
- Add true Notion relation support between Meal Feedback and Meals when a selected saved meal is used.
- Do not modify Notion schema from the app.
- Keep manual feedback and missing-relation fallback working.

Important schema finding:
- Current Meal Feedback schema does not include a `Meal` relation property.
- Meal Feedback -> Meals relation property must be created manually in Notion before relation writes are enabled.

Completed work:
- Updated `MealFeedbackRequest` with `selectedMealId?: string | null`.
- Updated `/feedback` to keep the selected meal page ID separately from manual entry mode.
- Selected saved meals now submit their Notion page ID to `/api/notion/log-feedback`.
- Manual feedback submits `selectedMealId: null` and continues to work as before.
- Updated `/api/notion/log-feedback` to inspect the Feedback database schema before writing a relation.
- If a compatible `Meal` relation property exists, selected-meal feedback writes a relation to the selected Meal page.
- If the relation property is missing, feedback still saves and returns a safe warning.
- Updated the save success UI to show non-blocking API warnings.
- Added manual Notion setup instructions to handoff docs and updated roadmap/known issues.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Manual feedback API smoke test saved successfully with `selectedMealId: null`.
- Selected-meal feedback API smoke test saved successfully and returned the expected missing-relation warning.

Next recommended actions:
- Manually create the Meal Feedback `Meal` relation property in Notion.
- Retest selected-meal feedback and confirm the relation writes.

## 2026-05-23 Schema Diagnostics

Goals:
- Add read-only Notion schema diagnostics for active Meals, Ingredients, and Meal Feedback databases.
- Surface exact database property names and types before adding relations.

Completed work:
- Added `GET /api/diagnostics/notion-schemas`.
- The route retrieves Meals, Ingredients, and Feedback schemas using scoped env helpers.
- The response includes safe database summaries with key, ID, title, and property name/type pairs.
- The route does not expose API keys and logs detailed failures server-side only.
- Added a `Test Notion Schemas` button to `/settings`.
- Settings now displays database names, IDs, property lists, and safe per-database errors.
- No Notion schema, relation, or save behavior changes were made.
- Updated handoff and roadmap docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local `GET /api/diagnostics/notion-schemas` returned Meals, Ingredients, and Feedback property lists.

Next recommended actions:
- Use Settings schema diagnostics to inspect relation-capable properties before implementing relations.

## 2026-05-23 Ingredient Persistence

Goals:
- Persist ingredient suggestions into Notion Ingredients when a meal is saved.
- Keep ingredient persistence non-blocking and avoid adding Notion relations.

Completed work:
- Added `src/lib/ingredients` normalization utilities for trimming, malformed filtering, deduplication, lowercase matching, and light singular/plural matching.
- Added `getNotionIngredientsEnv()` for route-scoped Ingredients configuration.
- Added `POST /api/notion/save-ingredients`.
- The new ingredients route retrieves the Ingredients database schema, uses its title property for ingredient names, and avoids duplicate creation by normalized title.
- The route writes source meal name and created date only when compatible optional properties exist.
- Updated `/analyze` save flow to trigger ingredient persistence after meal save succeeds.
- Meal save remains successful if ingredient persistence fails.
- Added helper UI that reports ingredient saving, success, skip, or failure after meal save.
- Updated handoff, roadmap, and known issues docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local empty-list `POST /api/notion/save-ingredients` returned 200 without creating records.

Next recommended actions:
- Test Analyze -> Save to Notion against the production Ingredients database.
- Confirm duplicate ingredient suggestions are skipped on repeated saves.

## 2026-05-23 PWA Foundation

Goals:
- Add mobile PWA foundation and iPhone polish without adding native mobile code.

Completed work:
- Added Next.js app metadata for `Metabolic Meal OS`.
- Added mobile viewport settings with `viewport-fit=cover` and theme color.
- Added `src/app/manifest.ts` for `/manifest.webmanifest`.
- Added original placeholder SVG icons and generated PNG icon variants in `public/icons`.
- Added iPhone safe-area padding and horizontal overflow protection.
- Increased mobile tap targets for navigation and buttons.
- Increased mobile form control font sizes and heights to reduce iPhone Safari zoom and improve comfort.
- Added README instructions for iPhone Add to Home Screen, Vercel remote testing, and LAN testing.
- Updated handoff, roadmap, and architectural decision docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local `GET /manifest.webmanifest` returned 200 with manifest JSON.
- Local `HEAD /icons/apple-touch-icon.png` returned 200.

Next recommended actions:
- Deploy the PWA foundation to Vercel.
- Test Add to Home Screen from iPhone Safari on the public HTTPS URL.

## 2026-05-23 Feedback Meal Selection

Goals:
- Add saved-meal selection to feedback logging without changing Notion schema or API behavior.

Completed work:
- Updated `/feedback` to fetch saved meals from `GET /api/notion/meals`.
- Added a Meal dropdown with saved meals and a manual entry option.
- Selecting a saved meal fills Feedback Entry with the meal name.
- Feedback Entry remains editable after selection.
- Added a loading state for saved meals.
- Added a non-blocking warning when saved meals cannot load, while preserving manual feedback logging.
- Added helper copy noting that only the meal name is saved until a future Notion relation is added.
- Updated handoff, roadmap, and known issues docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local `GET /feedback` returned 200.
- Local `GET /api/notion/meals` returned saved meals.

Next recommended actions:
- Deploy the feedback meal selection change to Vercel.
- Smoke test `/feedback` with both saved-meal selection and manual entry on the public HTTPS deployment.

## 2026-05-23 Route-Scoped Env Refactor

Goals:
- Refactor environment validation so API routes only require the variables they actually use.
- Update documentation to reflect that GitHub and Vercel deployment are live.

Completed work:
- Added route-scoped env helpers in `src/lib/env.ts`: `getOpenAIEnv()`, `getNotionMealsEnv()`, `getNotionFeedbackEnv()`, and `getFullNotionEnv()`.
- Added `getFullServerEnv()` and kept `getServerEnv()` as a compatibility alias.
- Updated `/api/analyze-meal` to require only `OPENAI_API_KEY`.
- Updated `/api/diagnostics/notion`, `/api/notion/meals`, and `/api/notion/save-meal` to require only `NOTION_API_KEY` and `NOTION_MEALS_DATABASE_ID`.
- Updated `/api/notion/log-feedback` to require only `NOTION_API_KEY` and `NOTION_FEEDBACK_DATABASE_ID`.
- Updated the Notion client to accept an already-validated API key while preserving the existing default behavior.
- Updated handoff, roadmap, and known issues docs for the live GitHub/Vercel state.

Important discoveries:
- GitHub repo exists and is pushed.
- Vercel deployment exists and succeeded.
- Public HTTPS deployment is live.
- Production Notion diagnostics originally failed because global env validation required `NOTION_INGREDIENTS_DATABASE_ID`; adding missing Vercel env vars fixed production, but route-scoped validation is the durable fix.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Next recommended actions:
- Deploy the route-scoped env validation change to Vercel.
- Smoke test `/settings`, `/analyze`, `/meals`, and `/feedback` on the public HTTPS deployment.

## 2026-05-23 Earlier Documentation Session

Goals:
- Create a durable handoff system for multi-session development.
- Document current architecture, decisions, roadmap, issues, and operational procedures.

Completed work:
- Added `docs/HANDOFF.md`.
- Added `docs/ARCHITECTURE.md`.
- Added `docs/ROADMAP.md`.
- Added `docs/DECISIONS.md`.
- Added `docs/KNOWN_ISSUES.md`.
- Added `docs/SESSION_LOG.md`.
- Added mandatory start-of-session and end-of-session procedures.
- Documented local, Vercel, GitHub, env, Notion, key rotation, and recovery workflows.
- Scrubbed real-looking secrets from `.env.example`.

Important discoveries:
- `.env.example` contained real-looking OpenAI and Notion credentials. The file was scrubbed, but those keys should be considered compromised and rotated.
- Vercel deployment had not yet been verified at that time.

Blockers:
- Rotate exposed keys if not already completed.

Next recommended actions:
- Rotate OpenAI and Notion keys if not already completed.
- Test Settings diagnostics, Analyze, Save to Notion, Meals, and Feedback from the public HTTPS URL after deploying the env refactor.

## 2026-05-23 Earlier Sessions

Goals:
- Build production-quality MVP foundations for Metabolic Meal OS.
- Implement meal analysis, Notion persistence, diagnostics, saved meals, and feedback logging.

Completed work:
- Scaffolded Next.js App Router app.
- Added dashboard layout and routes.
- Added server-side env config.
- Added OpenAI meal analysis endpoint with structured outputs.
- Wired `/analyze` to API and editable review form.
- Added Save to Notion for analyzed meals.
- Added Notion diagnostics in Settings.
- Added `/meals` Notion-backed saved meal list.
- Added `/feedback` meal feedback logging to Notion.

Important discoveries:
- Notion SDK version uses `dataSources.query` rather than `databases.query`.
- Database retrieval is needed to get the primary data source ID.
- Some local browser plugin checks can block localhost; command-line and normal browser checks remain useful.

Blockers:
- No auth yet.
- No PWA support yet.
- Vercel deployment had not been verified yet in that earlier session.

Next recommended actions:
- Add PWA/iPhone home-screen support.
- Add meal-feedback relations.
