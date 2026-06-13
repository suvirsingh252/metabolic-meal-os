# Known Issues

Last updated: 2026-06-13 (Beta 6 QA closeout; Beta 6.3-6.5 family-feedback closeout)

For a brand-new PM/chat, start with `docs/PM_HANDOVER.md`, then review this file for active blockers and risks.

## Current QA Status (2026-06-13)

Validation gate is green on `main`: `npm run typecheck`, `npm run lint`, `npm test` (358/358), and `npm run build` all pass. The 2026-06-13 QA pass was documentation-only and changed no runtime behavior. Security findings B1–B7 remain OPEN and tracked in `docs/AUDIT-2026-06-11.md`; this pass did not change them. A first step toward Beta 6.6 URL Recovery exists, committed locally as `ce7dc0d` (`getUrlRecoveryCopy` + `tests/analyze-guided-recovery.test.ts`) but not yet pushed.

## Critical

- No active critical issues.

## Bugs

- [ ] In-app browser localhost testing has sometimes been blocked by `net::ERR_BLOCKED_BY_CLIENT`; use command-line checks or a normal browser if this recurs.
- [ ] In-app browser form filling can fail when the virtual clipboard is unavailable; use command-line API checks or a normal browser for generated `/analyze` result testing if this recurs.
- [ ] Multiple Next dev servers can remain running on alternate ports after interrupted sessions; check with `lsof -ti :3011` or inspect `.next/dev/logs`.

## Beta 3.6 Intake Known Limitations

- [ ] Intake URL classification is heuristic: recipe-URL detection is path-based (`/recipe`, `/recipes`, etc.) and may misclassify uncommon recipe sites with non-standard paths as `unknown-url`.
- [ ] Social URL parsing (Instagram, TikTok, YouTube) does not extract caption/ingredients from server-side fetches. Users must paste the caption or recipe text manually for complete analysis.
- [ ] Publisher-blocked, login-gated, bot-protected, or script-rendered URLs still occur. The app should guide users toward pasted captions, ingredient lists, or recipe text when server-side fetch cannot recover enough detail.
- [ ] The intake bridge panel pre-fills the analyze textarea but does not automatically trigger analysis. The user must tap Analyze Recipe.
- [ ] iPhone Shortcut setup is manual: no automated provisioning or QR code. See README for step-by-step instructions.
- [ ] `NOTION_MEAL_INTAKE_DATABASE_ID` must be set manually; there is no in-app database creation or migration flow.

## Planner v1.1 Known Limitations

- [ ] `NOTION_MEAL_PLAN_SOURCE_ID` must be set manually and the Meal Plan data source/database must be shared with the Notion integration. `NOTION_MEAL_PLAN_DATABASE_ID` remains a fallback.
- [ ] Planner assignment uses existing saved Meals only. There is no AI week generation, grocery-list generation, drag-and-drop, or meal invention.
- [ ] Clearing a planned meal removes the Meal relation and resets status/source, but it does not archive/delete the Notion Meal Plan row.

## Beta 5 Cookbook Known Limitations

- [ ] Family adjustments are persisted as marked Meal Feedback notes, not a dedicated Family Adjustments table. This is schema-neutral but append-only and should be migrated if richer editing/history is needed.
- [ ] Older meals without recognizable Ingredients or Instructions sections show cookbook empty states and rely on Original Recipe access.
- [ ] Cookbook ingredient parsing is read-time and conservative. It preserves `name`, `quantity`, `unit`, and `rawText` where available, but it is not ready for grocery aggregation.
- [x] `Add to Planner` now deep-links to `/planner?meal=<id>` and Planner preselects the matching saved meal for assignment.
- [ ] Original recipe access uses `Source URL` when present and the saved Notion record as fallback.

## Beta 6.3-6.5 Family Feedback Known Limitations

- [ ] Visible nutrition tables on recipe pages remain unsupported unless the same data is exposed as schema.org JSON-LD nutrition.
- [ ] Ingredient-based nutrition estimates are intentionally approximate and cover calories, protein, and fiber only. Carbs, fat, sodium, and sugar remain blank unless imported or manually reviewed.
- [ ] Full Analyze parity is not yet preserved on saved meals. Meal Detail surfaces a compact summary from existing persisted fields, but fields that are not saved today cannot be reconstructed exactly.
- [ ] Notion schema dependence still exists. Optional nutrition/source/quality/cookbook fields only persist when compatible Notion properties already exist; the app does not create or migrate schema.
- [ ] Persistent Intelligence Snapshot v2 is still a future candidate if saved meals need exact Analyze-state preservation.

## Beta 5.1 Capture Known Limitations

- [ ] The household Meals database has no dedicated `Ingredients`/`Instructions` properties yet, so persisted recipe content currently lives in the canonical `Ingredients:`/`Instructions:` Notes sections. Adding those rich_text properties in Notion upgrades persistence automatically on the next save; no code change needed.
- [ ] AI `extractedIngredients`/`extractedInstructions` (used only for manual/pasted text the URL parser cannot see) are verbatim-copy instructed but still model-generated; spot-check pasted-caption saves.
- [ ] Meals saved before Beta 5.1 still lack recipe content; there is intentionally no Notion write-back migration. Re-analyzing and re-saving the recipe URL recreates a complete cookbook entry.
- [ ] `Source URL` matching is alias-based (`Source URL`, `Source Url`, `Original Source`, `sourceUrl`). Renaming the Notion property outside this list silently disables source-link persistence.
- [ ] Cookbook capture caps: 100 ingredients and 60 instruction steps per meal; Notes content caps at 20,000 characters across chunked rich_text blocks.

## Technical Debt

- [ ] API validators duplicate helpers such as `isRecord`, `isEnumValue`, and `validationError`.
- [ ] Client pages duplicate local `EnumSelect` and `BooleanInput` helpers.
- [ ] Notion `getNotionPageUrl` helper is duplicated across API routes.
- [ ] Test coverage is still focused unit coverage, not full route/integration coverage.
- [ ] `buildMealNotesSummary` now chunks Notes across 2000-character rich_text blocks up to a 20,000-character total with an explicit marker beyond that. Structured evidence fields should still be added to Notion where practical.
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

- [ ] Beta 4 reduced mobile scrolling and cognitive load across primary routes, but visual verification still needs an on-device iPhone Safari pass because the in-app Browser connector was unavailable during implementation.
- [ ] `/settings` remains intentionally admin/operator oriented. It has tabs and separates diagnostics from household defaults, but it still needs deeper simplification if non-technical family members must use diagnostics.
- [ ] Dashboard, Meal Detail, and Today now use progressive disclosure heavily. If family users miss secondary data, revisit which sections should be open by default on desktop versus mobile.
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

- [ ] Add full authentication and household ownership before wider public sharing. Since 2026-06-12 the deployment is private by default (fail-closed 503 without `APP_AUTH_TOKEN`, `/login` cookie flow, constant-time shared auth helper), but this is still a single shared token, not per-user auth/RBAC.
- [ ] `PRIVATE_DEPLOYMENT_MODE=false` legacy unauthenticated opt-out is deprecated (warns at runtime); remove it after one release in favor of `ALLOW_UNAUTHENTICATED=true`.
- [ ] Replace single-instance memory rate limiting with Redis/Upstash or platform-native distributed throttling before public launch.
- [ ] Consider replacing Notion with a dedicated database if relational querying, permissions, or performance require it.
- [ ] Consider provider abstractions for AI and storage after workflows stabilize.

## Temporary Implementations

- [ ] Notion is the only persistence layer.
- [ ] Ingredient suggestions are still saved by normalized name only. They can now be related to Meals when a compatible relation property exists, but structured ingredient quantity/unit persistence is still deferred.
- [ ] Structured ingredients are type/helper-ready. Beta 5 adds read-time cookbook quantity/unit parsing for meal detail display, but dedicated structured ingredient persistence is not implemented.
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
- [ ] Legacy Weekly Plans and Meal Templates database IDs exist but are not used by `/planner`; the new planner uses `NOTION_MEAL_PLAN_SOURCE_ID`.
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
