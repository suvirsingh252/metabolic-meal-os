# PM Handover

Last updated: 2026-06-25 (Phase 8 grocery planning milestone closeout)

This is the recommended starting point for a new PM/chat with no prior conversation context. Read this first, then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, and `docs/KNOWN_ISSUES.md` before proposing work.

## 1. Product Summary

Metabolic Meal OS is a household meal-review app. It helps a family paste a meal idea, recipe text, or recipe URL and get a practical, editable analysis focused on whether the meal is workable, what small changes would help most, and how to preserve the dish while nudging it toward better protein, fibre, satiety, and blood-sugar friendliness.

It is for a Canadian household context, with explicit support for family diabetes-risk awareness, insulin-sensitivity-friendly eating, possible PCOS-supportive dietary patterns, and mixed Indian and Atlantic Canadian food patterns.

The product exists to make everyday food decisions easier without turning family cooking into a medicalized or overly numeric project. Cultural food preservation is central: the app should help improve familiar meals, not replace them with generic "healthy" alternatives.

Medical safety boundary:
- Do not diagnose diabetes, PCOS, insulin resistance, prediabetes, infertility, or any condition.
- Do not claim to treat, cure, prevent, reverse, or manage disease.
- Do not replace clinician, registered dietitian, pharmacist, or other qualified professional advice.
- Do not provide medication, supplement, fertility, insulin, or individualized clinical dosing advice.
- Do not ask OpenAI to invent exact calorie or macro totals. Meal-level nutrition totals may be persisted when they come from recipe structured data or user review edits with clear provenance.

## 2. Current Production State

Live and working:
- Deployed Next.js app on Vercel.
- Notion persistence for Meals, Ingredients, and Meal Feedback.
- OpenAI meal analysis through `POST /api/analyze-meal`.
- Evidence-Aware Analysis v3 with evidence notes, confidence notes, safety disclaimer, and source/principle-linked guidance basis.
- Recipe/shared URL support through a server-side parser that classifies normal recipe pages, short links, social/video links, unknown URLs, and manual text; it prefers Recipe JSON-LD, uses bounded metadata/page-text fallback, and gives clear caption/transcript fallback messages for blocked social links.
- Ingredient suggestion persistence from `/analyze` into Notion Ingredients, including duplicate prevention.
- Schema-aware Ingredient -> Meal relation support when the active Ingredients database has a compatible relation property pointing to Meals.
- USDA FoodData Central lookup and explicit Ingredient enrichment.
- Settings Ingredient picker/enrichment UX so users can enrich existing Notion Ingredients without manually pasting page IDs.
- Ingredient-aware analysis context: known Notion Ingredients can be read before analysis and included as lightweight household context.
- Feedback logging, including saved-meal selection and relation write support when the Notion relation exists.
- Today is the root experience at `/`; `/dashboard` remains available for dashboard intelligence.
- Meal Detail is available at `/meals/[id]`, with internal links from Today and Meals.
- Today and Meal Detail feedback actions save to Notion and optimistically refresh visible household feedback summaries.
- Today includes a Recent Household Learning strip derived from existing feedback summaries.
- Today feedback undo is client-only. It restores local Today UI state and does not reverse persisted feedback history.
- Today recommendations now use deterministic adaptive scoring from saved meal metadata and existing household feedback summaries. Ranking has no AI calls, no new Notion fields, and card-level `Why this meal?` explanations.
- Beta 3 usability closeout is local and ready for deployment: normal household flows use Meal OS language instead of Notion-facing copy; external saved-record links and raw notes are under Advanced details; Analyze has staged loading copy; Dashboard starts with household takeaways; Meal Detail starts with a household summary.
- Beta 3.5 functional audit is local and ready for deployment: critical nutrition persistence is fixed against the active Notion Meals data source, numeric Nutrition Confidence is supported, Dashboard aggregation reflects newly saved nutrition, mobile Today `Suggest Another` rotates correctly for categories with alternatives, and Meals detail links have reliable phone tap targets.
- PWA/mobile shell: manifest, app metadata, icons, safe-area/mobile layout work.
- Read-only production smoke-test automation via `npm run smoke:prod`.
- `/analyze` review UI has a first household-first simplification pass with progressive disclosure.
- Dashboard intelligence remains available at `/dashboard` through `/api/dashboard`, `DashboardViewModel`, daily/weekly summaries, insights, configurable targets, recent meals, and meal quality v1. Beta 3.5 verified a known saved meal round-tripped `755 kcal`, `26 g protein`, `15 g fiber`, `medium` confidence, `estimated` source, provenance, and quality into Notion retrieval and dashboard totals.
- Grocery Engine is live at `/grocery`: users can generate categorized,
  deduplicated grocery lists from one or more meals, open saved grocery lists,
  and check items off while shopping.
- Ingredient Intelligence Hardening is live: grocery generation splits obvious
  ingredient blobs, strips notes such as `optional`, `as needed`, and retailer
  annotations, normalizes common ingredient aliases, and maps every item to a
  grocery category.
- Weekly Meal Planning is live at `/planner`: users can select one dinner for
  each day of the current week, generate one consolidated grocery list from the
  plan, regenerate after plan changes, and keep checklist progress across
  refreshes or multiple shopping trips.
- Production database migrations through Phase 8B are applied and verified in
  Neon/Vercel Postgres. Current production commit is
  `5fe91983e32f175971a22db74033566da1050f71`.

Recently verified production facts:
- Evidence-Aware Analysis v3 works in production.
- Recipe URL analysis works in production.
- `/api/notion/save-ingredients` works in production.
- Ingredient duplicate prevention works.
- USDA lookup works.
- USDA enrichment works when a valid Ingredient page ID is provided.
- V2 and V3 Notion Notes summaries persist.
- Meals load from production.
- Feedback save works.
- Read-only smoke automation passes against the live Vercel URL.

## 3. Architecture Overview

Core stack:
- Next.js App Router with TypeScript.
- React client components for interactive pages.
- Tailwind CSS and local shadcn-style UI primitives.
- Vercel deployment.

Data and services:
- Notion is the current persistence layer.
- Neon/Vercel Postgres stores Phase 8 weekly dinner plans, grocery list history,
  and grocery checklist items.
- OpenAI is the analysis layer and returns structured JSON.
- USDA FoodData Central is the nutrient lookup/enrichment source.
- Source registry and health-guidance modules provide static evidence-aware guidance context.

Important architecture rules:
- Secrets are server-side only. Do not use `NEXT_PUBLIC_` for OpenAI, Notion, or USDA keys.
- Route-scoped env validation lives in `src/lib/env.ts`.
- External providers should enter through `src/lib/integrations/*`.
- AI-generated analysis and enrichment should remain separate from canonical recipe data unless deliberately reviewed/promoted.
- Notion schema is not created or mutated by the app; routes only write compatible existing properties.
- Dashboard analytics are pure domain functions under `src/lib/domain/analytics`; React components do not aggregate nutrition directly.

## 4. Current User Experience

`/analyze`:
- User pastes a meal idea, recipe text, or recipe URL.
- App analyzes it with OpenAI.
- Review result starts with a household-first summary: "is this workable?", compact protein/satiety/blood-sugar context, smallest helpful change, why it helps, and cultural-preservation notes.
- Existing editable details remain available through progressive sections.
- Evidence, safety, source metadata, scores, and advanced saved fields are secondary/collapsed so they do not dominate the household answer.
- User can click `Save meal`; the success state says `Saved to Meal OS.` Ingredient suggestions persist separately.
- Long analysis runs show staged copy such as `Reading meal details...`, `Estimating household fit...`, `Checking nutrition signals...`, and `Preparing your review...`, plus a 20-30 second expectation.
- Review includes editable nutrition totals. Blank values remain unknown; the app distinguishes unknown from zero.

`/`:
- Loads Today from saved meals and existing feedback summaries.
- Shows daily meal suggestions, expandable `Why this meal?` explanations, quick `Ate This` / `Loved It` feedback actions, a compact Recent Household Learning strip, and client-only undo for the latest successful feedback on a card.
- Feedback actions write to Notion through the existing feedback API and optimistically refresh local card summaries while server data catches up.
- `Ate This` logs eaten only. `Loved It` logs eaten, loved, and worth repeating. Copy does not claim persisted undo.

`/dashboard`:
- Loads dashboard intelligence from `/api/dashboard`.
- Starts with household takeaways: what Meal OS learned, what to do next, and confidence. Then shows daily nutrition, configurable targets, smart insights, weekly trends, recent meals, and quality summaries.
- Technical data coverage/source diagnostics live under Advanced data coverage.
- Targets for calories, protein, fiber, and sodium are client-side only for now.

`/meals`:
- Loads saved Meals from Notion.
- Uses Meal OS wording and links to `/meals/[id]` detail pages; external saved-record links are not primary list actions.

`/meals/[id]`:
- Starts with household summary, feedback, why the meal works, nutrition/quality context, and quick feedback actions.
- Feedback actions write to Notion and optimistically refresh visible household feedback counts.
- Raw notes, provenance, and external saved-record links are hidden under Advanced details.
- `Would Make Again` is repeat-only in household summaries.

`/planner`:
- Shows the current week and supports one dinner selection per day.
- Persists selections in Postgres through `/api/weekly-plan`.
- Generates or regenerates a consolidated grocery list from planned meals.
- Recommended next integration point: Dinner Concierge should be able to send a
  chosen dinner into this planner without duplicating planner logic.

`/grocery`:
- Generates grocery lists from one or more meals or opens an existing saved
  list.
- Groups items by grocery category and deduplicates after normalization.
- Persists generated list history and checklist completion state.
- `/grocery?meal=<id>` remains the single-meal deep link; `/grocery?list=<id>`
  opens saved lists.

`/feedback`:
- Loads saved meals for selection.
- Allows saved-meal or manual feedback.
- Writes to Notion Meal Feedback.
- Writes the Meal relation when a compatible relation property exists; otherwise saves feedback with a warning.

`/settings`:
- Notion diagnostics.
- Notion schema diagnostics.
- USDA ingredient lookup.
- Ingredient picker/enrichment flow for existing Notion Ingredients.
- Household defaults are visible/implicit but not yet persistently editable.

## 5. Data Model / Notion Databases

Meals:
- Actively used.
- Stores analyzed meals and core classification fields.
- `Notes` contains original notes plus concise Analysis Framework v2 and Evidence-Aware v3 summaries.
- Optional source tracking fields are written only if compatible Notion properties exist.
- Optional nutrition totals, nutrition provenance, explicit score fields, and meal quality score are written only if compatible Notion properties exist.

Ingredients:
- Actively used.
- Stores normalized ingredient suggestions after meal save.
- Supports nutrient fields used by explicit USDA enrichment.
- Can relate back to saved Meals when the active Ingredients schema exposes a compatible relation property.
- Structured ingredient persistence is not implemented yet.

Meal Feedback:
- Actively used.
- Stores post-meal feedback.
- Supports optional relation to Meals when Notion is configured with a compatible relation property.
- Used by `/feedback`, Today quick actions, Meal Detail quick actions, Recent Household Learning, and deterministic Today preference scoring. No Beta 2/Beta 3 schema changes were required.

Weekly Plans:
- Phase 8B current-week dinner planning is active in Postgres.
- Legacy Notion planner data/source configuration may still exist for older
  planning history, but the grocery workflow now uses the Postgres weekly plan.

Grocery Lists:
- Active in Postgres.
- Store list metadata, source type, generated meal IDs, optional week start
  date, item count/history, and per-item completed state.

Meal Templates:
- Configured by env/database ID but not actively used yet.
- Future reuse/template workflow.

## 6. External Sources / Safety

Current source foundation:
- USDA FoodData Central: nutrient lookup and explicit Ingredient enrichment.
- Diabetes Canada Clinical Practice Guidelines: diabetes-aware safe guidance principles.
- Canada's Food Guide: Canadian healthy eating guidance.
- 2023 International Evidence-Based PCOS Guideline: PCOS-aware safe guidance principles.
- Health Canada / Canadian Nutrient File: trusted Canadian nutrient-data source for future use.
- Open Food Facts: future/lower-confidence crowdsourced packaged-food source.

Safety rules:
- No diagnosis.
- No treatment/cure/prevention/reversal claims.
- No supplement, medication, fertility, insulin, or dosing advice.
- Not a substitute for clinician/dietitian advice.
- Guidance should be general, practical, cautious, and culturally preserving.
- Ingredient context supports judgment; it must not pretend to calculate exact meal nutrition.

## 7. Current Technical Debt

Highest priority:
- No full authentication. Private deployment/token guardrails exist, but do not broaden public sharing before real auth exists.
- No automated write-flow smoke tests; current smoke automation is read-only.
- Production write-flow verification still needs manual or explicitly opted-in automation because it creates Notion records.
- Today feedback undo is client-only and does not delete/reverse Notion feedback records.
- Persisted feedback reversal/delete remains deferred; do not imply feedback can be durably undone until a backend behavior exists.
- Recommendation scoring is deterministic v1 and unpersisted; there is no recommendation audit log or planning workflow yet.
- Structured ingredient parsing/persistence is pending.
- Grocery quantity aggregation, unit conversion, pantry deduction, and retailer
  integrations are intentionally deferred; current grocery lists are normalized
  ingredient-name checklists.
- No Notion write-back migration exists for legacy nutrition or quality fields.
- Dashboard targets are client-side only.
- Recipe parser is dependency-free and improved for shared intake, but still cannot bypass blocked, login-gated, video-only, or client-rendered sources.
- FoodData Central matching is improved but still heuristic.
- Notion-only persistence may eventually limit querying, permissions, and performance.
- Legacy meals may lack exact macro/calorie totals by design; read-time quality backfill from scorecards is available, but exact nutrition is not invented.

Other debt:
- Duplicated route validators/helpers.
- Duplicated local client form helpers.
- Notion URL helper duplicated across API routes.
- Notion Notes field has a 2000-character rich_text limit.
- Save-meal validator still accepts missing v2 fields leniently for backward compatibility.

## 8. Current Product Risk

- UI may still be too dense for non-technical family users outside `/analyze`.
- Health guidance must stay safe, general, and non-medicalized.
- Evidence-aware analysis must not become over-precise or sound clinical.
- Known Ingredient context and USDA nutrient snapshots should improve judgment, not imply exact recipe-level nutrition.
- FoodData Central matching can still choose imperfect records, especially culturally specific or variety-specific staples such as basmati rice.
- Recipe/shared URL parsing can still fail on blocked, login-gated, client-rendered, or video-only pages. TikTok, Instagram, and YouTube Shorts often require the user to paste captions, transcripts, ingredients, or spoken summaries.

## 9. Recommended Next Slices

1. Deploy and manually verify Beta 3.5 functional hardening on Vercel/Notion, including nutrition lifecycle, Today mobile actions, Meals detail links, Dashboard aggregation, and Feedback writes.
2. Add production write-flow smoke tests with explicit disposable-record opt-in and cleanup rules.
3. Add a Notion schema checklist/migration path for any remaining explicit nutrition and quality fields, then an operator-triggered backfill job for legacy score fields.
4. UX pass across `/settings` and any remaining admin/operator surfaces.
5. Structured ingredient persistence.
6. Continue real-world recipe/social URL intake testing and record blocked/problematic domains.
7. Persisted feedback reversal/delete path, only if product rules require it.
8. Household preference persistence.
9. Dinner Concierge -> Weekly Planner Integration.

## 10. Manual Closeout Notes From 2026-05-25

Do not assume the latest local dashboard/nutrition work is deployed. This closeout explicitly did not deploy, push, or mutate Vercel/Notion.

Manual Vercel deployment:
1. Confirm locally: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
2. Commit and push from the local machine when ready.
3. In Vercel, confirm required env vars are present.
4. Trigger or wait for deployment from `main`.
5. Smoke test `/`, `/analyze`, `/dashboard`, `/api/dashboard`, and `/api/analyze-meal`.
6. If private/token guardrails are enabled, verify required token/header/cookie behavior in production.
7. For the Beta 3 usability pass, verify:
   - Analyze still saves meals successfully to Notion.
   - Saved meals appear in Meals with Meal OS wording, not Notion wording.
   - Today feedback writes to Notion as expected.
   - `Ate This`, `Loved It`, and `Would Make Again` semantics appear correctly in saved feedback summaries.
   - Dashboard household takeaways update after feedback/data changes.
   - Meal Detail shows household summary first and hides raw notes/external links under Advanced details.
   - Mobile deployment has no horizontal overflow on Analyze, Today, Dashboard, Meals, Feedback, and Meal Detail.
   - No user-facing copy implies feedback can be persistently undone unless that feature is actually implemented.

Manual Notion schema:
- The app does not create or mutate Notion schema automatically.
- Add compatible Meals fields manually if nutrition and quality persistence should be active.
- Current compatible fields include Number fields for calories, protein, carbs, fat, fiber, sodium, sugar, meal quality score, and explicit analysis scores; Select or Rich text fields for nutrition confidence/provenance/source.

## 11. How The New PM Should Start

1. Read `docs/PM_HANDOVER.md`.
2. Then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, and `docs/KNOWN_ISSUES.md`.
3. Summarize current state, active blockers, technical debt, and recommended next slice.
4. Confirm product priorities with the user before suggesting implementation work.
5. Do not start coding until product priorities are confirmed.
