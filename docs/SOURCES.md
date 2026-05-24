# Sources and Health Guidance Foundation

Last updated: 2026-05-24

This app has an evidence-aware foundation for meal analysis, nutrition enrichment, and grocery intelligence. The source registry and health-guidance principles are now wired into runtime meal analysis prompt context and output fields. It does not call external source APIs for this guidance and does not use USDA nutrient lookup during meal analysis.

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
- Prefers common-food datasets when a reasonable match is available.
- Falls back to broader results, including branded foods, when needed.
- Returns a normalized nutrient snapshot with source ID, confidence, matched description, FDC ID, selected nutrients, and notes.

Current limitations:

- Values are diagnostic snapshots, usually per 100 g, not recipe-level nutrition.
- Match confidence is heuristic.
- Branded matches are limited confidence unless that exact product is intended.
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

Schema inspection on 2026-05-24 showed the current Ingredients database only has:

- `Category`
- `Fiber Source`
- `Household Favorite`
- `Ingredient`
- `Notes`
- `Protein Source`
- `Staple`

Therefore all nutrient enrichment properties are currently skipped until added manually in Notion.
