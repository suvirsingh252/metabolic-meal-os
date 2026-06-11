# PM Handover

Last updated: 2026-06-11

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
- Today feedback undo is client-only. It restores local Today UI state and does not reverse Notion history.
- PWA/mobile shell: manifest, app metadata, icons, safe-area/mobile layout work.
- Read-only production smoke-test automation via `npm run smoke:prod`.
- `/analyze` review UI has a first household-first simplification pass with progressive disclosure.
- Dashboard intelligence remains available at `/dashboard` through `/api/dashboard`, `DashboardViewModel`, daily/weekly summaries, insights, configurable targets, recent meals, and meal quality v1.
- Local nutrition persistence v1 exists but has not been deployed from this session: recipe JSON-LD nutrition facts can flow into review, users can edit nutrition totals before save, and Notion writes compatible existing nutrition/quality properties only.

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
- User can save the meal to Notion; ingredient suggestions persist separately.
- Review includes editable nutrition totals. Blank values remain unknown; the app distinguishes unknown from zero.

`/`:
- Loads Today from saved meals and existing feedback summaries.
- Shows daily meal suggestions, quick `Ate This` / `Loved It` feedback actions, a compact Recent Household Learning strip, and client-only undo for the latest successful feedback on a card.
- Feedback actions write to Notion through the existing feedback API and optimistically refresh local card summaries while server data catches up.

`/dashboard`:
- Loads dashboard intelligence from `/api/dashboard`.
- Shows daily nutrition, configurable targets, smart insights, weekly trends, recent meals, and quality summaries.
- Targets for calories, protein, fiber, and sodium are client-side only for now.

`/meals`:
- Loads saved Meals from Notion.
- Links to `/meals/[id]` detail pages.

`/meals/[id]`:
- Shows saved meal context, household feedback, nutrition/quality context, and quick feedback actions.
- Feedback actions write to Notion and optimistically refresh visible household feedback counts.

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
- Used by `/feedback`, Today quick actions, and Meal Detail quick actions. No Beta 2 feedback polish schema changes were required.

Weekly Plans:
- Configured by env/database ID but not actively used yet.
- Future planning workflow.

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
- Today feedback undo is client-only and does not delete/reverse Notion feedback records.
- Structured ingredient parsing/persistence is pending.
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

1. Real-meal tone and household usability review.
2. Add a Notion schema checklist/migration path for explicit nutrition and quality fields, then an operator-triggered backfill job for legacy score fields.
3. UX pass across `/meals`, `/feedback`, and `/settings`.
4. Structured ingredient persistence.
5. Continue real-world recipe/social URL intake testing and record blocked/problematic domains.
6. Write-flow smoke tests.
7. Persisted feedback reversal/delete path, only if product rules require it.
8. Household preference persistence.
9. Weekly planning later.

## 10. Manual Closeout Notes From 2026-05-25

Do not assume the latest local dashboard/nutrition work is deployed. This closeout explicitly did not deploy, push, or mutate Vercel/Notion.

Manual Vercel deployment:
1. Confirm locally: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
2. Commit and push from the local machine when ready.
3. In Vercel, confirm required env vars are present.
4. Trigger or wait for deployment from `main`.
5. Smoke test `/`, `/analyze`, `/dashboard`, `/api/dashboard`, and `/api/analyze-meal`.
6. If private/token guardrails are enabled, verify required token/header/cookie behavior in production.

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
