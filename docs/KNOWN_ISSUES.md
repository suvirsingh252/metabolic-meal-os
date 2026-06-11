# Known Issues

Last updated: 2026-06-11 (Beta 3.6 iPhone Share Intake)

For a brand-new PM/chat, start with `docs/PM_HANDOVER.md`, then review this file for active blockers and risks.

## Critical

- No active critical issues.

## Bugs

- [ ] In-app browser localhost testing has sometimes been blocked by `net::ERR_BLOCKED_BY_CLIENT`; use command-line checks or a normal browser if this recurs.
- [ ] In-app browser form filling can fail when the virtual clipboard is unavailable; use command-line API checks or a normal browser for generated `/analyze` result testing if this recurs.
- [ ] Multiple Next dev servers can remain running on alternate ports after interrupted sessions; check with `lsof -ti :3011` or inspect `.next/dev/logs`.

## Beta 3.6 Intake Known Limitations

- [ ] Intake URL classification is heuristic: recipe-URL detection is path-based (`/recipe`, `/recipes`, etc.) and may misclassify uncommon recipe sites with non-standard paths as `unknown-url`.
- [ ] Social URL parsing (Instagram, TikTok, YouTube) does not extract caption/ingredients from server-side fetches. Users must paste the caption or recipe text manually for complete analysis.
- [ ] The intake bridge panel pre-fills the analyze textarea but does not automatically trigger analysis. The user must tap Analyze Recipe.
- [ ] iPhone Shortcut setup is manual: no automated provisioning or QR code. See README for step-by-step instructions.
- [ ] `NOTION_MEAL_INTAKE_DATABASE_ID` must be set manually; there is no in-app database creation or migration flow.

## Technical Debt

- [ ] API validators duplicate helpers such as `isRecord`, `isEnumValue`, and `validationError`.
- [ ] Client pages duplicate local `EnumSelect` and `BooleanInput` helpers.
- [ ] Notion `getNotionPageUrl` helper is duplicated across API routes.
- [ ] Test coverage is still focused unit coverage, not full route/integration coverage.
- [ ] `buildMealNotesSummary` truncates Notion Notes at 2000 characters with an explicit marker. Structured evidence fields should be added to Notion where practical.
- [ ] `save-meal` performs a Meals database schema read before page creation so optional source fields can be detected. If Notion permissions are ever narrowed, this route needs a smoke test.
- [ ] Integration adapter interfaces are placeholders and may need revision when real API constraints are known. Recipe parser is the first active adapter.
- [ ] Recipe URL parser uses dependency-free JSON-LD, metadata, and bounded cleaned-text extraction. It is not as robust as a full Readability parser.
- [ ] TikTok, Instagram Reels, YouTube Shorts, and other social/video links often expose only limited metadata to server-side fetches. When captions/transcripts are blocked or script-rendered, users must paste the caption, transcript, ingredients, or spoken summary manually.
- [ ] SSRF protection now resolves DNS and manually checks redirects, but does not use socket-level IP pinning; continue reviewing DNS rebinding risk before public URL import.
- [ ] Known Ingredient context is best-effort token/key matched. It should be reviewed with real household meals before relying on it heavily.
- [ ] FoodData Central matching is improved but still heuristic. Variety-specific staples such as basmati rice may still use branded fallback when USDA does not return a suitable generic match; review `matchedDescription`, `matching`, notes, and `confidence`.
- [ ] Meal-level nutrition persistence depends on compatible existing Notion fields. The app does not create or mutate Notion schema.
- [ ] Free-text nutrition estimation is intentionally incomplete and not clinical-grade. It covers a small tested list of common household meal components and shorthand, parses only coarse serving-size signals, and only estimates calories, protein, and fiber.
- [ ] Legacy meals may lack exact nutrition totals. Derived quality/provenance metadata can backfill at read time, but no Notion write-back migration exists yet.
- [ ] Read-time backfill is intentionally conservative and may leave old records partially unknown even when a human could infer more from the Notes text.
- [ ] Dashboard targets are client-side only through `localStorage`; they are not persisted server-side and are not household/user-scoped.
- [ ] Today feedback undo is client-only. It restores the local Today view and Recent Household Learning strip, but it does not delete or reverse the persisted Notion Meal Feedback record.
- [ ] Meal Detail and Feedback do not have undo. They use explicit saved confirmation copy because the current feedback API appends records and has no persisted reversal/delete behavior.
- [ ] Optimistic feedback summaries can briefly differ from Notion-backed summaries while Notion read consistency catches up. The UI preserves local optimistic/undo state during the current session where practical.

## UX Problems

- [ ] `/analyze`, Today, Dashboard, Meals, Feedback, and Meal Detail now have Beta 3 household-facing copy/layout improvements. `/settings` remains intentionally admin/operator oriented and still needs deeper simplification if it becomes a household flow.
- [ ] Estimate review controls are intentionally coarse. They handle serving multipliers and butter toggles, but do not support detailed ingredient quantities, cooking fat amounts, or serving-by-weight workflows.
- [ ] Meals and Ingredients APIs support pagination/search, but client pages only have basic existing UX and should be wired more fully.
- [ ] `/analyze` is now reducer/component based, but the result panel can still be split into smaller section files if it grows again.
- [ ] Ingredient -> Meal relation writes now work when the active Ingredients data source has a compatible Meals relation property; missing or incompatible relation schema still produces a safe non-blocking warning.
- [ ] Success/error UI patterns are not fully standardized.
- [ ] Household defaults are read-only and hard-coded to CA/NS/Halifax for now. There is no settings persistence UI yet.
- [ ] Recipe source, nutrition, score, and quality fields only persist to Notion if compatible optional Meals properties exist.
- [ ] Dashboard intelligence is useful but intentionally simple: no household-level analytics, predictive coaching, or ML yet.
- [ ] `/feedback` has Meal OS save copy, saved-meal search, and clearer success behavior, but it remains a functional form flow rather than a redesigned feedback experience.

## Future Migrations

- [ ] Add full authentication and household ownership before wider public sharing. Current token/private-mode guardrails are beta-safe only.
- [ ] Replace single-instance memory rate limiting with Redis/Upstash or platform-native distributed throttling before public launch.
- [ ] Consider replacing Notion with a dedicated database if relational querying, permissions, or performance require it.
- [ ] Consider provider abstractions for AI and storage after workflows stabilize.

## Temporary Implementations

- [ ] Notion is the only persistence layer.
- [ ] Ingredient suggestions are still saved by normalized name only. They can now be related to Meals when a compatible relation property exists, but structured ingredient quantity/unit persistence is still deferred.
- [ ] Structured ingredients are type/helper-ready. Recipe JSON-LD ingredients are represented as `RecipeIngredient.rawText`, but quantity/unit parsing is not implemented.
- [ ] Pantry support is type-only; there is no pantry UI, storage, or grocery-list deduction.
- [ ] AI-generated analysis/enrichment has a separate type foundation, but is not persisted as a separate record yet.
- [ ] Evidence-aware guidance is now source/principle-ID linked in analysis output, but still uses static guidance context rather than live source retrieval.
- [ ] Meal analysis can now read matching known Ingredients from Notion as lightweight context, but it does not calculate serving-level nutrition from ingredient quantities.
- [ ] Meal review can persist entered, recipe-page, or limited free-text estimated/reviewed-estimate nutrition totals, but the app still does not calculate full macros from ingredient quantities.
- [ ] FoodData Central nutrient snapshots are not automatically persisted to Notion ingredients. Enrichment remains explicit/manual through Settings or direct API calls.
- [ ] FoodData Central plain nutrient values are skipped unless compatible Notion basis fields exist, so some existing schemas will report skipped nutrient fields until updated.
- [ ] Household metadata projection/filtering depends on optional Notion properties. Existing databases without those properties still operate as single-household private stores.
- [ ] Ingredient enrichment is explicit/manual only from Settings or direct API calls; it does not run during meal analysis or ingredient suggestion persistence.
- [ ] Canada grocery, nutrition, Open Food Facts, and weather integrations are adapter stubs only. Recipe parser has an active shared-URL implementation, but it remains intentionally dependency-free.
- [ ] Weekly Plans and Meal Templates database IDs exist but are not fully used.
- [ ] Production smoke-test automation is read-only by design and does not cover OpenAI analysis or Notion write flows.
- [ ] Beta 3.5 added local write-flow verification for Analyze -> Save -> Notion -> Meals -> Dashboard, but production write-flow smoke automation is still manual because it creates Notion records.
- [ ] Beta 2/Beta 3 feedback refresh, learning strip, usability copy, and client-only undo required no Notion schema changes. Richer feedback analytics or persisted undo/reversal would need explicit backend and schema/product decisions.

## Manual Notion Schema Gap

Ask the operator whether they want to add these compatible Meals properties:

- `Calories` — Number
- `Protein` or `Protein (g)` — Number
- `Carbs` or `Carbs (g)` — Number
- `Fat` or `Fat (g)` — Number
- `Fiber` or `Fiber (g)` — Number
- `Sodium` or `Sodium (mg)` — Number
- `Sugar` or `Sugar (g)` — Number
- `Nutrition Confidence` — Select or Rich text, or Number using `1=low`, `2=medium`, `3=high`.
- `Nutrition Provenance` — Select or Rich text
- `Nutrition Source` — Select or Rich text
- `Meal Quality Score` — Number
- `Metabolic Score` — Number
- `Protein Score` — Number
- `Fiber Score` — Number
- `Energy Density Score` — Number
- `Processing Score` — Number
- `Satiety Score` — Number
- `Blood Sugar Risk Score` — Number
- `Meal Date` — Date, optional; current dashboard can still group by Notion created time when absent.

Optional quality component fields not covered by this reliability slice:

- `Sodium Score` — Number
- `Sugar Score` — Number
- `Diversity Score` — Number
