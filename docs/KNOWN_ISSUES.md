# Known Issues

Last updated: 2026-05-24 (Evidence-Aware Analysis v3)

## Critical

- [ ] Real-looking OpenAI and Notion secrets were found in `.env.example` during documentation setup and were scrubbed. Rotate those keys if not already completed.

## Bugs

- [ ] Production ingredient persistence fix is implemented locally but still needs deployment/retest on Vercel. Root cause was reading Ingredients schema from `databases.retrieve()` instead of the active data source; local create and duplicate checks now pass.
- [ ] In-app browser localhost testing has sometimes been blocked by `net::ERR_BLOCKED_BY_CLIENT`; use command-line checks or a normal browser if this recurs.
- [ ] Multiple Next dev servers can remain running on alternate ports after interrupted sessions; check with `lsof -ti :3011` or inspect `.next/dev/logs`.

## Technical Debt

- [ ] API validators duplicate helpers such as `isRecord`, `isEnumValue`, and `validationError`.
- [ ] Client pages duplicate local `EnumSelect` and `BooleanInput` helpers.
- [ ] Notion `getNotionPageUrl` helper is duplicated across API routes.
- [ ] No automated tests yet.
- [ ] No deployment smoke test script yet.
- [ ] `/api/notion/save-meal` validator accepts Analysis Framework v2 fields leniently: numeric scores default to `0` and string/array fields default to empty if absent. Tighten once backward compatibility is no longer a concern.
- [ ] `buildMealNotesSummary` truncates Notion Notes at 1997 characters to stay within the API 2000-character rich_text limit. Extremely verbose outputs will be silently truncated.
- [ ] `save-meal` performs a Meals database schema read before page creation so optional source fields can be detected. If Notion permissions are ever narrowed, this route needs a smoke test.
- [ ] Integration adapter interfaces are placeholders and may need revision when real API constraints are known. Recipe parser is the first active adapter.
- [ ] Recipe URL parser uses dependency-free JSON-LD and cleaned-text extraction. It is not as robust as a full Readability parser.
- [ ] Evidence-Aware Analysis v3 is wired into prompts, UI, and Notion Notes locally, but still needs production deployment and live smoke testing.
- [ ] FoodData Central matching is heuristic. Some lookups may return branded foods or adjacent common foods; review `matchedDescription` and `confidence`.
- [ ] USDA `DEMO_KEY` can hit rate limits during repeated diagnostics. Configure a real `FDC_API_KEY` locally and in Vercel before relying on lookup tests.
- [ ] Ingredient nutrient properties are present in production schema diagnostics, and production USDA lookup/enrich lookup-only works. Ingredient page creation has a local code fix and needs production redeploy verification.

## UX Problems

- [ ] Analyze, save, and feedback flows are functional but plain.
- [ ] Meals page has no filtering or search yet.
- [ ] Meal Feedback -> Meals relation is not present on the active Feedback data source configured by `NOTION_FEEDBACK_DATABASE_ID`. Selected-meal feedback saves, but returns the missing-relation warning and does not write a Meal relation until the active Feedback data source gets a relation to Meals.
- [ ] Ingredients are saved as standalone records, but are not related to saved meals in Notion yet.
- [ ] Success/error UI patterns are not fully standardized.
- [ ] Analysis Framework v2 and Recipe URL analysis have been smoke-tested through production APIs, but browser-rendered review UI still needs a human/UI pass on the live deployment.
- [ ] Household defaults are read-only and hard-coded to CA/NS/Halifax for now. There is no settings persistence UI yet.
- [ ] Recipe source fields only persist to Notion if compatible optional Meals properties exist. Missing properties are ignored by design.

## Future Migrations

- [ ] Add authentication before wider public sharing.
- [ ] Consider replacing Notion with a dedicated database if relational querying, permissions, or performance require it.
- [ ] Consider provider abstractions for AI and storage after workflows stabilize.

## Temporary Implementations

- [ ] Notion is the only persistence layer.
- [ ] Ingredient suggestions are saved by normalized name only, without meal relations.
- [ ] Structured ingredients are type/helper-ready. Recipe JSON-LD ingredients are represented as `RecipeIngredient.rawText`, but quantity/unit parsing is not implemented.
- [ ] Pantry support is type-only; there is no pantry UI, storage, or grocery-list deduction.
- [ ] AI-generated analysis/enrichment has a separate type foundation, but is not persisted as a separate record yet.
- [ ] Evidence-aware guidance is now source/principle-ID linked in analysis output, but still uses static guidance context rather than live source retrieval.
- [ ] FoodData Central nutrient snapshots are diagnostic only and are not persisted to Notion ingredients yet.
- [ ] Ingredient enrichment is explicit/manual only from Settings or direct API calls; it does not run during meal analysis or ingredient suggestion persistence.
- [ ] Canada grocery, nutrition, Open Food Facts, and weather integrations are adapter stubs only. Recipe parser has a basic active implementation.
- [ ] Weekly Plans and Meal Templates database IDs exist but are not fully used.
- [ ] Deployment exists, but there is no automated production smoke test yet.
