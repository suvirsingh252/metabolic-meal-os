# Investor Demo Readiness

Generated: 2026-06-26T23:07:33.554Z

## Status

The live recipe corpus audit could not run in this checkout.

Reason: Missing required server environment variable: NOTION_API_KEY. Add it to .env.local.

## Recipe Totals

| Metric | Count |
| --- | ---: |
| Total recipes | unavailable |
| Recipes with images | unavailable |
| Recipes without images | unavailable |
| Image coverage | unavailable |

## Remaining Issues

- Valid Notion credentials are required to audit stored recipes.
- Run `npm run investor-demo:audit` after configuring `NOTION_API_KEY` and `NOTION_MEALS_DATABASE_ID`.
- Run `npm run images:backfill -- --write` to execute the existing image backfill pipeline.

## Recommendation Quality

Today and Dinner Concierge recommendations are gated to demo-ready recipes in code, even though this report could not inspect the live corpus.

## Known Limitations

- Prep time, cook time, and servings are not currently exposed by `MealSummary`.
- No live image coverage before/after can be computed without corpus access.
