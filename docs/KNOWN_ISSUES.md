# Known Issues

Last updated: 2026-05-24 (Shared URL Intake)

For a brand-new PM/chat, start with `docs/PM_HANDOVER.md`, then review this file for active blockers and risks.

## Critical

- No active critical issues.

## Bugs

- [ ] In-app browser localhost testing has sometimes been blocked by `net::ERR_BLOCKED_BY_CLIENT`; use command-line checks or a normal browser if this recurs.
- [ ] In-app browser form filling can fail when the virtual clipboard is unavailable; use command-line API checks or a normal browser for generated `/analyze` result testing if this recurs.
- [ ] Multiple Next dev servers can remain running on alternate ports after interrupted sessions; check with `lsof -ti :3011` or inspect `.next/dev/logs`.

## Technical Debt

- [ ] API validators duplicate helpers such as `isRecord`, `isEnumValue`, and `validationError`.
- [ ] Client pages duplicate local `EnumSelect` and `BooleanInput` helpers.
- [ ] Notion `getNotionPageUrl` helper is duplicated across API routes.
- [ ] No automated tests yet.
- [ ] `/api/notion/save-meal` validator accepts Analysis Framework v2 fields leniently: numeric scores default to `0` and string/array fields default to empty if absent. Tighten once backward compatibility is no longer a concern.
- [ ] `buildMealNotesSummary` truncates Notion Notes at 1997 characters to stay within the API 2000-character rich_text limit. Extremely verbose outputs will be silently truncated.
- [ ] `save-meal` performs a Meals database schema read before page creation so optional source fields can be detected. If Notion permissions are ever narrowed, this route needs a smoke test.
- [ ] Integration adapter interfaces are placeholders and may need revision when real API constraints are known. Recipe parser is the first active adapter.
- [ ] Recipe URL parser uses dependency-free JSON-LD, metadata, and bounded cleaned-text extraction. It is not as robust as a full Readability parser.
- [ ] TikTok, Instagram Reels, YouTube Shorts, and other social/video links often expose only limited metadata to server-side fetches. When captions/transcripts are blocked or script-rendered, users must paste the caption, transcript, ingredients, or spoken summary manually.
- [ ] SSRF protection blocks obvious local/private hostnames before and after redirects, but does not yet perform DNS-resolution checks against private IP ranges.
- [ ] Known Ingredient context is best-effort and name-match based. It may miss pluralized or highly transformed ingredient names, and it should be reviewed with real household meals before relying on it heavily.
- [ ] FoodData Central matching is improved but still heuristic. Variety-specific staples such as basmati rice may still use branded fallback when USDA does not return a suitable generic match; review `matchedDescription`, `matching`, notes, and `confidence`.

## UX Problems

- [ ] `/analyze` review has household-first hierarchy and tone tuning, but save, meals, feedback, and settings flows are still functional and plain.
- [ ] Meals page has no filtering or search yet.
- [ ] Ingredient -> Meal relation writes now work when the active Ingredients data source has a compatible Meals relation property; missing or incompatible relation schema still produces a safe non-blocking warning.
- [ ] Success/error UI patterns are not fully standardized.
- [ ] Household defaults are read-only and hard-coded to CA/NS/Halifax for now. There is no settings persistence UI yet.
- [ ] Recipe source fields only persist to Notion if compatible optional Meals properties exist. `sourceClassification` and `sourceNotes` currently display in `/analyze` results but are not mapped to Notion fields.

## Future Migrations

- [ ] Add authentication before wider public sharing.
- [ ] Consider replacing Notion with a dedicated database if relational querying, permissions, or performance require it.
- [ ] Consider provider abstractions for AI and storage after workflows stabilize.

## Temporary Implementations

- [ ] Notion is the only persistence layer.
- [ ] Ingredient suggestions are still saved by normalized name only. They can now be related to Meals when a compatible relation property exists, but structured ingredient quantity/unit persistence is still deferred.
- [ ] Structured ingredients are type/helper-ready. Recipe JSON-LD ingredients are represented as `RecipeIngredient.rawText`, but quantity/unit parsing is not implemented.
- [ ] Pantry support is type-only; there is no pantry UI, storage, or grocery-list deduction.
- [ ] AI-generated analysis/enrichment has a separate type foundation, but is not persisted as a separate record yet.
- [ ] Evidence-aware guidance is now source/principle-ID linked in analysis output, but still uses static guidance context rather than live source retrieval.
- [ ] Meal analysis can now read matching known Ingredients from Notion as lightweight context, but it does not calculate meal calories, exact macros, or serving-level nutrition.
- [ ] FoodData Central nutrient snapshots are not automatically persisted to Notion ingredients. Enrichment remains explicit/manual through Settings or direct API calls.
- [ ] Ingredient enrichment is explicit/manual only from Settings or direct API calls; it does not run during meal analysis or ingredient suggestion persistence.
- [ ] Canada grocery, nutrition, Open Food Facts, and weather integrations are adapter stubs only. Recipe parser has an active shared-URL implementation, but it remains intentionally dependency-free.
- [ ] Weekly Plans and Meal Templates database IDs exist but are not fully used.
- [ ] Production smoke-test automation is read-only by design and does not cover OpenAI analysis or Notion write flows.
