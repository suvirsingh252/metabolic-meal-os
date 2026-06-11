# Architectural Decisions

Last updated: 2026-06-11 (Weekly Dinner Planner v1)

## 2026-06-11 — Weekly Planner v1 Is Dinner-Only And Notion-Backed

Decision: Add `/planner` as a small Notion-backed dinner planner using a dedicated Meal Plan database, while modeling every row with `Meal Slot` for future breakfast/lunch/snack expansion.

Reasoning:
- The immediate family need is to assign saved dinners to the current week, clear them, and mark what happened.
- Saved Meals already contain the household meal archive, so planner v1 should relate to those records rather than inventing meals or nutrition.
- Missing planner configuration must not break the deployed app; `/planner` and Settings diagnostics should explain setup gaps and block writes safely.
- AI weekly generation, grocery lists, and drag-and-drop are intentionally deferred until manual planning behavior is trusted.

Implementation:
- `GET /api/planner` returns current Monday-Sunday dinner slots and setup diagnostics.
- `POST /api/planner` validates `YYYY-MM-DD` dates, allowed slots/statuses, and Notion meal page IDs before assigning, clearing, or updating status.
- `src/lib/notion/meal-plan.ts` reads the active Meal Plan data source schema before writes and only updates the planner row, never saved meal nutrition or feedback records.

## 2026-06-11 — Beta 3.6 iPhone Share Intake Uses Dedicated Token And Optional Persistence

Decision: Use a separate `IOS_SHORTCUT_TOKEN` for the iOS Shortcut endpoint rather than sharing `APP_AUTH_TOKEN`. Persist intake to an optional dedicated Notion database, and let the analyze page load the record server-side from the Notion page ID.

Reasoning:
- The iOS Shortcut is a separate automated client, not a browser session. Sharing the general `APP_AUTH_TOKEN` would expose it to the Shortcut definition (accessible in iCloud/device backup). A dedicated token limits blast radius if rotated.
- Intake persistence is optional so the endpoint works before the Notion Intake database is created. Families can try the Shortcut, see the analyzeUrl, and add persistence later.
- `/analyze` was the most natural entry point. Converting it to a server component allows Notion fetch at request time without a separate client-side API call.
- Classification is heuristic (path-based for recipe URLs, domain-based for social). Social fallback copy warns users not to rely on automatic parsing of captions/ingredients.

## 2026-06-11 — Beta 3.5 Trust Depends On Active Data-Source Persistence

Decision: Treat the active Notion data source, not the parent database object, as the source of truth for optional Meals schema detection during `save-meal`.

Reasoning:
- The Beta 3.5 lifecycle audit showed Analyze generated nutrition and Save succeeded, but Notion retrieval and Dashboard still showed nutrition as unavailable.
- Schema diagnostics already read the active data source and showed compatible nutrition fields existed; `save-meal` was checking a different schema surface before optional writes.
- A family cannot trust Dashboard if nutrition appears in review but is silently skipped before persistence.

Fix:
- `POST /api/notion/save-meal` now retrieves the primary Meals data source before mapping optional nutrition/source/quality fields.
- The live numeric `Nutrition Confidence` property is supported with `low=1`, `medium=2`, `high=3` and maps back to labels on read.
- No automatic Notion schema mutation was added.

## 2026-06-11 — Recommendation Copy Must Not Overclaim Feedback

Decision: Keep Today recommendation reasons tied to real evidence and allow `Suggest Another` to cycle through available category options after temporary exclusions are exhausted.

Reasoning:
- The audit required checking whether labels such as loved, worth repeating, or recently successful were supported by data.
- Repeated saved meal records are useful variety evidence, but they are not the same as household feedback.
- Mobile users reported `Suggest Another` as broken; exhausting the temporary exclusion list made a normal interaction look like a dead end.

Fix:
- Repeated saved meal copy now says `Repeated in saved meals.` instead of implying success.
- Feedback-backed reasons still come from Meal Feedback summaries.
- `Suggest Another` now falls back to the rest of the category when exclusions exhaust the pool.

## 2026-06-11 — Beta 3 Usability Uses Household Language And Progressive Disclosure

Decision: Keep Notion as the persistence layer, but remove Notion/backend language from normal household flows and move implementation details behind Advanced or Settings-oriented surfaces.

Reasoning:
- Pre-Beta 3 simulation showed that users interpreted Notion labels, raw notes, provenance, and diagnostics as internal machinery rather than household guidance.
- The highest-impact fixes were copy, layout, and behavior clarity, not a persistence rewrite.
- Normal flows should say `Save meal`, `Saved to Meal OS`, `Saved meals`, and `Open saved record` only inside Advanced details where an external record link remains useful.
- Dashboard and Meal Detail should start with household summaries before metrics, provenance, or source diagnostics.

Feedback semantics:
- `Ate This` records eaten only.
- `Loved It` records eaten, loved, and worth repeating.
- Meal Detail `Would Make Again` is treated as repeat-only in household summaries.
- Today undo remains client-side only; persisted undo/reversal is deferred until explicit backend behavior and product rules exist.

Tradeoffs:
- External Notion links still exist for admin/debug usefulness, but they are not primary household actions.
- Raw notes and provenance remain available under Advanced details instead of being removed.
- Persisted reversal/delete was intentionally not added in this slice to avoid implying history was changed when the existing API only appends feedback.

## 2026-06-11 — Today Recommendations Stay Deterministic And Schema-Neutral

Decision: Build Adaptive Recommendation Engine v1 as deterministic domain scoring from existing saved meal metadata and existing household feedback summaries, with component explanations surfaced on Today cards.

Reasoning:
- Today needs to learn from household behavior before adding planning workflows, but feedback data is sparse and uneven.
- Existing Notion Meals and Meal Feedback data already provide enough signals for a first adaptive layer.
- Splitting scores into preference, recency, variety penalty, and saved scheduling metadata makes ranking inspectable and testable.
- Recommendation explanations should come from the exact score inputs used for ranking, not separate generated copy.

Tradeoffs:
- This is not predictive coaching, AI recommendation, collaborative filtering, or ML.
- Sparse households still lean heavily on saved meal metadata and recency until more feedback exists.
- The app does not add Notion properties, so detailed recommendation telemetry is not persisted yet.

## 2026-06-11 — Feedback Refresh Is Optimistic And Schema-Neutral

Decision: Add optimistic feedback refresh to Meal Detail and Today, plus a compact Today household learning strip and client-only undo, without changing Notion schema or adding a new database.

Reasoning:
- The household app must make feedback actions feel trustworthy immediately; waiting for Notion read consistency makes users wonder whether a tap worked.
- The existing `POST /api/notion/log-feedback` route and feedback summary behavior are sufficient for this polish slice.
- A shared optimistic summary helper keeps Today and Meal Detail behavior consistent without introducing global state or new infrastructure.
- Today's Recent Household Learning strip can be derived from existing per-meal feedback summaries, so no new fields are required.

Tradeoffs:
- Optimistic updates are local UI state until the server refresh and Notion read path catch up.
- Today undo is client-only. It restores the local Today view and learning strip but does not delete or reverse the Notion feedback record.
- A future persisted reversal/delete workflow would need explicit backend behavior and product rules before the UI can claim Notion history was changed.

## 2026-05-26 — Historical Reliability Is Read-Time And Non-Mutating

Decision: Add a read-time reliability layer for historical Meals: conservative metadata backfill, schema health warnings, dashboard source/completeness indicators, and sparse-data guards without a Notion write-back migration.

Reasoning:
- Historical records may predate nutrition persistence, quality fields, or provenance fields, so dashboard trust needs visible denominators and source mix.
- Backfilling derived metadata from existing saved fields and legacy Notes is safer than inventing precise nutrition totals.
- Operators should see optional Notion schema gaps clearly, but schema changes remain manual and reviewable.

Tradeoffs:
- Old meals are not rewritten, so Notion rows may still look sparse outside the app.
- Exact calories/macros are still unknown when not saved.
- Weekly quality and best/opportunity callouts can be unavailable until enough scored meals exist.

## 2026-05-25 — Estimate Review Hardening Prioritizes Clarity Over Precision

Decision: Harden the estimate review UI, mobile wrapping, provenance transitions, and household shorthand fixtures without expanding into advanced nutrition modeling.

Reasoning:
- Beta reliability now depends on users understanding whether nutrition is structured, estimated, reviewed, manually edited, or unavailable.
- Real household entries are short and varied, so deterministic fixture coverage for common shorthand is more valuable than adding many precise nutrients.
- Provenance should stay traceable after repeated serving changes, butter toggles, and manual edits without accumulating stale notes.

Tradeoffs:
- The estimator remains intentionally incomplete and only fills calories, protein, and fiber.
- No Notion schema changes were added; existing nutrition source/provenance/confidence fields already carry reviewed estimate and manual override context.
- Mobile improvements use existing Tailwind/UI primitives, not a new design dependency.

## 2026-05-25 — Serving Size Controls Stay Coarse And Reviewable

Decision: Extend the deterministic free-text estimator with lightweight serving-size parsing and add compact estimate review controls on `/analyze`, without adding Notion properties or heavy nutrition modeling.

Reasoning:
- The biggest practical weakness in Good Enough Nutrition Estimation v1 was treating `gobi parantha with butter`, `2 gobi paranthas with butter`, `half bowl dal`, and `large chicken salad` as the same portion.
- Deterministic parsing for a small set of common quantity words, numbers, bowl phrases, large/small modifiers, and butter inclusion is safer than model-generated nutrition.
- Users need a quick way to adjust an estimated serving before save without turning the review page into a clinical macro calculator.

Tradeoffs:
- Controls are beta-grade and intentionally coarse: `0.5x`, `1x`, `1.5x`, `2x`, plus butter add/remove.
- Only calories, protein, and fiber are estimated; sodium, sugar, fat, and carbs remain `null` unless structured nutrition or user review supplies them.
- Reviewed estimates are saved as `user-entered` with provenance that records the original estimate and review action.

## 2026-05-25 — Free-Text Nutrition Estimation Is Conservative And Limited

Decision: Add a deterministic free-text estimate path for manual meal descriptions that have enough recognizable food detail, filling only calories, protein, and fiber with `nutritionEstimate.source: estimated`.

Reasoning:
- Many real household entries are short free-text meals such as `gobi parantha with butter`, and dashboards are less useful when these common meals have no calories/protein/fiber.
- A small internal rule set is safer and more testable than asking OpenAI to invent exact nutrition.
- Sodium, sugar, fat, and carbs are more likely to create false precision in this slice, so they remain `null` unless structured nutrition or user review provides them.

Tradeoffs:
- Estimates are intentionally incomplete, conservative, and not clinical-grade.
- Serving assumptions are coarse household portions and must be reviewable before save.
- Coverage is limited to common components such as paratha/parantha, gobi/cauliflower, butter, eggs, chicken, paneer, dal/lentils, rice, yogurt/curd, roti/chapati, oats, salad/vegetables, toast, wraps/rolls, and leftover curry/sabzi.

## 2026-05-25 — Dashboard Intelligence Uses A Stable View Model

Decision: Build dashboard intelligence through a pure analytics domain layer and a stable `DashboardViewModel`, returned by `GET /api/dashboard`.

Reasoning:
- The dashboard needs deterministic daily/weekly aggregation, target progress, rule-based insights, recent meals, and quality summaries without embedding business logic in React.
- `DashboardViewModel` gives the UI a stable contract while persistence and nutrition completeness evolve.
- Dashboard insights must be rule-based in this slice and must not call OpenAI.

Tradeoffs:
- Charts, predictive coaching, household analytics, and ML remain deferred.
- Missing nutrition values remain unknown, so early dashboards are only as complete as saved meal data.

## 2026-05-25 — Meal Nutrition Totals Require Provenance Or Review

Decision: Persist meal-level nutrition totals only when they come from recipe structured nutrition facts, conservative free-text estimates, or user-entered review values, and keep confidence/provenance/source with those totals.

Reasoning:
- Existing ingredient-level FoodData Central snapshots are usually per-100g and cannot safely become recipe-level totals without quantities and serving logic.
- OpenAI should not invent exact calories or macros. The estimate path is deterministic code, not model-generated nutrition.
- The dashboard needs nutrition fields, but reliability matters more than filling every cell.

Tradeoffs:
- Legacy meals often lack exact nutrition totals.
- JSON-LD nutrition varies by recipe site and may be incomplete.
- Free-text estimates cover only calories/protein/fiber and are labeled as estimates.
- Users may need to enter or correct totals manually in the review flow; user edits and reviewed serving adjustments override estimated provenance with `user-entered` review provenance.

## 2026-05-25 — Notion Schema Remains Operator-Controlled

Decision: Continue to avoid automatic Notion schema creation or mutation. Nutrition, score, and quality fields are written only when compatible properties already exist.

Reasoning:
- Notion remains the operator-controlled source of truth.
- Schema-aware writes avoid breaking existing databases and keep deployment safer.
- Manual schema changes can be reviewed before production data starts filling new fields.

Tradeoffs:
- New persistence fields are inactive until the operator adds compatible Notion properties.
- A future migration/checklist or write-back job is needed for legacy records.

## 2026-05-25 — Meal Quality V1 Is Rule-Based And Backfillable

Decision: Add a 0-100 meal quality score from nutrition density and simple food-pattern signals, with read-time fallback from legacy scorecards when exact nutrition totals are unavailable.

Reasoning:
- The dashboard needs a compact quality signal before richer coaching exists.
- A rule-based score is explainable and testable.
- Legacy scorecards in Notes should still provide useful quality ordering without inventing nutrients.

Tradeoffs:
- This is not predictive coaching, ML, medical scoring, or individualized diet advice.
- Quality component fields such as sodium score, sugar score, diversity score, and processing score are not persisted yet.

## 2026-05-25 — Meal Analysis V1 Is A Versioned Service Boundary

Decision: Move meal-analysis prompt, JSON schema, model config, source context, request validation, recipe preparation, response parsing, fallback behavior, and OpenAI orchestration into `src/lib/ai/meal-analysis/v1`, leaving the API route as a thin controller.

Reasoning:
- Prompt/schema/model changes need versioned homes before adding evals or future model upgrades.
- Route-local orchestration made safety and validation harder to test.
- Response metadata should record the analysis version and model used.

Tradeoffs:
- Golden evals are still lightweight unit tests, not a full model-quality evaluation suite.

## 2026-05-25 — Analyze Page Uses Reducer And Component Sections

Decision: Split `/analyze` into a reducer, controller hook, and focused components without redesigning the household review UI.

Reasoning:
- The page had too many interleaved state transitions and view sections.
- Reducer transitions are testable and make save/analyze/edit behavior easier to inspect.
- Preserving copy and layout avoids destabilizing the MVP during hardening.

Tradeoffs:
- Component boundaries are now much better, but individual review sections can still be split further later.

## 2026-05-25 — Ownership Metadata Is Config-Derived Until Real Auth Exists

Decision: Add `householdId`, `createdBy`, `visibility`, and `schemaVersion` metadata using private deployment configuration, and project/filter it in Notion where supported.

Reasoning:
- Records need a migration path toward household ownership before full auth exists.
- The app must not pretend to know a logged-in user when it only has private/token mode.

Tradeoffs:
- This is not multi-user auth or RBAC.
- Notion filtering only applies when compatible properties exist.

## 2026-05-25 — Beta Hardening Keeps Private Deployment As The Tenancy Boundary

Decision: Add shared route guards, middleware token checks, bounded JSON parsing, and in-memory rate limiting while explicitly treating the current app as a private single-household deployment unless `APP_AUTH_TOKEN` is configured.

Reasoning:
- The current Notion persistence model has no durable household ownership field, so public multi-tenant deployment would be unsafe.
- A token/private-mode gate is a pragmatic beta-safe guard while real auth and household partitioning are designed.
- Request-size and rate limits reduce accidental abuse and runaway external API costs for meal analysis, URL intake, Notion writes, and FoodData Central enrichment.

Tradeoffs:
- This is not full user auth, RBAC, or distributed rate limiting.
- Multi-household data separation remains a future migration.

## 2026-05-25 — Nutrition Values Require Explicit Provenance And Basis

Decision: Introduce canonical nutrition snapshots under `src/lib/domain/nutrition` and require FoodData Central mappings to carry `amountBasis`, `basisUnit`, `per100g`, source ID, confidence, matched food state, nutrients, and verification time.

Reasoning:
- Plain `Protein (g)` or `Fiber (g)` values are misleading without a per-100g or serving basis.
- FoodData Central search results are useful reference data, but they must remain distinguishable from meal-level calculated nutrition.

Tradeoffs:
- Existing Notion schemas without basis fields will now skip plain nutrient writes rather than silently persisting ambiguous numbers.
- Automatic nutrition use in analysis remains deferred.

## 2026-05-25 — Save Meal Validation Is Strict For Generated Fields

Decision: Replace lenient `save-meal` defaults with a shared domain validator that rejects missing v2/v3 required fields instead of defaulting scores to `0` or text/arrays to empty values.

Reasoning:
- Missing generated fields should be treated as malformed payloads, not plausible meal records.
- Strict validation preserves the difference between absent, intentionally empty, and calculated values.

Tradeoffs:
- Very old clients or saved payload shapes may need to re-run analysis before saving.

## 2026-05-24 — Analyze Intake Classifies Shared URLs

Decision: Extend the existing dependency-free `recipe-parser` adapter so `/analyze` treats shared URLs as a first-class intake path. The adapter now classifies sources as `manual-text`, `recipe-page`, `social-video`, `video-page`, `short-link`, or `unknown-url`; strips common tracking parameters; follows normal redirects; re-checks obvious local/private hosts after redirects; prefers Recipe JSON-LD; and falls back to bounded metadata/page text. Social/video links only proceed to OpenAI when accessible title/description metadata contains enough recipe-like detail.

Reasoning:
- The product priority shifted toward robust intake for links families actually share: recipe blogs, TikToks, Instagram Reels, YouTube Shorts, and short links.
- The app should accept valid-looking shared links and fail helpfully rather than silently treating them as poor manual text or returning generic parser errors.
- TikTok, Instagram, and YouTube often hide captions/transcripts behind platform protections or client JavaScript; the app should not bypass those protections.
- Keeping this inside the adapter preserves the existing `/api/analyze-meal` route and `/analyze` page flow.

Tradeoffs:
- This remains dependency-free and is still less robust than a full HTML Readability parser.
- No browser automation, video download, external scraping service, or platform bypass was added.
- Social/video analysis is intentionally low-confidence and only possible when accessible metadata itself contains enough recipe detail.
- `sourceClassification` and `sourceNotes` are returned to `/analyze`, but no Notion schema changes were added.

## 2026-05-24 — Ingredient Relations Are Schema-Aware And Non-Blocking

Decision: Extend ingredient suggestion persistence so `/api/notion/save-ingredients` can relate new and existing Ingredient pages to the saved Meal when the active Ingredients data source has a compatible relation property pointing to the configured Meals database or primary Meals data source.

Reasoning:
- The app should improve Notion relational usefulness without creating or mutating schema.
- Duplicate Ingredient detection remains important because Ingredients are household staples, not per-meal line items.
- Existing Ingredients should accumulate Meal relations over time instead of being recreated.
- Missing relation schema should not block saving Meals or Ingredients.

Tradeoffs:
- The route still saves normalized ingredient names only; structured quantities, units, and recipe-line persistence remain deferred.
- Existing Ingredient relation updates depend on the relation values returned by the Notion page payload. If Notion reports a relation with more linked pages than the payload includes, the route skips that relation update to avoid overwriting existing links.
- The active schema has been locally verified with a `Meals` relation, but production should still be checked after deploy.

## 2026-05-24 — Analyze First Answer Uses Household Language

Decision: Tune the `/api/analyze-meal` prompt and `/analyze` review flow so the first household answer prioritizes plain language, same-dish minimal nudges, culturally realistic starch guidance, and mobile movement to the generated result.

Reasoning:
- Real-meal review showed the core product value depends more on the first answer feeling practical and culturally preserving than on deeper persistence work.
- Indian rice meals should not default to brown-rice or whole-grain swaps when smaller basmati portions, more dal/chana, kachumber, yogurt, extra sabzi, or half rice/half veg better preserve the meal.
- Evidence and confidence notes should support trust without making the household screen feel clinical.
- Mobile users should land on the generated review after analysis instead of having to hunt below the input.

Tradeoffs:
- Prompt tuning improves likely output quality but does not guarantee every model response will avoid clinical phrasing.
- The schema and Notion payload remain unchanged, so deeper field-level separation of household guidance vs. evidence/admin details remains future work.
- Browser automation could not complete a generated-result mobile test because the in-app browser virtual clipboard was unavailable; command-line API checks covered output quality.

## 2026-05-24 — Analyze Review Starts With Household Guidance

Decision: Keep the existing `/analyze` data model and editable fields, but reorganize the review UI so it starts with a household-first summary and moves detailed editing into progressive sections.

Reasoning:
- Non-technical household users need the first screen to answer whether the meal is workable, what small change helps most, and why.
- Evidence-aware guidance, safety notes, numeric scores, source metadata, and raw saved fields are important but should not dominate everyday meal decisions.
- Preserving every editable field avoids a backend or persistence rewrite while reducing cognitive load.

Tradeoffs:
- This is a first hierarchy pass, not a full design-system overhaul.
- Native progressive disclosure keeps the implementation small, but the rest of the app still needs similar UX simplification.
- The top summary depends on current generated fields and should be reviewed against real household meals for tone and usefulness.

## 2026-05-24 — FoodData Central Matching Prefers Suitable Generic Records

Decision: Improve USDA FoodData Central match selection to prefer suitable generic/common records before branded records, while preserving safe branded fallback when no suitable generic match is returned.

Reasoning:
- Household staples like paneer, chickpeas, lentils, yogurt, rice, and flours should not silently enrich from branded products when a generic USDA record is available.
- Foundation, SR Legacy, and Survey/FNDDS records are usually better defaults for household ingredient pages than branded records.
- Match uncertainty should be visible through notes and optional metadata rather than hidden behind a single confidence value.

Tradeoffs:
- Matching remains heuristic and depends on USDA search results.
- Culturally specific or variety-specific foods may still require targeted query expansion.
- Branded records remain necessary fallback data for foods with no suitable generic/common result.

## 2026-05-24 — Ingredient Enrichment Uses Explicit Picker

Decision: Add a read-only `GET /api/notion/ingredients` route and Settings picker so USDA enrichment can update an existing Notion Ingredient without manual page ID copy/paste.

Reasoning:
- Page IDs are acceptable for diagnostics but are not a durable household UX.
- Enrichment should remain explicit and user-triggered before it influences analysis or household data.
- Reusing existing Ingredients preserves Notion as the reviewable source of household ingredient truth.

Tradeoffs:
- The picker loads existing Ingredient pages but does not create new Ingredients.
- Matching quality still depends on USDA FoodData Central search results.
- Enrichment remains a Settings/admin workflow rather than an automatic analysis step.

## 2026-05-24 — Production Smoke Tests Are Read-Only First

Decision: Add `scripts/smoke-test.ts` and `npm run smoke:prod` as a read-only production health check driven by `SMOKE_BASE_URL`.

Reasoning:
- Manual production checks are becoming fragile as the app adds Notion, USDA, recipe parsing, and evidence-aware analysis capabilities.
- The first automation layer should verify availability and configuration health without creating data, calling OpenAI, or consuming unnecessary model/API budget.
- A small TypeScript script keeps the workflow easy to run locally and from future CI.

Tradeoffs:
- This smoke test does not verify OpenAI analysis quality or Notion write flows.
- Write-flow smoke tests still require a deliberate strategy for disposable test records and cleanup.
- USDA lookup remains an external dependency and can fail if FoodData Central is unavailable or rate-limited.

## 2026-05-24 — Evidence-Aware Analysis v3 Uses Static Guidance At Runtime

Decision: Wire the existing source registry and health-guidance principles into `/api/analyze-meal` prompt context and structured output with four v3 fields: `evidenceNotes`, `confidenceNotes`, `safetyDisclaimer`, and `guidanceBasis`.

Reasoning:
- The app needs safer family decision support for diabetes risk awareness, insulin-sensitivity-friendly eating, possible PCOS-supportive patterns, Canadian household context, and culturally preserving food guidance.
- Source/principle IDs make generated guidance reviewable without adding long citations or medical claims.
- A small v3 schema avoids a larger rewrite and keeps current Notion schema stable.

Tradeoffs:
- V3 output is still model-generated and should be reviewed for wording drift.
- Guidance basis uses static source/principle IDs, not live source retrieval.
- Notion Notes remains the persistence surface, so v3 summaries must stay concise because of the rich_text character limit.
- USDA nutrient lookup remains diagnostic-only and is intentionally not used in runtime analysis.

## 2026-05-24 — Ingredient Nutrient Enrichment Skips Missing Schema

Decision: Add `/api/ingredients/enrich` as an explicit diagnostic/update endpoint that updates only existing compatible Ingredients properties and reports missing fields as skipped.

Reasoning:
- Notion remains manually controlled; app code should not mutate schema.
- USDA nutrient data should be reviewable before it influences analysis or saved ingredients automatically.
- The current Ingredients database lacks the proposed nutrient properties, so graceful skipping keeps the MVP working.

Tradeoffs:
- No enrichment persists until the optional Notion properties are added manually.
- The Settings tool exposes a page-ID based workflow that is diagnostic rather than family-facing.

## 2026-05-24 — FoodData Central Lookup Is Diagnostic First

Decision: Add a server-side USDA FoodData Central ingredient lookup endpoint and Settings diagnostic panel without changing analysis prompts, Notion schema, or ingredient persistence.

Reasoning:
- Verifiable nutrient data should be tested in isolation before it influences AI analysis or saved household data.
- `FDC_API_KEY` must stay route-scoped so unrelated app routes keep working without it.
- Ingredient matching is inherently uncertain, especially for branded foods and culturally specific ingredients, so the response includes confidence, matched description, FDC ID, and notes.

Tradeoffs:
- No automatic nutrition enrichment yet.
- Settings now has a diagnostic tool that depends on external USDA availability and rate limits.
- Matching uses a heuristic common-food-first strategy that needs real-world review.

## 2026-05-24 — Evidence-Aware Foundation Before Prompt Changes

Decision: Add a typed source registry and safe health-guidance principle modules before changing OpenAI prompts, output schemas, Notion schemas, or UI behavior.

Reasoning:
- Health and nutrition guidance needs verifiable source IDs and explicit allowed/prohibited uses before being used in generated analysis.
- Diabetes-aware and PCOS-aware support must stay general and non-diagnostic.
- Open Food Facts is useful for packaged-food data, but it is crowdsourced and must remain lower confidence.
- Keeping this static and unused at runtime avoids changing current MVP behavior while creating a safer next step.

Tradeoffs:
- No user-visible source citations appear yet.
- The prompt still relies on existing embedded safety language until a dedicated prompt/schema slice wires this foundation in.
- Source review dates need maintenance.

## 2026-05-24 — Basic Recipe URL Parser Before Heavier Dependencies

Decision: Implement Recipe URL analysis through the existing `recipe-parser` adapter with a dependency-free parser that prefers schema.org Recipe JSON-LD and falls back to cleaned HTML text.

Reasoning:
- Keeps the MVP lightweight and avoids adding dependency/network-install risk during this slice.
- Many recipe sites expose useful JSON-LD, which is enough for the first URL import foundation.
- The parser boundary remains stable if a future session swaps in jsdom + @mozilla/readability.
- `/api/analyze-meal` remains the single analysis endpoint, preserving the current client flow.

Tradeoffs:
- Cleaned HTML fallback is less accurate than a full Readability extraction.
- Some recipe sites block server-side fetches or render recipe content client-side.
- SSRF protection currently blocks obvious local/private hostnames but does not perform DNS resolution checks.

## 2026-05-24 — Canada-First Household Defaults

Decision: Make the initial household defaults explicitly Canada-centred: country `CA`, province `NS`, city `Halifax`, preferred units `mixed`, currency `CAD`, and temperature unit `C`.

Reasoning:
- Grocery pricing, package sizes, weather context, nutrition labels, store availability, and seasonal planning are country- and region-sensitive.
- A single typed default profile is safer than scattering Canadian assumptions throughout prompts, components, and integrations.
- No settings persistence UI is required yet; the current Settings page only surfaces read-only defaults.

Tradeoffs:
- The app is not multi-region yet.
- Future households outside Nova Scotia will need editable preferences and persistence.

## 2026-05-24 — External APIs Through Adapters Only

Decision: Create integration adapter folders for Open Food Facts, nutrition, recipe parsing, grocery prices, and weather, but keep them as stubs/interfaces for now.

Reasoning:
- Future API logic needs stable homes before integrations are added.
- Stubs prevent pages and routes from directly coupling to external providers.
- The current MVP remains functional without network dependencies beyond the existing OpenAI and Notion routes.

Tradeoffs:
- The stubs do not provide user-visible features yet.
- Adapter interfaces may evolve once real API constraints are known.

## 2026-05-24 — Keep AI Enrichment Separate From Canonical Recipe Data

Decision: Add a `RecipeAiAnalysis` type for summaries, suggested tags, nutrition estimates, substitutions, and Canadian grocery notes instead of merging AI enrichment into canonical recipe fields.

Reasoning:
- AI-generated nutrition and grocery notes are estimates and should not overwrite trusted recipe data.
- Future review/promote workflows need to distinguish original recipe content from model-generated suggestions.
- This preserves a clean path to add model versioning and generated timestamps.

Tradeoffs:
- More records/types will exist once AI analysis is persisted.
- UI work is still needed to review or promote AI suggestions.

## 2026-05-24 — Introduce Structured Ingredients Cautiously

Decision: Add a `RecipeIngredient` shape and update normalization to accept either legacy strings or structured ingredients.

Reasoning:
- Existing ingredient persistence depends on string suggestions and should not be broken.
- Future recipe import, grocery list, nutrition, and pantry features need quantity/unit/category/preparation fields.
- Accepting both shapes allows incremental migration.

Tradeoffs:
- Current Notion ingredient persistence still stores normalized names only.
- Parsing raw text into quantities and units remains deferred.

## 2026-05-24 — Household Feedback As Personalization Foundation

Decision: Add a `HouseholdRecipeFeedback` type for recipe-level preference signals such as rating, would-make-again, actual difficulty, cleanup level, spice/heaviness flags, notes, and modifications.

Reasoning:
- Household feedback is a future personalization moat for meal planning.
- The current feedback form remains unchanged, preserving the MVP.
- The richer shape creates a target for the next feedback UI/database slice.

Tradeoffs:
- No UI or persistence exists for the richer feedback fields yet.
- Existing Notion Meal Feedback remains the active feedback workflow.

## 2026-05-24 — Source Tracking Without Required Notion Schema Changes

Decision: Add recipe source fields to analysis/save types and write them to Notion only when compatible optional Meals properties already exist.

Reasoning:
- Recipe import and parsing need durable provenance.
- Current manual-paste saves can safely default to `sourceType: manual` and `parserVersion: manual-v1`.
- Notion schema drift should not break existing family workflows.

Tradeoffs:
- Source fields are not persisted in Notion unless matching optional properties are manually added.
- `save-meal` now reads the Meals database schema before creating a page.

## 2026-05-23 — Defer Recipe URL Analysis to Next Session

Decision: Defer Recipe URL input support to a dedicated future session.

Reasoning:
- Recipe URL analysis requires server-side HTTP fetching, HTML parsing (jsdom), and readable content extraction (@mozilla/readability) — a meaningful vertical slice with its own failure modes.
- The current analyze flow (paste text) is working and deployed. Adding URL support mid-session would risk introducing untested fetch/parse edge cases.
- Deferring keeps the current session focused on Analysis Framework v2 closeout and production verification.

Planned approach for next session:
- Detect whether the `/analyze` input looks like a URL (simple heuristic: starts with `http://` or `https://`).
- If URL: POST to a new server-side route or extend `/api/analyze-meal` to accept a `recipeUrl` field; fetch the URL server-side (no CORS exposure); parse with jsdom + @mozilla/readability to extract article text; pass extracted text through the existing analysis pipeline.
- If fetch or parse fails: return a graceful error; let the user paste the text manually instead.
- No changes to the OpenAI schema or Notion mapper are expected.

Tradeoffs:
- Deferred one session.
- Server-side fetch adds a new outbound network dependency; some recipe sites block bots or require headers.

## 2026-05-23 — Analysis Framework v2

Decision: Store the v2 analysis summary inside the existing Notion `Notes` rich_text field rather than adding new Notion properties.

Reasoning:
- Notion schema changes require manual setup and break if property names do not match exactly.
- The v2 fields (scores, verdict, concerns, plate strategy, cautions) are useful for human review in Notion but do not need to be queryable or filterable at this stage.
- Combining original notes with a structured plain-text v2 summary into one field keeps the Notion Meals schema stable.
- `buildMealNotesSummary` in `src/lib/notion/meal-notes.ts` owns this formatting, making it easy to change the layout or expand coverage later.

Tradeoffs:
- The Notes field becomes longer and contains structured text that is not individually queryable in Notion.
- If v2 fields need to be filtered or sorted in Notion later (e.g., filter by Metabolic Score), new Notion properties will need to be added manually and the mapper updated.
- The Notion 2000-character rich_text limit is managed with truncation; verbose outputs may lose trailing cautions.

## 2026-05-23

Decision: Use Next.js App Router.

Reasoning:
- Supports pages and server-side API routes in one codebase.
- Works naturally with Vercel.
- Keeps OpenAI and Notion keys server-side.
- Provides a clear path to PWA/mobile-web deployment.

Tradeoffs:
- Requires careful client/server boundaries.
- App Router conventions can shift across Next versions.

## 2026-05-23

Decision: Use Notion as the initial database.

Reasoning:
- Fastest path to structured household records.
- User can inspect and edit data directly.
- Good fit for MVP iteration before final schema is known.

Tradeoffs:
- Querying and relations are less flexible than a purpose-built database.
- Production permissions and multi-user access will become limiting.
- Notion API/schema changes can affect SDK usage.

## 2026-05-23

Decision: Start with PWA/mobile web before React Native.

Reasoning:
- Single codebase.
- Fastest path to remote phone testing through Vercel HTTPS.
- Lower operational complexity.
- Workflows should be validated before native investment.

Tradeoffs:
- Less native feel.
- No App Store distribution yet.
- Offline/push/native integrations need extra PWA work or future native work.

## 2026-05-23

Decision: Defer authentication.

Reasoning:
- MVP is still validating core meal analysis and Notion persistence workflows.
- Auth would add product and infrastructure complexity before the data model stabilizes.

Tradeoffs:
- Public deployment is not suitable for broad sharing.
- Anyone with the URL can access available workflows until auth is added.

## 2026-05-23

Decision: Use OpenAI structured outputs for meal analysis.

Reasoning:
- The review UI needs predictable fields.
- Structured JSON reduces parsing fragility.
- TypeScript interfaces can mirror API response shape.

Tradeoffs:
- Schema changes require prompt/API updates.
- Strict structured outputs may need iteration if the model cannot fit edge cases into the schema.

## 2026-05-23

Decision: Add PWA foundation without native mobile or offline service worker.

Reasoning:
- Makes the Vercel-hosted web app easier to test and launch from iPhone.
- Keeps the MVP on one Next.js codebase.
- Adds manifest, app metadata, safe-area handling, and mobile control sizing before deeper mobile investment.

Tradeoffs:
- Home-screen launch is app-like, but still a web app.
- Offline support, push notifications, and native integrations remain deferred.
- Placeholder icons should be replaced with polished production assets later.

## 2026-05-23

Decision: Add route-scoped server-side environment validation.

Reasoning:
- Fails loudly when required server config is missing.
- Keeps secrets out of client components.
- Gives API routes a typed configuration surface.
- Lets each route require only the provider keys and database IDs it actually uses.

Tradeoffs:
- More helper functions exist in `src/lib/env.ts`.
- Broad workflows can still use `getFullServerEnv()` or `getFullNotionEnv()` when they truly need complete configuration.

## 2026-05-23

Decision: Keep MVP UI state local.

Reasoning:
- Current flows are simple forms and lists.
- Avoids global state management before cross-page state requirements exist.

Tradeoffs:
- Some duplicated form helpers exist.
- Shared state may be needed later for richer workflows.

## 2026-05-23

Decision: Create persistent handoff documentation.

Reasoning:
- Project will continue across sessions, devices, and context windows.
- Durable docs reduce context loss.
- Mandatory start/end procedures make future work safer.

Tradeoffs:
- Docs must be maintained.
- Stale docs can mislead future sessions if not updated.
