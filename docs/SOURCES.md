# Sources and Health Guidance Foundation

Last updated: 2026-05-26

This app has an evidence-aware foundation for meal analysis, nutrition enrichment, and grocery intelligence. The source registry and health-guidance principles are now wired into runtime meal analysis prompt context and output fields. It does not call external source APIs for this guidance and does not use USDA nutrient lookup during meal analysis.

Meal-level nutrition totals are handled separately from ingredient nutrient snapshots. Recipe page JSON-LD nutrition facts, limited free-text estimates, and user-entered review totals can be persisted with confidence/provenance. The app does not ask OpenAI to invent exact meal calories or macros.

## Source Registry

The approved source registry lives in:

- `src/lib/sources/source-registry.ts`

Each source record includes:

- `id`
- `name`
- `type`
- `jurisdiction`
- `url`
- `confidence`
- `allowedUses`
- `prohibitedUses`
- `lastReviewed`

Current approved sources:

- USDA FoodData Central
- Health Canada / Canadian Nutrient File
- Diabetes Canada Clinical Practice Guidelines
- 2023 International Evidence-Based PCOS Guideline
- Canada's Food Guide
- Open Food Facts

Open Food Facts is intentionally marked as lower-confidence crowdsourced packaged-food data. It can support barcode/package lookup later, but should not overwrite trusted canonical data without review.

## Health Guidance Principles

Health guidance principles live in:

- `src/lib/health-guidance/diabetes.ts`
- `src/lib/health-guidance/pcos.ts`
- `src/lib/health-guidance/canada-food-guide.ts`
- `src/lib/health-guidance/index.ts`

Each principle includes:

- `id`
- `title`
- `summary`
- `appliesTo`
- `analysisUse`
- `safeLanguage`
- `prohibitedClaims`
- `sourceIds`

## Safety Rules

Global safety rules are exported from `src/lib/health-guidance/types.ts`.

The app must not:

- Diagnose diabetes, prediabetes, insulin resistance, PCOS, or any other condition.
- Claim to treat, cure, prevent, or reverse diabetes, PCOS, infertility, or metabolic disease.
- Replace clinician, registered dietitian, pharmacist, or other qualified health professional advice.
- Provide medication, supplement, fertility, insulin, or individualized clinical dosing advice.

The app may:

- Provide general food-pattern support.
- Suggest practical meal nudges around protein, fibre, satiety, carbohydrate quality, and minimally processed foods.
- Use careful language such as "may support", "could help", and "worth watching".

## Architecture Notes

This layer is used by:

- Prompt construction.
- Source-attributed AI analysis.

It is still intended for future use by:
- Nutrition enrichment.
- Canadian grocery intelligence.
- User-facing explanation and safety copy.

Runtime analysis returns:

- `evidenceNotes`
- `confidenceNotes`
- `safetyDisclaimer`
- `guidanceBasis`

`guidanceBasis` cites source IDs and health-guidance principle IDs rather than long free-text citations.

Future integrations should cite source IDs, not free-text source names, so records remain verifiable and reviewable.

## USDA FoodData Central Lookup

The first active nutrient-data integration is:

- `src/lib/integrations/food-data-central`
- `POST /api/ingredients/lookup`

The endpoint is server-side only and requires `FDC_API_KEY` through `getFoodDataCentralEnv()`. The key is not exposed to client code and is not required by unrelated routes.

Current behavior:

- Accepts `{ "ingredient": string }`.
- Validates ingredient length from 2 to 100 characters.
- Searches USDA FoodData Central.
- Fetches preferred generic/common datasets first: Foundation, SR Legacy, and Survey (FNDDS), with Experimental queried separately and treated cautiously.
- Falls back to broader results, including branded foods, when needed.
- Ranks suitable generic/common records ahead of branded records for plain staples.
- Penalizes prepared/flavored product descriptions for plain staple queries.
- Uses limited query expansion for known household terms such as `paneer` -> `cheese paneer` and `atta` -> `whole wheat`.
- Returns a normalized nutrient snapshot with source ID, confidence, matched description, FDC ID, selected nutrients, and notes.
- May include optional `matching` metadata with selected data type, generic/branded fallback flags, and confidence reason.

Current limitations:

- Values are diagnostic snapshots, usually per 100 g, not recipe-level nutrition.
- Match confidence is heuristic.
- Branded matches are limited confidence unless that exact product is intended or no suitable generic match was returned.
- DEMO_KEY testing can hit USDA rate limits; use a real key for reliable diagnostics.

## USDA Ingredient Enrichment To Notion

The explicit enrichment endpoint is:

- `POST /api/ingredients/enrich`

Input:

```json
{
  "ingredientName": "chickpeas",
  "ingredientPageId": "optional-notion-page-id"
}
```

Behavior:

- Without `ingredientPageId`: performs USDA lookup only and reports all Notion fields as skipped.
- With `ingredientPageId`: performs USDA lookup, inspects the Ingredients database schema, updates compatible properties that already exist, and skips missing or incompatible properties.
- Settings now provides an Ingredient picker backed by `GET /api/notion/ingredients`, so normal enrichment no longer requires copying a Notion page ID manually.
- Does not create Notion properties.
- Does not run during meal analysis or ingredient saving.

Expected optional Ingredients properties:

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

The active Ingredients database has the household classification fields:

- `Category`
- `Fiber Source`
- `Household Favorite`
- `Ingredient`
- `Notes`
- `Protein Source`
- `Staple`

Production schema diagnostics on 2026-05-24 confirmed the nutrient properties above exist. Enrichment still skips any missing or incompatible field safely if a future schema changes.

## Meal-Level Nutrition Persistence

Meal-level nutrition fields are part of the meal review/save path, not the FoodData Central ingredient enrichment path.

Sources:
- Recipe page structured data (`recipe-json-ld`) when exposed by the recipe site.
- Conservative free-text meal estimates (`estimated`) for recognized manual meal components. These currently cover calories, protein, and fiber only, with coarse serving-size assumptions for simple quantities, bowl phrases, large/small portions, household shorthand, and butter inclusion/exclusion.
- User-entered, user-corrected, or user-reviewed estimate values (`user-entered`).

Persisted shape:
- calories;
- protein;
- carbs;
- fat;
- fiber;
- sodium;
- sugar;
- confidence;
- provenance;
- source.

Rules:
- Missing values remain unknown.
- Zero is preserved as a known value.
- Values must be non-negative finite numbers.
- Free-text estimates leave sodium, sugar, fat, and carbs unknown unless another source or user review supplies them.
- Estimated provenance names matched components, serving-size assumptions, quantity multipliers, confidence, and review-before-save guidance.
- The review UI can adjust estimated meals with coarse serving multipliers (`0.5x`, `1x`, `1.5x`, `2x`) and add/remove butter where relevant. Repeated review actions replace stale serving/butter notes so the saved provenance stays concise. These controls are intentionally beta-grade and not clinical macro modeling.
- Structured recipe nutrition takes precedence over free-text estimates, and user edits override estimates.
- No new Notion schema is required for serving-adjusted provenance or user-entered override tracking. The existing nutrition source, provenance, confidence, and nullable nutrient fields are sufficient for the current dashboard and save workflow.
- The app does not calculate meal totals from ingredient-level per-100g snapshots without quantities.
- The app does not create Notion schema; compatible Meals properties must already exist.

## Dashboard Reliability And Backfill

Historical Meals are enriched at read time only:

- Existing Notion nutrition, source, provenance, confidence, and score fields take precedence.
- Legacy Notes scorecards can backfill derived quality metadata.
- Existing saved nutrition fields can backfill coarse source/provenance/confidence labels with `notion-backfill`.
- Exact nutrition totals are not invented for old records.
- Unknown values remain `null` and dashboard summaries carry sample-size metadata.

Dashboard source categories:

- `structured`: recipe/JSON-LD or other structured nutrition evidence.
- `estimated`: deterministic free-text estimate.
- `user-entered` / reviewed: manual edits or reviewed estimate values.
- `notion-backfill`: read-time metadata inferred from existing saved fields or legacy Notes.
- missing nutrition: no saved nutrition totals available.
