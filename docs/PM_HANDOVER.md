# PM Handover

Last updated: 2026-05-24

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
- Do not add exact calorie or macro tracking unless explicitly approved later; current nutrition data is contextual and approximate.

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
- PWA/mobile shell: manifest, app metadata, icons, safe-area/mobile layout work.
- Read-only production smoke-test automation via `npm run smoke:prod`.
- `/analyze` review UI has a first household-first simplification pass with progressive disclosure.

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

## 4. Current User Experience

`/analyze`:
- User pastes a meal idea, recipe text, or recipe URL.
- App analyzes it with OpenAI.
- Review result starts with a household-first summary: "is this workable?", compact protein/satiety/blood-sugar context, smallest helpful change, why it helps, and cultural-preservation notes.
- Existing editable details remain available through progressive sections.
- Evidence, safety, source metadata, scores, and advanced saved fields are secondary/collapsed so they do not dominate the household answer.
- User can save the meal to Notion; ingredient suggestions persist separately.

`/meals`:
- Loads saved Meals from Notion.
- Functional list view only. No filtering, search, or meal detail page yet.

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
- No authentication. Do not broaden public sharing before auth exists.
- No automated write-flow smoke tests; current smoke automation is read-only.
- Structured ingredient parsing/persistence is pending.
- Structured ingredient parsing/persistence is pending.
- Recipe parser is dependency-free and improved for shared intake, but still cannot bypass blocked, login-gated, video-only, or client-rendered sources.
- FoodData Central matching is improved but still heuristic.
- Notion-only persistence may eventually limit querying, permissions, and performance.
- No exact macro/calorie tracking by design.

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
2. UX pass across `/meals`, `/feedback`, and `/settings`.
3. Structured ingredient persistence.
4. Structured ingredient persistence.
5. Continue real-world recipe/social URL intake testing and record blocked/problematic domains.
6. Write-flow smoke tests.
7. Meal detail page.
8. Household preference persistence.
9. Weekly planning later.

## 10. How The New PM Should Start

1. Read `docs/PM_HANDOVER.md`.
2. Then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, and `docs/KNOWN_ISSUES.md`.
3. Summarize current state, active blockers, technical debt, and recommended next slice.
4. Confirm product priorities with the user before suggesting implementation work.
5. Do not start coding until product priorities are confirmed.
