# Notion Schema Checklist

Last updated: 2026-06-12

The app does not create, rename, or mutate Notion schema automatically. It writes optional fields only when the active Notion data source exposes a compatible property.

## Meals

Required for meal saves:
- `Meal Name` — title
- `Cuisine`, `Meal Type`, `Protein Level`, `Satiety Level`, `Blood Sugar Impact`, `Effort Level` — select
- `Family Approved`, `Weeknight Friendly`, `Comfort Meal` — checkbox
- `Optimized Version`, `Notes` — rich_text

Strongly recommended:
- `Household ID` — rich_text. Meal reads now check the active Meals data source before applying the household filter.
- `Meal Date` — date. New saves write this when the property exists, using the meal import/save timestamp.
- `Calories`, `Protein (g)`, `Carbohydrates (g)`, `Fat (g)`, `Fiber (g)`, `Sodium (mg)`, `Sugar (g)` — number
- `Nutrition Confidence` — select, rich_text, or number
- `Nutrition Source`, `Nutrition Provenance` — select or rich_text
- `Meal Quality Score`, `Metabolic Score`, `Protein Score`, `Fiber Score`, `Satiety Score`, `Blood Sugar Risk Score` — number

Optional compatibility fields:
- `Source URL` or `Original Source` — url or rich_text
- `Source Type`, `Source Name`, `Source Classification`, `Parser Version`, `Analysis Version`, `Analysis Model` — select or rich_text
- `Source Notes`, `Ingredients`, `Instructions` — rich_text

Read/backfill only:
- `Energy Density Score` and `Processing Score` may still be read from existing pages, but current meal saves do not produce dedicated values for them. Diagnostics no longer treat them as expected write fields.

## Meal Feedback

Required for feedback saves:
- `Feedback Entry` — title
- `Energy After`, `Hunger Later` — select
- `Cravings Later`, `Would Repeat` — checkbox
- `Notes` — rich_text

Strongly recommended:
- `Meal` — relation targeting the active Meals database or data source. Without this, feedback still saves but will not appear in meal-level Today, Meal Detail, cookbook adjustment, or recommendation-learning summaries.

## Ingredients

Required:
- One title property for the ingredient name.

Strongly recommended:
- `Meals` or `Meal` — relation targeting the active Meals database or data source.
- `Nutrient Amount Basis` and `Nutrient Basis Unit` — select or rich_text. USDA enrichment skips plain nutrient values unless both basis fields exist.
- `Protein (g)`, `Fiber (g)`, `Carbohydrates (g)`, `Energy (kcal)` — number

Optional USDA/enrichment fields:
- `FDC ID` — number or rich_text
- `FDC Description` — rich_text
- `Nutrient Source`, `Nutrient Confidence`, `Matched Food State`, `Raw/Cooked State` — select or rich_text
- `Nutrient Source ID` — rich_text or number
- `Sugars (g)`, `Sodium (mg)` — number
- `Last Nutrient Lookup` — date

## Meal Plan

Required when planner storage is configured:
- `Name` — title
- `Plan Date` — date
- `Meal Slot` — select
- `Meal` — relation
- `Status` — select
- `Source` — select
- `Household Notes` — rich_text

## Meal Intake

Required when iOS Shortcut intake storage is configured:
- `Name` — title
- `Status` — select
- `Created At` — date

Recommended:
- `URL` — url
- `Raw Text` — rich_text
- `Source` — select or rich_text
- `Classification` — select or rich_text
- `Error` — rich_text

## Diagnostics

Use `/settings` or `GET /api/diagnostics/notion-schemas` after schema changes. Diagnostics are read-only and now check:
- Meals reliability fields, including `Meal Date`.
- Feedback relation compatibility with the active Meals database/data source.
- Ingredients relation compatibility and nutrient basis fields.
- Optional Meal Intake storage fields.
