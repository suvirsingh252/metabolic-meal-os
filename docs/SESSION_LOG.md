# Session Log

## 2026-05-25 Visual + Mobile Review Hardening and Household Fixture Expansion

Goal:
- Harden the estimate review experience, mobile readability, household shorthand reliability, and provenance edge cases before expanding nutrition rules further.

Completed work:
- Expanded the deterministic free-text estimator to cover generic chicken, toast, wraps/rolls, and leftover curry/sabzi while keeping estimates limited to calories, protein, and fiber.
- Added household shorthand fixtures for `2 rotis and dal`, `paneer wrap`, `rice and chicken`, `egg bhurji and toast`, `oats with yogurt`, `salad with chicken`, `leftover curry and rice`, `small paneer bowl`, `large chicken salad`, and `2 eggs and toast with butter`.
- Hardened quantity parsing so a quantity before one component does not cross conjunctions and incorrectly multiply a later component.
- Improved `/analyze` nutrition review clarity: structured, estimated, reviewed estimate, user-edited estimate/manual, and unavailable states are more distinct.
- Made estimate assumption badges wrap, serving multiplier buttons easier to tap on mobile, provenance text more readable, and dashboard chips/cards less prone to truncating important labels.
- Changed repeated serving multiplier and butter review actions to replace stale provenance notes instead of accumulating conflicting notes.
- Added tests for serving adjustments, butter removal after serving adjustment, clearing estimated values, partial manual overrides, unavailable nutrition persistence, and Notion null-safe behavior.

Validation:
- `npm test` passed.

Notion review:
- No Notion schema/workflow update is required for this slice. Serving-adjusted provenance, estimate source tracking, and user-entered override tracking already fit the existing optional `Nutrition Source`, `Nutrition Provenance`, `Nutrition Confidence`, and nullable nutrition number fields. Dashboard compatibility is preserved because totals remain numeric-or-null and source/provenance remain strings.

Known limitations:
- Estimates remain conservative, incomplete, and not clinical-grade.
- No micronutrients, detailed cooking-fat amounts, ingredient-weight parsing, or advanced nutrition model expansion was added.
- On-device mobile Safari review is still recommended before production promotion.

## 2026-05-25 Good Enough Nutrition Estimation v1

Goal:
- Improve dashboard usefulness for common manual/free-text meals without pretending to provide clinical-grade nutrition.

Completed work:
- Added `src/lib/domain/nutrition/free-text-estimator.ts`, a deterministic rule set for common household components: paratha/parantha, gobi/cauliflower, butter, eggs, chicken breast, paneer, dal/lentils, rice, yogurt/curd, roti/chapati, oats, and salad/vegetables.
- Wired manual/free-text meal preparation to produce `nutritionEstimate.source: estimated` only when enough recognizable food detail exists.
- Limited automatic estimates to calories, protein, and fiber. Carbs, fat, sodium, and sugar remain `null` unless structured nutrition or user review provides them.
- Preserved structured recipe JSON-LD precedence over estimates.
- Updated the `/analyze` nutrition review panel to label estimates with: `Estimated from meal description. Review before saving.`
- Kept all nutrition fields editable; review edits convert source to `user-entered` and append edit provenance while preserving blank/null fields.
- Added tests for `gobi parantha with butter`, `grilled chicken breast with salad`, vague input, structured JSON-LD precedence, review-edit provenance, and Notion null-field mapping.

Validation:
- `npm test` passed.

Known limitations:
- Estimates are conservative household assumptions, not full nutrition science.
- Coverage is intentionally incomplete and only fills dashboard-critical calories/protein/fiber.
- Dashboard totals may include saved estimates, so provenance/source must remain visible and reviewable.

## 2026-05-25 Session Closeout: Dashboard + Nutrition Persistence

Instruction:
- Close the current Metabolic Meal OS session.
- Do not deploy, push, or make Vercel/Notion changes directly.

Docs updated:
- `docs/PM_HANDOVER.md`
- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/ROADMAP.md`
- `docs/SOURCES.md`
- `docs/SESSION_LOG.md`

Documented final local state:
- Beta hardening and audit work: private deployment/token guardrails, API request guards, rate limits, request size limits, recipe URL SSRF protections, strict meal validation, and canonical nutrition provenance.
- Dashboard Behavioral Intelligence slice: analytics architecture, `/api/dashboard`, `DashboardViewModel`, daily/weekly aggregation, rule-based insights, recent meals, and dashboard UI.
- Nutrition Persistence + Targets + Meal Quality v1: recipe JSON-LD nutrition extraction, editable nutrition totals in review flow, meal-level nutrition persistence, configurable dashboard targets, meal quality v1 scoring, and legacy scorecard read-time backfill.
- Manual Vercel deployment checklist.
- Manual Notion schema checklist and schema policy.
- Known gaps and recommended next slice.

Manual Vercel deployment checklist:
- Confirm these pass locally: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Commit and push from the local machine when ready.
- In Vercel, confirm required environment variables are present.
- Trigger or wait for deployment from `main`.
- Smoke test `/`, `/analyze`, `/dashboard`, `/api/dashboard`, and `/api/analyze-meal`.
- If private deployment/token guardrails are enabled, verify required access header/token behavior in production.

Manual Notion schema checklist:
- The app does not create or mutate Notion schema automatically.
- Nutrition and quality fields are written only when compatible properties already exist.
- Ask the operator whether they want to add compatible Meals properties for calories, protein, carbs, fat, fiber, sodium, sugar, nutrition confidence/provenance/source, meal quality score, and explicit score fields.

Known gaps:
- Legacy meals may lack exact nutrition totals.
- Legacy quality backfill is read-time only from scorecards.
- No Notion write-back migration exists yet.
- Dashboard targets are client-side only.
- No household-level analytics yet.
- No predictive coaching or ML yet.
- Browser visual verification was not completed because the Browser plugin reported `iab` unavailable.

Final verification:
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.

Recommended next slice:
- Add a Notion schema checklist/migration path for explicit nutrition and quality fields, then an operator-triggered backfill job for legacy score fields.

## 2026-05-25 Dashboard Behavioral Intelligence Slice

Goal:
- Turn saved meal records into a first-pass behavioral intelligence dashboard without predictive coaching, ML, household analytics, or OpenAI-generated insights.

Completed work:
- Added a pure analytics domain layer for nutrition totals, 7-day windows, recent meal sorting, target progress, weekly consistency labels, and rule-based insights.
- Added default nutrition targets for calories, protein, fiber, and sodium.
- Added `/api/dashboard`, backed by the existing Notion meal list query path.
- Refactored the Notion meal list query into a shared utility so `/api/notion/meals` and `/api/dashboard` use the same persistence read logic.
- Extended meal summaries with `createdAt` and optional nutrition fields when compatible Notion number/formula properties exist.
- Replaced the placeholder dashboard with daily snapshot cards, smart insights, weekly trend cards, and recent meals at `/` and `/dashboard`.
- Added analytics unit tests for empty lists, missing nutrition, today aggregation, 7-day aggregation, low protein, high sodium, positive target-met insights, and recent meal sorting.

Validation:
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Started local dev server at `http://localhost:3027`.

Known limitations:
- Existing meal persistence does not currently write recipe-level calories/macros by default. The dashboard maps optional compatible Notion properties if present and otherwise shows unknown nutrition values without breaking.
- In-app browser verification could not run because the Browser plugin reported `iab` unavailable.

Recommended next slice:
- User-configurable nutrition targets and meal quality scoring.

## 2026-05-25 Nutrition Persistence + Targets + Meal Quality v1

Goal:
- Make dashboard intelligence more reliable by ensuring saved meals can persist recipe-level nutrition totals, then add configurable nutrition targets and first-pass meal quality scoring.

Completed work:
- Added optional meal-level nutrition totals to the meal domain model: calories, protein, carbs, fat, fiber, sodium, sugar, confidence, provenance, and source.
- Added JSON-LD recipe nutrition extraction for URL recipe pages that expose structured nutrition facts.
- Added editable nutrition total fields to the meal review flow so manual or corrected recipe-level totals can be saved without asking the AI to invent exact macros.
- Extended meal validation to accept optional nutrition totals safely and reject negative/non-finite values.
- Extended Notion save mapping to persist nutrition totals and nutrition provenance when compatible Notion fields exist.
- Extended Notion save mapping to persist explicit analysis score fields and meal quality score when compatible Notion number fields exist.
- Extended saved meal reads to load nutrition totals, provenance, explicit scores, quality score, and fallback scorecard values parsed from legacy Notes.
- Added configurable dashboard targets for calories, protein, fiber, and sodium, stored client-side and passed to `/api/dashboard`.
- Added rule-based meal quality scoring using protein density, fiber density, sodium load, sugar load, ingredient diversity, and minimally processed signals where available.
- Added scorecard backfill quality scoring for existing saved meals when exact nutrition totals are unavailable.
- Surfaced today average quality, weekly average quality, best recent meal, highest-opportunity recent meal, and per-meal quality on the dashboard.

Validation:
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.

Known limitations:
- Existing saved meals generally do not contain exact nutrition totals unless nutrition facts were available from a recipe page or entered during review.
- The app does not create or mutate Notion schema. Nutrition, score, and quality fields are written only when compatible fields already exist.
- Backfill for legacy records is read-time and future-save oriented: legacy Notes scorecards can drive dashboard quality, but exact nutrition totals are not invented from qualitative analysis.

Recommended next slice:
- Notion schema migration/checklist for explicit nutrition and quality fields, followed by an operator-triggered backfill job for legacy score fields.

## 2026-05-24 Shared URL Intake Verification

Mandatory documentation hygiene:
- Read `docs/PM_HANDOVER.md` first.
- Then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/DECISIONS.md`, `docs/SESSION_LOG.md`, `docs/SOURCES.md`, and `docs/ARCHITECTURE.md`.

Goal:
- Prepare the shared URL intake work for manual deployment and production testing.
- Make only small correctness or safety fixes if verification found clear bugs.

Finding and fix:
- Found a server-side bare URL detection bug: `tiktok.com/@creator/video/...` was treated as manual text because the bare URL helper rejected any `@` character before classifying the host.
- Fixed `parseBareSharedUrl` so `@` is allowed in the path for known shared hosts while email-like host/userinfo input remains rejected.
- Added a validation case for bare TikTok creator video paths.

Validation:
- `npx tsx scripts/validate-recipe-intake.ts` passed 7 local classification/normalization cases after running outside the sandbox because `tsx` needed an IPC pipe.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local production API checks against `http://localhost:3025` passed:
  - plain pasted chana masala text returned 200 analysis and preserved `manual-text`.
  - normal Allrecipes recipe URL returned 200 analysis with `recipe-page`, JSON-LD source notes, and `recipe-parser-shared-url-v2`.
  - same Allrecipes URL with tracking parameters returned 200 analysis and clean source URL.
  - TikTok URL returned 400 with the caption/transcript fallback message when metadata lacked recipe detail.
  - bare TikTok creator URL without protocol returned 400 with the same fallback message instead of being treated as manual text.
  - Instagram Reel-style link returned 400 with the caption/transcript fallback message.
  - YouTube Shorts link returned 400 with the caption/transcript fallback message.
  - local/private `127.0.0.1` URL returned 400 `Recipe URL host is not allowed.`

Known limitations:
- Production deployment and production smoke testing remain manual and were not completed in this session.
- Browser visual verification was not attempted because previous session had `iab` unavailable; command-line API checks covered the behavior.

## 2026-05-24 Shared URL Intake For `/analyze`

Mandatory documentation hygiene:
- Read `docs/PM_HANDOVER.md` first.
- Then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/DECISIONS.md`, `docs/SESSION_LOG.md`, `docs/SOURCES.md`, and `docs/ARCHITECTURE.md`.

Goal:
- Make `/analyze` a more reliable intake tool for shared recipe and social food links without adding scraping services, browser automation, video downloads, auth, Notion schema changes, exact calorie/macro tracking, or medicalized claims.

Files changed:
- `src/lib/integrations/recipe-parser/index.ts`
- `src/lib/types/recipe.ts`
- `src/lib/types/meal.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/analyze/page.tsx`
- `scripts/validate-recipe-intake.ts`
- Documentation files listed in the end-of-session requirements.

Completed work:
- Added lightweight source classification: `manual-text`, `recipe-page`, `social-video`, `video-page`, `short-link`, and `unknown-url`.
- Improved URL acceptance for trimmed protocol URLs and common bare shared hosts such as TikTok, Instagram, YouTube, `youtu.be`, and TikTok short hosts.
- Stripped common tracking parameters such as `utm_*`, `fbclid`, `igsh`, and `si` before source storage/fetch use.
- Preserved obvious local/private host blocking before fetch and added a second blocked-host check after redirects.
- Kept Recipe JSON-LD extraction as the highest-confidence recipe/blog path.
- Improved fallback extraction with title/site metadata, OpenGraph description, likely recipe snippets, and a bounded page excerpt.
- Added social/video handling that uses accessible HTML/OpenGraph metadata only. If metadata is not recipe-like enough, the API returns a clear fallback asking for captions, transcripts, ingredients, or spoken summaries and does not call OpenAI.
- Returned `sourceClassification` and `sourceNotes` in analysis responses and displayed them in `/analyze` source details.
- Updated `/analyze` fallback UI so failed link extraction is not a dead end: the original URL remains in the textarea, and the user is told what text to paste next.

Validation:
- `npx tsx scripts/validate-recipe-intake.ts` passed 6 local classification/normalization cases after running outside the sandbox because `tsx` needed an IPC pipe.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local production API checks against `http://localhost:3024` passed:
  - plain pasted chana masala text returned 200 analysis and preserved `manual-text`.
  - normal Allrecipes recipe URL returned 200 analysis with `recipe-page`, JSON-LD source notes, and `recipe-parser-shared-url-v2`.
  - same Allrecipes URL with tracking parameters returned 200 analysis and clean source URL.
  - TikTok-style link returned 400 with the caption/transcript fallback message when metadata lacked recipe detail.
  - Instagram Reel-style link returned 400 with the caption/transcript fallback message.
  - YouTube Shorts link returned 400 with the caption/transcript fallback message when metadata lacked recipe detail.
  - local/private `127.0.0.1` URL returned 400 `Recipe URL host is not allowed.`

Known limitations:
- TikTok, Instagram, YouTube Shorts, and similar platforms may block captions/transcripts or render them client-side. Users still need to paste captions/transcripts/ingredients when accessible metadata is insufficient.
- No DNS-level private-IP SSRF check was added; current protection remains hostname/IP-pattern based before and after redirects.
- No full Readability parser dependency was added.
- In-app browser visual verification could not run because the Browser plugin reported `iab` unavailable; API and build checks covered the slice.

## 2026-05-24 Ingredient -> Meal Relation Verification

Goal:
- Re-run local safety checks for schema-aware Ingredient -> Meal relation writes before manual deployment.
- Produce exact manual deploy and production smoke-test instructions.

Finding:
- The schema diagnostics API already returned relation target database/data-source IDs, but the `/settings` UI only displayed property name and type. That was not enough to visually confirm whether the Ingredients relation targets Meals from the Settings screen.

Completed work:
- Updated `/settings` schema diagnostics to show relation target database and data-source IDs for relation properties.
- No Notion schema creation/mutation, structured ingredient persistence, USDA automation, auth, or broad UI redesign was added.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local `POST /api/notion/save-ingredients` checks passed:
  - empty ingredient list returned success with all counts at zero
  - legacy request without `mealPageId` returned success with `createdCount: 1` and `relatedCount: 0`
  - new synthetic Ingredient with a Meal page ID returned `createdCount: 1` and `relatedCount: 1`
  - duplicate synthetic Ingredient with the same Meal page ID returned `duplicateCount: 1` and `relatedCount: 0`
  - duplicate synthetic Ingredient with a different Meal page ID returned `duplicateCount: 1` and `relatedCount: 1`
- Local schema diagnostics confirmed Ingredients has a `Meals` relation targeting the configured Meals database/data source.
- Missing-relation warning behavior was not triggered locally because the active schema has a compatible relation; absence of `relationWarning` with the compatible schema is expected.

Known limitations:
- In-app browser visual verification was not available in this session because no callable Browser tool was exposed; API checks and `typecheck`/`lint`/`build` covered the verification path.

## 2026-05-24 Ingredient -> Meal Relations

Mandatory documentation hygiene:
- Read `docs/PM_HANDOVER.md` first.
- Then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/DECISIONS.md`, `docs/SESSION_LOG.md`, `docs/SOURCES.md`, and `docs/ARCHITECTURE.md`.
- Confirmed the previous session implemented the narrow `/analyze` household-tone and mobile hierarchy slice.

Goal:
- Add schema-aware Ingredient -> Meal relation support without creating or mutating Notion schema.
- Preserve current behavior: meal save remains primary, ingredient persistence is non-blocking, duplicate detection remains intact, and empty ingredient lists still succeed.

Files changed:
- `src/app/api/notion/save-ingredients/route.ts`
- `src/app/analyze/page.tsx`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
- `docs/SESSION_LOG.md`
- `docs/ARCHITECTURE.md`

Completed work:
- Extended `POST /api/notion/save-ingredients` to accept optional `mealPageId`.
- Added schema-aware relation detection on the active Ingredients data source.
- Relation selection prefers compatible properties named `Meal` or `Meals`, then falls back to any compatible relation targeting the configured Meals database or primary Meals data source.
- New Ingredient pages include the saved Meal relation when compatible.
- Duplicate Ingredient pages are skipped for creation but updated to include the saved Meal relation when it is compatible and not already present.
- Existing Ingredient relations are preserved when adding a new Meal relation.
- If no compatible relation exists, ingredients still save and the response returns a non-blocking `relationWarning`.
- `/analyze` now passes the saved Meal page ID from `save-meal` into `save-ingredients`.
- `/analyze` can display related-count metadata and relation warnings from ingredient persistence.
- Schema diagnostics already expose relation target database/data source IDs, so no diagnostics route change was required.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local schema diagnostics confirmed the active Ingredients data source has a `Meals` relation targeting the configured Meals database/data source.
- Local `POST /api/notion/save-ingredients` checks passed:
  - empty ingredient list returned success with zero counts
  - legacy request without `mealPageId` returned success and did not require relation metadata
  - new synthetic Ingredient with a Meal page ID returned `createdCount: 1` and `relatedCount: 1`
  - duplicate synthetic Ingredient with the same Meal page ID returned `duplicateCount: 1` and `relatedCount: 0`
  - duplicate synthetic Ingredient with a different Meal page ID returned `duplicateCount: 1` and `relatedCount: 1`
- Direct Notion readback confirmed the synthetic Ingredient had both Meal relation IDs.

Known limitations:
- Missing-relation warning path was not locally triggered because the active Ingredients schema already has a compatible `Meals` relation. The route now has the safe warning path, and production should verify it only if the deployed schema differs.
- `/analyze` browser end-to-end save was not run through the in-app browser; the save flow was validated through direct local API calls because browser form filling has a known virtual clipboard limitation.
- Relation support still does not implement structured ingredient persistence, quantities, units, USDA enrichment during analysis, or write-flow smoke automation.

Recommended next slice:
- Deploy and verify Ingredient -> Meal relation writes in production, then move to structured ingredient persistence or write-flow smoke tests.

## 2026-05-24 Analyze Tone + Mobile Flow

Mandatory documentation hygiene:
- Read `docs/PM_HANDOVER.md` first.
- Then read `docs/HANDOFF.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/DECISIONS.md`, `docs/SESSION_LOG.md`, `docs/SOURCES.md`, and `docs/ARCHITECTURE.md`.
- Confirmed the previous session was documentation/PM handover prep only and no product behavior/backend feature code had changed.

Product review completed before coding:
- Reviewed current production capabilities, blockers, technical debt, product risks, and next recommended slice.
- Ran representative `/api/analyze-meal` outputs before implementation for Indian vegetarian paneer/lentils, chana bowl, Atlantic Canadian comfort meal, mixed weeknight wraps, high-carb pasta, and a recipe URL import example.
- Findings: safety boundaries and no exact macro/calorie behavior were good, but output sometimes sounded clinical, evidence notes were a little dense, and Indian rice meals overused brown-rice/whole-grain swap suggestions.
- Confirmed with the user that the implementation priority was a narrow `/analyze` household-tone and mobile hierarchy tuning slice before data-model or persistence work.

Files changed:
- `src/app/api/analyze-meal/route.ts`
- `src/app/analyze/page.tsx`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
- `docs/SESSION_LOG.md`

Completed work:
- Tuned the analysis prompt so first-screen fields prefer plain household language and avoid clinical terms such as glycemic response, metabolic health, post-meal glucose, and reproductive health.
- Added prompt guidance to prefer same-dish, smaller-nudge suggestions before ingredient replacement.
- Added culturally realistic Indian rice/starch guidance: smaller basmati mound, more dal/chana/beans, cucumber/yogurt/kachumber first, extra sabzi or salad, half rice/half veg, and keeping basmati while adjusting portion and pairing.
- Added Atlantic Canadian comfort guidance to preserve comfort-food identity before suggesting replacements.
- Added high-refined-carb guidance to prefer tiny protein/fiber add-ons such as canned beans/lentils or frozen vegetables before changing the meal.
- Shortened and simplified evidence/confidence note instructions.
- Added post-analysis scroll/focus to the review result on `/analyze`.
- Tightened the household summary spacing, badge layout, and mobile copy density while preserving all existing editable fields.
- Preserved existing OpenAI schema, Notion payload shape, save behavior, Ingredient persistence behavior, and backend persistence routes.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Manual local API checks against the rebuilt app passed for:
  - palak paneer + masoor dal + basmati rice
  - chana bowl + rice/yogurt/pickle
  - Atlantic Canadian fish cakes with potatoes
  - mixed household weeknight wraps
  - high-carb pasta + garlic bread
- Final checks showed no exact calorie/macro claims, no flagged clinical phrases in first-screen fields, and known Ingredient context used where expected for Paneer, Basmati Rice, Chickpeas, and Chicken.
- Indian rice meals kept basmati and suggested dal/chana/yogurt/kachumber/portion nudges rather than brown-rice swaps.

Known limitations:
- In-app browser form filling failed because the virtual clipboard was unavailable, so generated-result mobile scroll/focus could not be fully browser-tested in the in-app browser.
- Output quality remains model-generated and should be periodically reviewed on real household meals.

Recommended next slice:
- Continue household UX simplification in `/meals`, `/feedback`, and `/settings`, or move to Ingredient -> Meal relations if the product priority shifts back to persistence structure.

## 2026-05-24 PM Handover Prep

Goal:
- Prepare a concise, high-signal handover package for a new PM/chat with no prior conversation context.
- Do not add product features.

Docs reviewed:
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
- `docs/SESSION_LOG.md`
- `docs/SOURCES.md`
- `docs/ARCHITECTURE.md`

Stale or contradictory docs found:
- `docs/ARCHITECTURE.md` still reflected the early two-entity MVP and omitted newer production architecture: recipe URL parsing, USDA lookup/enrichment, Ingredients APIs, schema diagnostics, known Ingredient context, Evidence-Aware Analysis v3, ingredient persistence, and the `/analyze` household hierarchy pass.
- The other current-state docs were broadly consistent; they needed only a start-here pointer to the new PM handover.

Completed work:
- Added `docs/PM_HANDOVER.md` as the recommended first read for a new PM/chat.
- Updated `HANDOFF`, `ROADMAP`, and `KNOWN_ISSUES` to point new PM/chats to `PM_HANDOVER.md`.
- Updated `ARCHITECTURE` to reflect current routes, USDA/enrichment flows, known Ingredient context, Notion database usage, schema diagnostics, ingredient persistence, and the current UX state.
- No product behavior or backend feature code was changed.

Recommended next slice:
- Use the PM handover to start a fresh product-priority conversation, then choose between real-meal tone review and remaining household UX simplification.

## 2026-05-24 UX Simplification & Household Experience Audit

Mandatory documentation hygiene:
- Read `HANDOFF`, `ROADMAP`, `KNOWN_ISSUES`, `DECISIONS`, and `SESSION_LOG` before coding.
- Current docs were already aligned with verified production state, key rotation, production smoke automation, Ingredient picker/enrichment UX, and FoodData Central matching quality.
- No stale blocker needed removal before this slice.

Audit findings:
- The previous `/analyze` review UI was functionally complete but gave almost every field equal visual weight.
- The practical household answer was split across quick verdict, minimal-change version, why-this-helps, and cultural notes.
- Numeric scores, evidence metadata, source details, and long editable textareas appeared too early for a non-technical household review flow.
- Mobile scrolling was long and form-heavy even when the user only needed the decision-level guidance.

Proposed hierarchy:
- Primary: household verdict, smallest helpful change, why it helps, and culturally preserving guidance.
- Secondary: quick edits, main concerns, supportive version, plate strategy, shopping additions, prep notes, and meal pairings.
- Collapsed: score editing, evidence notes, confidence notes, safety disclaimer, guidance basis, source metadata, cautions, optimized version, notes, ingredient suggestions, and feedback prompt.
- Optional/admin: source/parser context, known Ingredient context names, raw guidance basis, and advanced saved fields.

Completed work:
- Updated `/analyze` copy so the page frames the result as a practical household review.
- Added a `Household answer` summary panel at the top of the review result.
- The summary answers whether the meal looks workable, shows the quick verdict, highlights protein/satiety/blood-sugar impact as compact badges, and surfaces the smallest helpful change, why it helps, and cultural-preservation note.
- Grouped the existing editable fields into progressive sections:
  - Practical guidance
  - Quick edits
  - More ways to make it work
  - Shopping, prep, and pairings
  - Scores
  - Evidence and safety
  - Advanced saved fields
- Preserved all existing functionality, editability, save behavior, Evidence-Aware Analysis v3 fields, ingredient persistence, and Notion payload shape.
- No backend features, calorie tracking, macro tracking, dashboards, or medical-language changes were added.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local production server started on `http://localhost:3022`.
- Browser sanity check confirmed `/analyze` renders, including the updated title, `Meal or recipe` input card, and no-analysis state.

Known limitations:
- Browser automation could not populate the textarea because the in-app browser virtual clipboard was unavailable, so generated-result UI was verified by build/type safety and source review rather than a completed browser analysis run.
- The rest of the app still needs the same household UX pass.

Recommended next slice:
- Review evidence-aware guidance plus known Ingredient context on real household meals using the simplified `/analyze` review flow, then tune tone and hierarchy where real outputs feel too numeric, medicalized, or dense.

## 2026-05-24 Session Closeout — FDC Matching Quality

Closeout scope:
- No new product features added.
- Rechecked documentation for FoodData Central matching quality, branded fallback behavior, explicit/manual enrichment, no runtime USDA enrichment during meal analysis, no exact calorie/macro tracking, and no medical-claim expansion.
- Current docs already reflected the completed matching work and known basmati rice branded fallback.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- `SMOKE_BASE_URL=https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app npm run smoke:prod` passed 9/9.

Recommended next slice:
- Review evidence-aware guidance plus known Ingredient context on real household meals. Confirm improved ingredient data makes analysis more useful without becoming over-precise, medicalized, or too numeric.

## 2026-05-24 FoodData Central Matching Quality

Mandatory documentation hygiene:
- Read `HANDOFF`, `ROADMAP`, `KNOWN_ISSUES`, `DECISIONS`, and `SESSION_LOG` before coding.
- Current docs correctly identified FoodData Central matching quality as the next trust issue.
- No stale deployment/key-rotation blockers were found in current-state docs.

Goal:
- Improve USDA FoodData Central match selection so common household ingredients prefer suitable generic records over branded records when possible.
- Keep API compatibility by adding only optional response fields.
- Do not change Notion schema, meal analysis integration, auth, or automatic enrichment behavior.

Files changed:
- `src/lib/integrations/food-data-central/client.ts`
- `src/lib/integrations/food-data-central/mappers.ts`
- `src/lib/integrations/food-data-central/types.ts`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
- `docs/SESSION_LOG.md`
- `docs/SOURCES.md`

Completed work:
- Preferred USDA data types are now fetched more robustly by querying Foundation, SR Legacy, and Survey (FNDDS) independently and merging the results.
- Experimental data is fetched separately and penalized unless it is a useful textual match.
- Ranking now strongly prefers suitable generic/common records over branded records.
- Branded records are kept as safe fallback when no suitable generic/common result is returned.
- Text matching now:
  - normalizes query and descriptions
  - prefers exact/near-exact token matches
  - penalizes missing query tokens
  - penalizes prepared/flavored products for plain staple queries
  - uses limited household-specific query expansion for `paneer` and `atta`
- `IngredientNutrientSnapshot` now includes optional `matching` metadata:
  - selected data type
  - whether generic match was preferred
  - whether branded fallback was used
  - confidence reason
- Existing lookup/enrichment response shape remains backward compatible.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- `SMOKE_BASE_URL=https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app npm run smoke:prod` passed 9/9.
- Local lookup tests:
  - `paneer` -> `Cheese, paneer`, Survey (FNDDS), high confidence
  - `chickpeas` -> `Chickpeas, (garbanzo beans, bengal gram), dry`, Foundation, medium confidence
  - `basmati rice` -> `BASMATI RICE`, Branded, low confidence, branded fallback noted
  - `lentils` -> `Lentils, dry`, Foundation, high confidence
  - `yogurt` -> `Yogurt, plain, nonfat`, Foundation, high confidence
  - `atta flour` -> `Flour, whole wheat, unenriched`, Foundation, high confidence
  - `whole wheat flour` -> `Flour, whole wheat, unenriched`, Foundation, high confidence
- Local enrichment through `/api/ingredients/enrich` for Paneer returned `200 OK`, used the generic Survey match, and updated compatible Notion nutrient fields.

Known limitations:
- FoodData Central matching remains heuristic.
- `basmati rice` still falls back to a branded record because no suitable generic basmati match was returned by USDA search.
- Future quality work should test more household staples and add targeted query expansions only when they improve trust.

Recommended next slice:
- Review evidence-aware guidance plus known Ingredient context on real household meals, or add Ingredient -> Meal relation work if persistence structure is the priority.

## 2026-05-24 Ingredient Picker Enrichment UX

Mandatory documentation hygiene:
- Read `HANDOFF`, `ROADMAP`, `KNOWN_ISSUES`, `DECISIONS`, and `SESSION_LOG` before coding.
- Found stale key-rotation items still listed as open.
- Updated docs first to mark key rotation complete and remove it from blockers/current sprint/technical debt.

Goal:
- Allow enrichment of an existing Notion Ingredient from Settings without manually copying or pasting a Notion page ID.
- Preserve lookup-only mode when no Ingredient is selected.
- Do not change Notion schema, add automatic enrichment, add Ingredient -> Meal relations, or add auth.

Files changed:
- `src/app/api/notion/ingredients/route.ts`
- `src/lib/notion/ingredient-summary.ts`
- `src/app/settings/page.tsx`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
- `docs/SESSION_LOG.md`
- `docs/SOURCES.md`

Completed work:
- Added `GET /api/notion/ingredients`.
- The route uses `NOTION_API_KEY` and `NOTION_INGREDIENTS_DATABASE_ID` through `getNotionIngredientsEnv()`.
- It queries the active Ingredients data source and returns simplified Ingredient summaries: ID, name, URL, category, protein/fiber/staple/household favorite flags, nutrient confidence, and FDC description.
- Added `src/lib/notion/ingredient-summary.ts` to map Notion Ingredient pages into the simplified response shape.
- Updated Settings `Enrich Ingredient Test`:
  - loads existing Ingredients from `/api/notion/ingredients`
  - adds a search input and select dropdown
  - selecting an Ingredient fills the ingredient name and stores the page ID internally
  - no page ID input is shown
  - manual ingredient name still works for lookup-only mode when no Ingredient is selected
  - enrichment still uses existing `/api/ingredients/enrich`

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- `SMOKE_BASE_URL=https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app npm run smoke:prod` passed 9/9.
- Local `GET /api/notion/ingredients` returned existing Ingredients including Paneer.
- Local direct enrichment of Paneer using its selected Ingredient ID returned `200 OK` and updated compatible nutrient fields.
- Browser-tested Settings picker:
  - selected Paneer from the dropdown
  - enriched Paneer without manual page ID entry
  - confirmed lookup-and-update result appears
  - cleared selection and confirmed lookup-only mode still works

Known limitations:
- Ingredient picker does not create new Ingredients.
- FoodData Central matching is still heuristic and may choose branded matches.
- Enrichment remains explicit/manual and does not run during meal analysis or ingredient persistence.

Recommended next slice:
- Improve FoodData Central matching quality for common household ingredients and reduce branded-match surprises.

## 2026-05-24 Production Smoke-Test Automation

Mandatory documentation hygiene:
- Read `HANDOFF`, `ROADMAP`, `KNOWN_ISSUES`, `DECISIONS`, and `SESSION_LOG` before coding.
- Found stale items that still listed verified production work as pending or needing deployment/retest.
- Updated current-state docs first so v3, recipe URL analysis, ingredient persistence, USDA lookup/enrichment, duplicate prevention, Notion Notes summaries, Meals loading, Feedback save, PWA shell, Canada defaults, and known Ingredient context are treated as verified production capabilities.

Goal:
- Add safe production smoke-test automation before more product work.
- Verify production availability without OpenAI calls, Notion writes, or excessive API calls.

Files changed:
- `scripts/smoke-test.ts`
- `package.json`
- `package-lock.json`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added `tsx` as a dev dependency.
- Added `npm run smoke:prod`.
- Added `scripts/smoke-test.ts`.
- Script requires `SMOKE_BASE_URL`.
- Script checks:
  - `GET /`
  - `GET /settings`
  - `GET /analyze`
  - `GET /meals`
  - `GET /feedback`
  - `GET /manifest.webmanifest`
  - `GET /api/diagnostics/notion`
  - `GET /api/diagnostics/notion-schemas`
  - `POST /api/ingredients/lookup` with `paneer`
- Script prints clear pass/fail results and exits non-zero on failure.
- Script validates core JSON response shape for manifest, Notion diagnostics, schema diagnostics, and USDA lookup.
- Script remains read-only: no OpenAI calls and no Notion record creation.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Initial production smoke run returned 8/9 because manifest parsing only accepted `application/json`.
- Updated parser to also accept `+json` and JSON-looking bodies.
- `SMOKE_BASE_URL=https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app npm run smoke:prod` passed 9/9:
  - Home page
  - Settings page
  - Analyze page
  - Meals page
  - Feedback page
  - PWA manifest
  - Notion diagnostics
  - Notion schema diagnostics
  - USDA paneer lookup

Known limitations:
- Smoke automation does not cover OpenAI analysis or Notion write flows yet.
- Future write-flow smoke tests need disposable records and cleanup policy.

Recommended next slice:
- Ingredient picker/enrichment UX so users can enrich existing Ingredient pages without manually copying page IDs.

## 2026-05-24 Ingredient-Aware Analysis Context

Goal:
- Add lightweight known Ingredient context from Notion into meal analysis.
- Improve protein/fiber guidance, blood-sugar impact reasoning, cultural preservation, and minimal-change suggestions.
- Do not add calorie tracking, macro tracking, runtime USDA enrichment, or new medical claims.

Files changed:
- `src/lib/notion/ingredient-context.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/lib/types/meal.ts`
- `src/app/analyze/page.tsx`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added `getKnownIngredientContext()` helper for read-only Notion Ingredients lookup.
- The helper retrieves the active Ingredients data source, detects the title property, scans existing Ingredient pages, and matches known ingredient names against prepared recipe text.
- Matching context can include Ingredient name, `Protein Source`, `Fiber Source`, `Staple`, `Household Favorite`, `Nutrient Confidence`, `FDC Description`, and existing ingredient-level protein/fiber/carbohydrates/energy fields.
- Updated `/api/analyze-meal` to retrieve context before the OpenAI call and append it as `Known household ingredient context`.
- Ingredient context failures are non-blocking; analysis continues without context if Notion lookup fails.
- Added response metadata: `knownIngredientContextUsed` and `knownIngredientContextNames`.
- Added a small `/analyze` source summary indicator when known Ingredient context was used.

Safety boundaries:
- Context is approximate ingredient-level background only.
- The model is instructed not to calculate meal calories or exact meal macros.
- No diagnosis, treatment/cure/prevention claims, medication/supplement/fertility advice, or individualized medical guidance was added.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local `POST /api/analyze-meal` with paneer bhurji returned `200 OK`, `knownIngredientContextUsed: true`, and `knownIngredientContextNames: ["Paneer"]`.
- The paneer analysis referenced the known paneer context in confidence notes without calculating meal calories or exact macros.
- Local `POST /api/notion/save-meal` with the ingredient-aware response shape returned `200 OK` and created a Notion Meal page.

Next validation:
- Deploy and repeat the paneer smoke test in production.

## 2026-05-24 Analyze Ingredient Persistence Payload Fix

Goal:
- Fix the warning shown after saving from `/analyze` when direct production calls to `/api/notion/save-ingredients` succeed.
- Do not change Notion schema, Evidence-Aware Analysis v3 output, or the save-ingredients API behavior unless necessary.

Finding:
- Direct production payload `{ mealName: string, ingredients: string[] }` succeeds.
- The `/analyze` client was passing `meal.ingredientSuggestions` directly after meal save.
- The editable UI stores ingredient suggestions as newline text, so the safest client payload source is the current textarea value normalized to a string array at save time, with the analysis array as fallback.

Completed work:
- Added `normalizeIngredientSuggestionText()` in `/analyze`.
- Ingredient persistence now sends exactly `{ mealName, ingredients }`, where `ingredients` is a trimmed, blank-filtered `string[]` derived from the editable ingredient textarea.
- If the textarea is empty, it falls back to a defensive string-only normalization of `meal.ingredientSuggestions`.
- Added a distinct `empty` client state so the UI can say no ingredient suggestions were available instead of showing an API failure.
- Kept meal save non-blocking if ingredient persistence fails.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.

Next recommended action:
- Deploy and test `/analyze` end to end in production with ingredient suggestions populated. Confirm ingredient persistence reports success or duplicate skips, and confirm no warning appears when the API succeeds.

## 2026-05-24 Evidence-Aware Analysis v3

Goals:
- Wire the existing evidence-aware foundation into runtime meal analysis safely and incrementally.
- Support family diabetes risk awareness, insulin-sensitivity-friendly eating, possible PCOS-supportive food patterns, sustainable household nutrition, Canadian context, Indian and Atlantic Canadian food patterns, and culturally preserving guidance.
- Do not implement calorie counting, macro tracking, medical scoring, or automated USDA runtime enrichment.

Files changed:
- `src/lib/types/meal.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/api/notion/save-meal/route.ts`
- `src/app/analyze/page.tsx`
- `src/lib/notion/meal-notes.ts`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`
- `docs/SOURCES.md`

Completed work:
- Added Evidence-Aware Analysis v3 fields to `MealAnalysisResult`:
  - `evidenceNotes: string[]`
  - `confidenceNotes: string[]`
  - `safetyDisclaimer: string`
  - `guidanceBasis: { sourceId: string; principleId: string; relevance: string }[]`
- Updated `/api/analyze-meal` to build prompt context from `globalHealthSafetyRules`, `healthGuidancePrinciples`, and approved source records.
- Updated the OpenAI structured output schema to require the four v3 fields.
- Restricted `guidanceBasis.sourceId` and `guidanceBasis.principleId` to known source/principle IDs.
- Kept v3 focused on general food-pattern guidance; no medical claims, no diagnosis, no treatment/cure/prevention language, no supplement/medication/fertility/dosing advice, and no runtime USDA enrichment.
- Updated `/analyze` to display and edit a compact Evidence & Safety section with evidence notes, confidence notes, safety disclaimer, and guidance basis.
- Updated save-meal validation to accept v3 fields leniently for backward compatibility.
- Updated Notion Notes summary to include a concise Evidence-Aware v3 Summary without adding Notion schema properties.

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.
- Local `POST /api/analyze-meal` smoke test returned `200 OK` with all v3 fields present.
- Local `POST /api/notion/save-meal` smoke test with v3 fields returned `200 OK`.
- Notion fetch verified the saved smoke-test Meal Notes include the Evidence-Aware v3 Summary.

Known limitations:
- V3 output is model-generated and needs production smoke testing and real-meal review for language drift.
- `guidanceBasis` is source/principle-ID linked, not a full citation layer.
- Notion persistence remains constrained by the existing 2000-character Notes rich_text limit.
- USDA FoodData Central remains diagnostic/manual and is not used during runtime meal analysis.

Next recommended actions:
- Deploy v3 to Vercel.
- Production smoke-test plain text analysis, recipe URL analysis, v3 UI display/editing, save to Notion, and Notion Notes summary.
- Review output on representative Indian, Atlantic Canadian, and mixed household meals before broad use.

## 2026-05-24 Production Blocker Fix Slice Before Evidence-Aware Analysis v3

Goals:
- Fix the two production blockers found during smoke testing before starting Evidence-Aware Analysis v3.
- Do not implement Evidence-Aware Analysis v3.

Blocker 1 — Ingredient persistence 500:
- Root cause: `src/app/api/notion/save-ingredients/route.ts` retrieved the Ingredients database with `notion.databases.retrieve()` and then tried to read `database.properties`.
- With the current Notion SDK/API shape, database objects contain `data_sources` but do not contain the active property map. Properties live on the retrieved data source.
- Empty ingredient lists returned `200` because that path exits before schema inspection.
- Real ingredient creation returned `500` because schema detection was using the wrong object.

Ingredient fix:
- Updated `save-ingredients` to retrieve the primary Ingredients data source and derive the title/source/created schema from that data source.
- Added safe server logging for the detected ingredient schema: title property, optional source meal property/type, and optional created date property.
- Preserved existing behavior:
  - Empty list returns `200`.
  - Duplicate prevention still queries the active data source.
  - App code still does not create Notion schema.
  - Optional source/created properties are only written when compatible.

Ingredient verification:
- Local `POST /api/notion/save-ingredients` with `["smoke-test-ingredient-fix-2026-05-24"]` returned `200` with `createdCount: 1`.
- Repeating the same request returned `200` with `createdCount: 0`, `skippedCount: 1`.
- Notion search verified the new Ingredient page exists.
- Production deploy/retest is still needed for this fix to affect the live Vercel URL.

Blocker 2 — Meal Feedback -> Meals relation:
- Root cause/mismatch identified: the active Meal Feedback data source configured by `NOTION_FEEDBACK_DATABASE_ID` does not expose any relation property.
- Direct schema inspection shows the Feedback data source properties are only: `Cravings Later`, `Energy After`, `Feedback Entry`, `Hunger Later`, `Notes`, and `Would Repeat`.
- The only `Meal` relation found in diagnostics is on the Meals data source itself, where it points back to the Meals database/data source. That is not usable for writing Feedback -> Meal relations.

Feedback relation code improvement:
- Updated selected-feedback relation detection to prefer a relation property named `Meal`.
- If `Meal` is absent, detection now checks for any relation property targeting the configured Meals database or Meals data source.
- Updated feedback mapping so it can write to the detected relation property name instead of hardcoding `Meal`.
- If no relation exists, feedback still saves and returns the existing safe warning.
- Added safe server logging with Feedback database ID, Meals database/data source ID, and Feedback property summaries when no relation is found.
- Enhanced schema diagnostics to include relation target database/data source IDs for relation properties.

Feedback verification:
- Local selected-meal feedback still saves successfully but returns the expected missing-relation warning because the active Feedback data source lacks a relation property.
- Exact manual fix: add a relation property on the active `Meal Feedback` data source/database configured by `NOTION_FEEDBACK_DATABASE_ID`, pointing to the `Meals` database configured by `NOTION_MEALS_DATABASE_ID`. The property may be named `Meal`, or any relation name targeting Meals after this code change.
- Production deploy/retest is needed after the Notion relation is corrected.

Files changed:
- `src/app/api/notion/save-ingredients/route.ts`
- `src/app/api/notion/log-feedback/route.ts`
- `src/app/api/diagnostics/notion-schemas/route.ts`
- `src/lib/notion/mappers.ts`
- `docs/SESSION_LOG.md`
- `docs/KNOWN_ISSUES.md`
- `docs/HANDOFF.md`

Validation:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed, with the known Node experimental Type Stripping warning.

Next required actions:
- Deploy the code fix to Vercel.
- Re-run production ingredient persistence with a new ingredient and duplicate check.
- Add/fix the Meal Feedback relation on the active production Feedback data source, then rerun selected-meal feedback.

## 2026-05-24 Production Smoke Test Retry After Vercel Protection Disabled

Goal:
- Retry the production smoke checklist against `https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app` after Vercel deployment protection was temporarily disabled.
- Do not implement Evidence-Aware Analysis v3.

Production route/page checks:
- `HEAD /settings`: `200 OK`.
- `HEAD /analyze`: `200 OK`.
- `HEAD /meals`: `200 OK`.
- `HEAD /feedback`: `200 OK`.
- `GET /manifest.webmanifest`: `200 OK`; manifest returned expected `Metabolic Meal OS` app metadata and icons.

Settings/API diagnostics:
- `GET /api/diagnostics/notion`: `200 OK`, returned Meals database title/id.
- `GET /api/diagnostics/notion-schemas`: `200 OK`, returned Meals, Ingredients, and Meal Feedback schema summaries.
- Ingredients schema includes nutrient fields: `FDC ID`, `FDC Description`, `Nutrient Source`, `Nutrient Confidence`, `Protein (g)`, `Fiber (g)`, `Carbohydrates (g)`, `Sugars (g)`, `Sodium (mg)`, `Energy (kcal)`, and `Last Nutrient Lookup`.
- Meal Feedback schema returned by production diagnostics does **not** include a `Meal` relation property.
- `POST /api/ingredients/lookup` with `paneer`: `200 OK`, returned USDA FoodData Central match with nutrient snapshot.
- `POST /api/ingredients/enrich` lookup-only with `paneer`: `200 OK`, returned lookup mode, no updated fields, and expected skipped fields because no `ingredientPageId` was provided.

Analyze smoke tests:
- Plain-text meal analysis: `200 OK`.
- Plain-text test meal: chana masala bowl with chickpeas, basmati rice, cucumber kachumber, plain yogurt, lemon, and mango pickle.
- Result meal name: `Chana Masala Bowl`.
- Analysis Framework v2 fields were present in the API response.
- Recipe URL analysis with `https://www.hungrypaprikas.com/kofta-smash-tacos/`: `200 OK`.
- URL result meal name: `Kofta Smash Tacos`.
- URL result source metadata: `sourceType: url`, `sourceName: Kofta Smash Tacos`, `parserVersion: recipe-parser-basic-v1`, and the original source URL.

Notion meal persistence:
- `POST /api/notion/save-meal`: `200 OK`.
- Created Notion Meal page: `36a682da-780a-8188-9fda-c49a767ade2f`.
- `GET /api/notion/meals`: `200 OK`; saved meal was present in returned list.
- Notion fetch verified the saved Meal page exists.
- Notion `Notes` contains the Analysis Framework v2 summary, including Quick Verdict, Scorecard, Main Concerns, Plate Strategy, and Cautions.

Ingredient persistence:
- Ingredient persistence after save failed in production.
- `POST /api/notion/save-ingredients` with the analyzed meal's ingredient suggestions returned `500`.
- A follow-up empty-list request returned `200`, but a single real ingredient creation request also returned `500`.
- Duplicate-avoidance behavior could not be verified because ingredient creation is failing in production.

Feedback:
- Manual feedback save: `200 OK`; Notion Feedback page created and verified.
- Selected-meal feedback save: `200 OK`; Notion Feedback page created and verified.
- Selected-meal feedback returned warning: `Meal Feedback -> Meals relation property is missing. Feedback was saved without a Meal relation.`
- Because production schema diagnostics do not show the `Meal` relation property on Meal Feedback, relation behavior is not working in production.

Production blockers found:
- Ingredient creation/persistence to Notion Ingredients fails with `500` in production when at least one ingredient needs to be created.
- Meal Feedback -> Meals relation is not detected in production; selected-meal feedback saves without relation and returns the missing-relation warning.

Commands/checks run:
- `curl -I` for `/settings`, `/analyze`, `/meals`, and `/feedback`.
- `curl -i` for Notion diagnostics, schema diagnostics, USDA lookup, USDA enrichment lookup-only, manifest, and focused ingredient persistence tests.
- Node-based production workflow for Analyze -> Save -> Ingredients -> Meals -> Feedback after elevated network access was approved.
- Notion connector fetches for the saved Meal page and both Feedback pages.

Recommended next actions:
- Fix production ingredient persistence before adding Evidence-Aware Analysis v3.
- Recheck Notion Meal Feedback data source/schema; ensure the `Meal` relation is on the active data source queried by production, not only visible somewhere else in the Notion UI.
- After those two blockers are fixed, rerun the production smoke checklist once more, then proceed to Evidence-Aware Analysis v3 implementation.

## 2026-05-24 Production Smoke Test Attempt + Evidence-Aware Analysis v3 Prep

Goals:
- Run the production smoke checklist against the deployed Vercel URL before layering Evidence-Aware Analysis v3 on top.
- Use `https://metabolic-meal-lf3ys2msu-suvir-singh-s-projects.vercel.app`.
- Use recipe URL `https://www.hungrypaprikas.com/kofta-smash-tacos/` for recipe URL analysis testing.
- Do not implement Evidence-Aware Analysis v3 yet.

User-confirmed setup before testing:
- Local `.env.local` has required keys including `FDC_API_KEY`.
- Meal Feedback has a `Meal` relation to Meals.
- Ingredients database nutrient fields have been added.
- Paneer enrichment successfully updated Notion locally.

Production smoke-test result:
- Blocked by Vercel deployment protection/authentication before any product behavior could be verified.
- `HEAD /settings`, `/analyze`, `/meals`, and `/feedback` all returned `401` from Vercel with `Authentication Required`, `_vercel_sso_nonce`, and `x-robots-tag: noindex`.
- `GET /api/diagnostics/notion`, `GET /api/diagnostics/notion-schemas`, `POST /api/ingredients/lookup`, and `POST /api/ingredients/enrich` also returned the Vercel authentication page with `401`.
- Vercel CLI is not installed in this workspace, and no Vercel MCP tool was available in this session.
- No production Analyze, Save, Meals, Feedback, USDA, or Notion behavior was verified.

Files inspected for Evidence-Aware Analysis v3 prep:
- `src/lib/sources/source-registry.ts`
- `src/lib/health-guidance/index.ts`
- `src/lib/health-guidance/types.ts`
- `src/lib/health-guidance/diabetes.ts`
- `src/lib/health-guidance/pcos.ts`
- `src/lib/health-guidance/canada-food-guide.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/lib/types/meal.ts`
- `src/app/analyze/page.tsx`
- `src/lib/notion/meal-notes.ts`

V3 prep findings:
- Approved source records and health-guidance principles are well-structured and source-ID based.
- Current analysis prompt already contains general diabetes-aware and PCOS-aware safety language, but it is hand-written and not generated from the source registry or health-guidance modules.
- Current `MealAnalysisResult` has Analysis Framework v2 fields only; no `evidenceNotes`, `guidanceBasis`, `safetyDisclaimer`, or `confidenceNotes` fields exist yet.
- `/analyze` displays and edits all current v2 fields locally in the analysis state.
- Notion persistence writes a concise v2 summary into the existing `Notes` rich_text field via `buildMealNotesSummary`.
- Because Notion `Notes` has a 2000-character limit, v3 Notion persistence should stay concise or deliberately omit detailed source lists until a richer persistence model exists.

Recommended Evidence-Aware Analysis v3 implementation plan:
1. Add typed v3 fields to `MealAnalysisResult`: `evidenceNotes: string[]`, `guidanceBasis: { sourceId: ApprovedSourceId; principleId: string; relevance: string }[]`, `safetyDisclaimer: string`, and `confidenceNotes: string[]`.
2. Add a small helper that formats `globalHealthSafetyRules` and selected `healthGuidancePrinciples` into concise prompt context, rather than duplicating guidance text by hand inside `route.ts`.
3. Update the OpenAI JSON schema and system prompt to require v3 fields, with strict instructions to cite only known `sourceId` and `principleId` values.
4. Keep v3 language general: family diabetes risk support, possible PCOS-supportive patterns, protein/fibre/satiety/carbohydrate-quality nudges, Canadian household context, Indian and Atlantic Canadian food-pattern preservation.
5. Explicitly prohibit diagnosis, treatment/cure/prevention claims, fertility claims, medication/supplement advice, and individualized clinical targets in both prompt context and output descriptions.
6. Update `/analyze` to display/edit v3 fields in one compact "Evidence & safety" section after the existing v2 strategy sections.
7. Update `buildMealNotesSummary` to include only a concise v3 summary: safety disclaimer, up to 3 evidence notes, up to 3 confidence notes, and compact `sourceId/principleId` references if space allows.
8. Keep USDA nutrient lookup out of v3 runtime analysis for now; use source registry and health-guidance principles only.
9. Add focused validation once implementation starts: typecheck, lint, build, and at least one API smoke test confirming the v3 shape.

Next required action before production smoke can complete:
- Provide a Vercel protection bypass token, use an authenticated `vercel curl` setup, or temporarily disable deployment protection for the test deployment.

## 2026-05-24 Ingredient Nutrient Enrichment USDA To Notion

Goals:
- Allow explicit Ingredient records in Notion to store lightweight USDA FoodData Central nutrient metadata.
- Inspect the existing Ingredients database schema first.
- Do not auto-create Notion schema from code.
- Do not change analysis prompts, Notion schema, auth, or runtime enrichment during meal analysis.

Schema inspection:
- Used `GET /api/diagnostics/notion-schemas`.
- Current Ingredients database properties:
  - `Category` select
  - `Fiber Source` checkbox
  - `Household Favorite` checkbox
  - `Ingredient` title
  - `Notes` rich_text
  - `Protein Source` checkbox
  - `Staple` checkbox
- Missing requested nutrient properties:
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

Files changed:
- `src/app/api/ingredients/enrich/route.ts`
- `src/app/settings/page.tsx`
- `docs/SOURCES.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added `POST /api/ingredients/enrich`.
- Input: `{ ingredientName: string, ingredientPageId?: string | null }`.
- Performs USDA lookup through existing FoodData Central integration.
- If no `ingredientPageId` is provided, returns lookup-only response and reports all Notion fields skipped.
- If `ingredientPageId` is provided, retrieves Ingredients database schema and updates only compatible existing properties.
- Skips missing/incompatible fields gracefully with per-field reasons.
- Added Settings `Enrich Ingredient Test` panel with ingredient name and optional Ingredient page ID inputs.
- Enrichment is explicit only; it is not called by meal analysis or ingredient suggestion persistence.

Commands run:
- `GET /api/diagnostics/notion-schemas` via local dev server.
- `npm run typecheck`
- `FDC_API_KEY=DEMO_KEY npm run dev -- -p 3011`
- `curl -i -X POST http://localhost:3011/api/ingredients/enrich ...` for `chickpeas`, `paneer`, and `basmati rice`.
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.
- Build output includes `/api/ingredients/enrich`.
- Enrichment endpoint tests with `DEMO_KEY` returned safe `502` responses because USDA returned `429` rate limits. This is expected with repeated DEMO_KEY diagnostics; use a real `FDC_API_KEY` to verify successful lookup/update behavior.

Decisions made:
- Do not create Notion nutrient properties automatically.
- Do not persist nutrient snapshots unless a page ID is explicitly provided and compatible properties already exist.
- Keep enrichment out of meal analysis and ingredient saving for now.
- Use direct page ID in Settings as a diagnostic tool, not a family-facing workflow.

Next recommended actions:
- Add the optional nutrient properties manually to the Ingredients database if persistence is desired.
- Configure a real `FDC_API_KEY` locally and in Vercel.
- Retest `/api/ingredients/enrich` with `chickpeas`, `paneer`, and `basmati rice`.
- Consider a future Ingredients list/detail UI so page IDs do not need to be pasted manually.

## 2026-05-24 USDA FoodData Central Ingredient Lookup Foundation

Goals:
- Add a narrow server-side USDA FoodData Central ingredient lookup endpoint.
- Keep `FDC_API_KEY` route-scoped through `getFoodDataCentralEnv()`.
- Add a Settings diagnostics/testing panel.
- Do not change analysis prompts, Notion ingredients, Notion schema, or auth.

Files changed:
- `.env.example`
- `src/lib/env.ts`
- `src/lib/sources/source-registry.ts`
- `src/lib/integrations/food-data-central/types.ts`
- `src/lib/integrations/food-data-central/client.ts`
- `src/lib/integrations/food-data-central/mappers.ts`
- `src/lib/integrations/food-data-central/index.ts`
- `src/app/api/ingredients/lookup/route.ts`
- `src/app/settings/page.tsx`
- `docs/SOURCES.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added `FDC_API_KEY` to server env typing and `.env.example`.
- Added `getFoodDataCentralEnv()` so only `/api/ingredients/lookup` requires the USDA key.
- Added FoodData Central client with timeout, safe server-side fetch, common-food-first search, and broader fallback.
- Added FoodData Central mapper that returns the normalized nutrient snapshot shape requested by the task.
- Added confidence heuristic and notes for branded/uncertain matches.
- Added `POST /api/ingredients/lookup` with validation: required ingredient, min 2 chars, max 100 chars.
- Added Settings `Ingredient Lookup Test` panel that calls the server route and displays nutrient snapshot fields.
- Kept analysis prompts, Notion schemas, Notion ingredient enrichment, and auth unchanged.

Commands run:
- `sed -n ...` inspections of env/settings/API/integration files.
- `rg --files -g '.env*' -g '!node_modules'`
- `rg "getFullServerEnv|getServerEnv|serverEnv" -n`
- `node -e ...` to check whether local `FDC_API_KEY` is present without printing its value.
- `FDC_API_KEY=DEMO_KEY npm run dev -- -p 3011`
- `curl -i -X POST http://localhost:3011/api/ingredients/lookup ...` for `chickpeas`, `basmati rice`, and `paneer`.
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.
- Initial endpoint tests using USDA `DEMO_KEY` returned `200 OK` for:
  - `chickpeas`
  - `basmati rice`
  - `paneer`
- Repeated endpoint tests later hit USDA `429` rate limiting from `DEMO_KEY`, returning the app's safe `502` response. Configure a real `FDC_API_KEY` for reliable diagnostics.

Decisions made:
- Keep FoodData Central lookup diagnostic-only for now.
- Prefer common USDA datasets when they produce a reasonable match, but allow broader/branded fallback.
- Mark branded or uncertain matches with limited confidence and review notes.
- Do not persist nutrient snapshots yet.

Known limitations:
- Matching is heuristic and should be reviewed via `matchedDescription`, `fdcId`, and `confidence`.
- Nutrient values are diagnostic snapshots, usually per 100 g, not recipe-level nutrition.
- DEMO_KEY is not reliable for repeated testing.

Next recommended actions:
- Add a real `FDC_API_KEY` locally and in deployment env vars.
- Smoke-test Settings lookup with common household ingredients.
- Decide later whether/how nutrient snapshots should attach to normalized ingredients without changing Notion schema prematurely.

## 2026-05-24 Verifiable Source and Health-Guidance Foundation

Goals:
- Create a typed approved source registry.
- Create safe health-guidance principle modules for diabetes-aware, PCOS-aware, and Canada's Food Guide-aligned future analysis.
- Do not call external APIs, change Notion schema, change analysis output, or add auth.
- Document the evidence-aware architecture.

Files changed:
- `src/lib/sources/source-registry.ts`
- `src/lib/health-guidance/types.ts`
- `src/lib/health-guidance/diabetes.ts`
- `src/lib/health-guidance/pcos.ts`
- `src/lib/health-guidance/canada-food-guide.ts`
- `src/lib/health-guidance/index.ts`
- `docs/SOURCES.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added approved source records for USDA FoodData Central, Health Canada / Canadian Nutrient File, Diabetes Canada, 2023 International Evidence-Based PCOS Guideline, Canada's Food Guide, and Open Food Facts.
- Source records include ID, name, source type, jurisdiction, URL, confidence, allowed uses, prohibited uses, and last-reviewed date.
- Added global health safety rules: no diagnosis, no treatment/cure/prevention claims, no replacement of clinician/dietitian advice, and general food-pattern support only.
- Added diabetes-aware principles with safe language and prohibited claims.
- Added PCOS-aware principles with safe language, weight-stigma avoidance, and prohibited clinical/fertility claims.
- Added Canada's Food Guide principles for balanced plate guidance and neutral highly processed food language.
- Added `docs/SOURCES.md` to explain the source registry, health-guidance principles, safety rules, and future architecture.
- Updated handoff docs to clarify this is a static foundation and is not wired into runtime analysis yet.

Commands run:
- Web verification for official source URLs.
- `mkdir -p src/lib/sources src/lib/health-guidance`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.

Decisions made:
- Add evidence-aware primitives before changing prompts, output schemas, UI, or persistence.
- Treat Open Food Facts as lower-confidence crowdsourced data.
- Keep health guidance source-linked through source IDs rather than free-text source names.
- Keep medical safety constraints explicit in code, not only in prompts.

Intentionally not changed:
- No external API calls.
- No Notion schema changes.
- No analysis output changes.
- No auth changes.
- No runtime behavior changes.

Next recommended actions:
- Plan a dedicated prompt/schema slice that uses source IDs and health-guidance principles without expanding medical claims.
- Add tests around source IDs if/when this foundation is used at runtime.
- Review source dates periodically and update `lastReviewed`.

## 2026-05-24 Recipe URL Analysis Support

Goals:
- Read current handoff docs and summarize the app state before editing.
- Start Recipe URL analysis support through the existing `src/lib/integrations/recipe-parser` boundary.
- Preserve manual paste analysis, editable review, meal saving, ingredient persistence, and feedback workflows.

Current state summary:
- MVP is a Next.js App Router app with OpenAI structured meal analysis and Notion persistence.
- `/analyze` previously accepted pasted recipe text or meal ideas only.
- Canada-first defaults, source metadata, structured ingredient types, and integration adapter folders were already added.
- URL import was the documented next slice.

Files changed:
- `src/lib/types/recipe.ts`
- `src/lib/integrations/recipe-parser/index.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/analyze/page.tsx`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Activated the recipe-parser adapter with a basic server-side URL parser.
- Added URL validation for `http`/`https` only and blocked obvious local/private hostnames.
- Added guarded server-side fetch with timeout, content-type check, and page-size limits.
- Added schema.org Recipe JSON-LD extraction for recipe name, ingredients, instructions, and description.
- Added cleaned HTML text fallback when JSON-LD is unavailable.
- Updated `/api/analyze-meal` to detect URL inputs in `recipeText`, parse the URL, and pass extracted recipe text into the existing OpenAI analysis flow.
- Returned source metadata (`sourceType: url`, source URL/name, parsed timestamp, parser version) with analysis results.
- Updated `/analyze` copy to accept recipe URLs and show a Recipe Source summary after analysis.
- Removed the visible debug text panel and Force Analyze button from `/analyze`.

Commands run:
- `sed -n ...` inspections of handoff docs, roadmap, decisions, known issues, analyze page, analyze API route, recipe parser stub, and package metadata.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `lsof -ti :3011`
- `npm run dev -- -p 3011`
- `curl -I http://localhost:3011/analyze`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed again: Node experimental Type Stripping warning from Next/build environment. Build completed successfully.
- Local dev server started on `http://localhost:3011`.
- `curl -I http://localhost:3011/analyze` returned `200 OK`.

Decisions made:
- Use a dependency-free parser first instead of adding jsdom + @mozilla/readability in this slice.
- Keep `/api/analyze-meal` as the single analysis endpoint.
- Keep URL parser logic out of React components and route-local string parsing.
- Return clear 400-level parser errors that tell the user to paste recipe text when fetch/parse fails.

Known limitations:
- Cleaned HTML fallback is basic and less accurate than Readability.
- Some recipe sites may block server-side fetching or render content client-side.
- SSRF protection blocks obvious local/private hostnames but does not yet perform DNS resolution checks.
- No automated tests were added.

Next recommended actions:
- Deploy and smoke-test URL analysis with representative public recipe URLs.
- If real-site coverage is weak, add jsdom + @mozilla/readability behind the same adapter.
- Add structured ingredient persistence after URL parsing stabilizes.

## 2026-05-24 Canada-Centred Foundation

Goals:
- Review current MVP data model and codebase before editing.
- Prepare the foundation for a Canada-centred AI household meal operating system without rebuilding the app or adding live integrations.
- Preserve current recipe analysis, meal saving, ingredient persistence, meals list, and feedback workflows.
- Update the handoff package before ending the session.

Codebase assessment:
- Current app is a compact Next.js App Router MVP with OpenAI analysis and Notion persistence.
- Core data model lives in `src/lib/types`, Notion mapping lives in `src/lib/notion`, ingredient normalization lives in `src/lib/ingredients`, and persistence is handled by API routes.
- Notion schema is intentionally stable; prior sessions avoided new required properties and relation writes are schema-aware.
- Best minimal slice was a typed foundation plus backwards-compatible helper changes, not a full schema/UI migration.

Files changed:
- `src/lib/types/meal.ts`
- `src/lib/types/recipe.ts`
- `src/lib/types/localization.ts`
- `src/lib/types/pantry.ts`
- `src/lib/types/ai-analysis.ts`
- `src/lib/types/feedback.ts`
- `src/lib/ingredients/index.ts`
- `src/lib/household/preferences.ts`
- `src/lib/integrations/shared.ts`
- `src/lib/integrations/open-food-facts/index.ts`
- `src/lib/integrations/nutrition/index.ts`
- `src/lib/integrations/recipe-parser/index.ts`
- `src/lib/integrations/grocery-prices/index.ts`
- `src/lib/integrations/weather/index.ts`
- `src/app/api/analyze-meal/route.ts`
- `src/app/api/notion/save-meal/route.ts`
- `src/app/settings/page.tsx`
- `src/lib/notion/mappers.ts`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Completed work:
- Added recipe source metadata fields and defaults for current manual/paste-based analysis.
- Updated `/api/analyze-meal` to accept optional source metadata and return source defaults.
- Updated `/api/notion/save-meal` to default source metadata and write optional source fields only when compatible Notion Meals properties already exist.
- Added structured `RecipeIngredient` support and updated ingredient normalization to accept either strings or structured ingredients.
- Added Canada-first household preference defaults and displayed them read-only in Settings.
- Added integration adapter stub folders for Open Food Facts, nutrition, recipe parser, grocery prices, and weather.
- Added type foundations for separate AI analysis records, household recipe feedback, operational recipe tags, and pantry items.
- Updated handoff docs with architecture notes, decisions, roadmap, known issues, and next slice.

Commands run:
- `pwd && rg --files -g '!*node_modules*' -g '!*.png' -g '!*.jpg' -g '!*.jpeg' -g '!*.gif'`
- `git status --short`
- `ls`
- Multiple `sed -n ...` inspections of core types, routes, pages, and docs.
- `mkdir -p src/lib/integrations/open-food-facts src/lib/integrations/nutrition src/lib/integrations/recipe-parser src/lib/integrations/grocery-prices src/lib/integrations/weather src/lib/household`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation results:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Build warning observed: Node experimental Type Stripping warning from Next/build environment. Build still completed successfully.

Decisions made:
- Canada-first defaults are typed and read-only for now; no settings persistence UI yet.
- Future external APIs must go through adapter folders.
- AI enrichment remains separate from trusted canonical recipe fields.
- Structured ingredients were introduced through a compatible type/helper layer, not a destructive migration.
- Source tracking writes are optional and schema-aware so missing Notion properties do not break meal saving.
- Household recipe feedback is a future personalization layer; current feedback UI was preserved.

Intentionally not changed:
- No live Open Food Facts, nutrition, grocery pricing, flyer, weather, or parser integrations.
- No full pantry management.
- No full recipe URL import.
- No Notion schema creation from app code.
- No rewrite of current Analyze, Meals, or Feedback pages.

Open questions:
- Should optional Notion Meals properties be added manually now for source tracking, or wait until URL import is implemented?
- Which Canadian stores should seed `preferredStores` for Halifax/NS once settings persistence exists?
- Should structured ingredients be persisted in Notion first, or should recipe URL import come first and produce structured ingredient drafts?

Next recommended slice:
- Implement Recipe URL analysis through `src/lib/integrations/recipe-parser`, using server-side fetch/readability extraction, graceful fallback, and the source metadata already added here.

## 2026-05-23 Session Closeout

Goals:
- Update all persistent handoff docs to accurately reflect the completed Analysis Framework v2 state.
- Document the deferred Recipe URL analysis slice.
- No product feature changes.

Completed work:
- HANDOFF.md: updated timestamp, implemented features list, "Not implemented yet" list, "Immediate Next Tasks", "Current Blockers", Manual Testing Checklist (added v2 verification steps), feedback relation status note, Notion Notes property description for v2 summary. Removed stale deploy items that were already completed.
- ROADMAP.md: updated timestamp, replaced stale "Current Sprint" with current production verification tasks, added Recipe URL analysis to "Next Up", added validator tightening to "Next Up".
- KNOWN_ISSUES.md: updated timestamp, corrected feedback relation status wording, added v2 production smoke test needed, removed stale "Add PWA manifest" from Future Migrations (PWA is implemented).
- DECISIONS.md: updated timestamp, added decision record for deferring Recipe URL analysis with planned approach.
- SESSION_LOG.md: added this closeout entry.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Next recommended actions:
- Deploy to Vercel and smoke-test the full Analyze → Save → Meals path on the live URL.
- Confirm Notion Notes contains v2 summary on a saved meal.
- Next feature session: Recipe URL analysis support.

## 2026-05-23 Analysis Framework v2

Goals:
- Expand OpenAI structured output with v2 metabolic analysis fields.
- Display and edit all v2 fields in /analyze before save.
- Persist a concise v2 summary into the existing Notion Notes field without schema changes.

Completed work:

Slice 1 — Types and API:
- Extended `MealAnalysisResult` in `src/lib/types/meal.ts` with 16 required v2 fields: 5 numeric scores (1–10) and 11 string/array fields.
- Updated `src/app/api/analyze-meal/route.ts` JSON schema and system prompt to produce all v2 fields with minimal-change framing, cultural awareness, and insulin-resistance-supportive scoring.
- Updated `src/app/api/notion/save-meal/route.ts` validator to pass v2 fields through for TypeScript compatibility; v2 fields accepted leniently (defaults to 0/empty) for backward compatibility.

Slice 2 — UI:
- Updated `src/app/analyze/page.tsx` to initialize, display, and edit all v2 fields.
- Added `EditableScoreField` type, 5 v2 array text state vars, `updateScore` and `updateArrayField` handlers.
- Added 12 new UI sections organized into: Quick Verdict, Scorecard (5 number inputs), Concerns & Improvements, Strategy, Shopping & Prep.
- Added `SectionHeader` and `ScoreInput` components.

Slice 3 — Notion persistence:
- Created `src/lib/notion/meal-notes.ts` with `buildMealNotesSummary()`.
- Summary includes: original notes, quick verdict, scorecard, main concerns, plate strategy, cautions.
- Truncates at 1997 characters to respect the Notion 2000-character rich_text block limit.
- Updated `src/lib/notion/mappers.ts` to write `buildMealNotesSummary(meal)` to the Notion `Notes` property.
- No new Notion properties added. Existing schema unchanged.
- Updated HANDOFF, ROADMAP, DECISIONS, and KNOWN_ISSUES docs.

Verification:
- `npm run typecheck` passed (all slices).
- `npm run lint` passed (all slices).
- `npm run build` passed (all slices).
- `POST /api/analyze-meal` curl test returned full v2 shape.
- v2 field identifiers confirmed in compiled JS bundle.

Known issues introduced:
- save-meal validator leniency (documented in KNOWN_ISSUES).
- Notes field 2000-char truncation (documented in KNOWN_ISSUES).

Next recommended actions:
- Deploy to Vercel and confirm /analyze v2 fields appear after a real analysis.
- Save one analyzed meal and confirm Notion Notes contains the v2 summary.
- Confirm /meals still loads after save.

## 2026-05-23

Goals:
- Add true Notion relation support between Meal Feedback and Meals when a selected saved meal is used.
- Do not modify Notion schema from the app.
- Keep manual feedback and missing-relation fallback working.

Important schema finding:
- Current Meal Feedback schema does not include a `Meal` relation property.
- Meal Feedback -> Meals relation property must be created manually in Notion before relation writes are enabled.

Completed work:
- Updated `MealFeedbackRequest` with `selectedMealId?: string | null`.
- Updated `/feedback` to keep the selected meal page ID separately from manual entry mode.
- Selected saved meals now submit their Notion page ID to `/api/notion/log-feedback`.
- Manual feedback submits `selectedMealId: null` and continues to work as before.
- Updated `/api/notion/log-feedback` to inspect the Feedback database schema before writing a relation.
- If a compatible `Meal` relation property exists, selected-meal feedback writes a relation to the selected Meal page.
- If the relation property is missing, feedback still saves and returns a safe warning.
- Updated the save success UI to show non-blocking API warnings.
- Added manual Notion setup instructions to handoff docs and updated roadmap/known issues.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Manual feedback API smoke test saved successfully with `selectedMealId: null`.
- Selected-meal feedback API smoke test saved successfully and returned the expected missing-relation warning.

Next recommended actions:
- Manually create the Meal Feedback `Meal` relation property in Notion.
- Retest selected-meal feedback and confirm the relation writes.

## 2026-05-23 Schema Diagnostics

Goals:
- Add read-only Notion schema diagnostics for active Meals, Ingredients, and Meal Feedback databases.
- Surface exact database property names and types before adding relations.

Completed work:
- Added `GET /api/diagnostics/notion-schemas`.
- The route retrieves Meals, Ingredients, and Feedback schemas using scoped env helpers.
- The response includes safe database summaries with key, ID, title, and property name/type pairs.
- The route does not expose API keys and logs detailed failures server-side only.
- Added a `Test Notion Schemas` button to `/settings`.
- Settings now displays database names, IDs, property lists, and safe per-database errors.
- No Notion schema, relation, or save behavior changes were made.
- Updated handoff and roadmap docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local `GET /api/diagnostics/notion-schemas` returned Meals, Ingredients, and Feedback property lists.

Next recommended actions:
- Use Settings schema diagnostics to inspect relation-capable properties before implementing relations.

## 2026-05-23 Ingredient Persistence

Goals:
- Persist ingredient suggestions into Notion Ingredients when a meal is saved.
- Keep ingredient persistence non-blocking and avoid adding Notion relations.

Completed work:
- Added `src/lib/ingredients` normalization utilities for trimming, malformed filtering, deduplication, lowercase matching, and light singular/plural matching.
- Added `getNotionIngredientsEnv()` for route-scoped Ingredients configuration.
- Added `POST /api/notion/save-ingredients`.
- The new ingredients route retrieves the Ingredients database schema, uses its title property for ingredient names, and avoids duplicate creation by normalized title.
- The route writes source meal name and created date only when compatible optional properties exist.
- Updated `/analyze` save flow to trigger ingredient persistence after meal save succeeds.
- Meal save remains successful if ingredient persistence fails.
- Added helper UI that reports ingredient saving, success, skip, or failure after meal save.
- Updated handoff, roadmap, and known issues docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local empty-list `POST /api/notion/save-ingredients` returned 200 without creating records.

Next recommended actions:
- Test Analyze -> Save to Notion against the production Ingredients database.
- Confirm duplicate ingredient suggestions are skipped on repeated saves.

## 2026-05-23 PWA Foundation

Goals:
- Add mobile PWA foundation and iPhone polish without adding native mobile code.

Completed work:
- Added Next.js app metadata for `Metabolic Meal OS`.
- Added mobile viewport settings with `viewport-fit=cover` and theme color.
- Added `src/app/manifest.ts` for `/manifest.webmanifest`.
- Added original placeholder SVG icons and generated PNG icon variants in `public/icons`.
- Added iPhone safe-area padding and horizontal overflow protection.
- Increased mobile tap targets for navigation and buttons.
- Increased mobile form control font sizes and heights to reduce iPhone Safari zoom and improve comfort.
- Added README instructions for iPhone Add to Home Screen, Vercel remote testing, and LAN testing.
- Updated handoff, roadmap, and architectural decision docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local `GET /manifest.webmanifest` returned 200 with manifest JSON.
- Local `HEAD /icons/apple-touch-icon.png` returned 200.

Next recommended actions:
- Deploy the PWA foundation to Vercel.
- Test Add to Home Screen from iPhone Safari on the public HTTPS URL.

## 2026-05-23 Feedback Meal Selection

Goals:
- Add saved-meal selection to feedback logging without changing Notion schema or API behavior.

Completed work:
- Updated `/feedback` to fetch saved meals from `GET /api/notion/meals`.
- Added a Meal dropdown with saved meals and a manual entry option.
- Selecting a saved meal fills Feedback Entry with the meal name.
- Feedback Entry remains editable after selection.
- Added a loading state for saved meals.
- Added a non-blocking warning when saved meals cannot load, while preserving manual feedback logging.
- Added helper copy noting that only the meal name is saved until a future Notion relation is added.
- Updated handoff, roadmap, and known issues docs.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local `GET /feedback` returned 200.
- Local `GET /api/notion/meals` returned saved meals.

Next recommended actions:
- Deploy the feedback meal selection change to Vercel.
- Smoke test `/feedback` with both saved-meal selection and manual entry on the public HTTPS deployment.

## 2026-05-23 Route-Scoped Env Refactor

Goals:
- Refactor environment validation so API routes only require the variables they actually use.
- Update documentation to reflect that GitHub and Vercel deployment are live.

Completed work:
- Added route-scoped env helpers in `src/lib/env.ts`: `getOpenAIEnv()`, `getNotionMealsEnv()`, `getNotionFeedbackEnv()`, and `getFullNotionEnv()`.
- Added `getFullServerEnv()` and kept `getServerEnv()` as a compatibility alias.
- Updated `/api/analyze-meal` to require only `OPENAI_API_KEY`.
- Updated `/api/diagnostics/notion`, `/api/notion/meals`, and `/api/notion/save-meal` to require only `NOTION_API_KEY` and `NOTION_MEALS_DATABASE_ID`.
- Updated `/api/notion/log-feedback` to require only `NOTION_API_KEY` and `NOTION_FEEDBACK_DATABASE_ID`.
- Updated the Notion client to accept an already-validated API key while preserving the existing default behavior.
- Updated handoff, roadmap, and known issues docs for the live GitHub/Vercel state.

Important discoveries:
- GitHub repo exists and is pushed.
- Vercel deployment exists and succeeded.
- Public HTTPS deployment is live.
- Production Notion diagnostics originally failed because global env validation required `NOTION_INGREDIENTS_DATABASE_ID`; adding missing Vercel env vars fixed production, but route-scoped validation is the durable fix.

Verification:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Next recommended actions:
- Deploy the route-scoped env validation change to Vercel.
- Smoke test `/settings`, `/analyze`, `/meals`, and `/feedback` on the public HTTPS deployment.

## 2026-05-23 Earlier Documentation Session

Goals:
- Create a durable handoff system for multi-session development.
- Document current architecture, decisions, roadmap, issues, and operational procedures.

Completed work:
- Added `docs/HANDOFF.md`.
- Added `docs/ARCHITECTURE.md`.
- Added `docs/ROADMAP.md`.
- Added `docs/DECISIONS.md`.
- Added `docs/KNOWN_ISSUES.md`.
- Added `docs/SESSION_LOG.md`.
- Added mandatory start-of-session and end-of-session procedures.
- Documented local, Vercel, GitHub, env, Notion, key rotation, and recovery workflows.
- Scrubbed real-looking secrets from `.env.example`.

Important discoveries:
- `.env.example` contained real-looking OpenAI and Notion credentials. The file was scrubbed, but those keys should be considered compromised and rotated.
- Vercel deployment had not yet been verified at that time.

Blockers:
- Rotate exposed keys if not already completed.

Next recommended actions:
- Rotate OpenAI and Notion keys if not already completed.
- Test Settings diagnostics, Analyze, Save to Notion, Meals, and Feedback from the public HTTPS URL after deploying the env refactor.

## 2026-05-23 Earlier Sessions

Goals:
- Build production-quality MVP foundations for Metabolic Meal OS.
- Implement meal analysis, Notion persistence, diagnostics, saved meals, and feedback logging.

Completed work:
- Scaffolded Next.js App Router app.
- Added dashboard layout and routes.
- Added server-side env config.
- Added OpenAI meal analysis endpoint with structured outputs.
- Wired `/analyze` to API and editable review form.
- Added Save to Notion for analyzed meals.
- Added Notion diagnostics in Settings.
- Added `/meals` Notion-backed saved meal list.
- Added `/feedback` meal feedback logging to Notion.

Important discoveries:
- Notion SDK version uses `dataSources.query` rather than `databases.query`.
- Database retrieval is needed to get the primary data source ID.
- Some local browser plugin checks can block localhost; command-line and normal browser checks remain useful.

Blockers:
- No auth yet.
- No PWA support yet.
- Vercel deployment had not been verified yet in that earlier session.

Next recommended actions:
- Add PWA/iPhone home-screen support.
- Add meal-feedback relations.
# 2026-05-25 AI Boundary And Analyze Refactor

Goals:
- Close the remaining beta risks that can be safely isolated without changing product behavior: complete AI extraction, make `/analyze` maintainable, add household ownership metadata, abstract rate limiting, and document SSRF socket-pinning limits.

Completed work:
- Moved meal-analysis v1 config, prompt, JSON schema, source context, request validation, recipe preparation, response parsing, fallback behavior, and service orchestration into `src/lib/ai/meal-analysis/v1`.
- Reduced `src/app/api/analyze-meal/route.ts` to a thin guarded controller.
- Added `analysisVersion` and `analysisModel` response metadata.
- Split `/analyze` into `types.ts`, `reducer.ts`, `hooks/use-analyze-controller.ts`, and components for input, status, result panel, summary, source metadata, save section, and form fields.
- Added configured household metadata with `householdId`, `createdBy`, `visibility`, and `schemaVersion`.
- Projected household metadata to Notion when compatible fields exist and filtered meals reads by `Household ID` where supported.
- Replaced direct in-memory rate-limit logic with `src/lib/server/rate-limit` provider interface and memory implementation.
- Added tests for AI v1 parsing/fallback, analyze reducer transitions, household metadata validation/mapping, rate limiter behavior, and SSRF redirect rejection.
- Documented that the current Fetch runtime cannot guarantee socket-level IP pinning; existing mitigations remain HTTPS-only, DNS preflight, redirect revalidation, timeout, content-type checks, and size caps.

Verification:
- `npm run typecheck` passed.
- `npm test` passed: 19/19 tests.
- `npm run lint` passed.
- `npm run build` passed.

Remaining risks:
- Full household auth/RBAC is still not implemented.
- Rate limiting is still single-instance memory until a distributed provider is added.
- SSRF socket-level IP pinning is not implemented.
- Client search/pagination UI for Meals and Ingredients remains basic.

Next recommended actions:
- Add real auth and household ownership enforcement.
- Add distributed rate-limit provider.
- Add golden meal-analysis fixtures/evals that run without hitting OpenAI.
- Continue splitting the large analysis result panel if future edits grow it.

# 2026-05-25 Beta Hardening

Goals:
- Address the latest audit priorities around private deployment, validation, nutrition provenance, SSRF protection, Notion persistence, pagination, matching, AI versioning, and tests without changing product behavior unnecessarily.

Completed work:
- Added middleware and shared server request guards for private deployment mode, optional token authentication, request-size limits, and in-memory rate limiting.
- Applied guards to meal analysis, Notion meal save, ingredient save, feedback save, meals/ingredients listing, and FoodData Central enrichment.
- Hardened recipe URL fetching to require HTTPS, reject credentials, resolve DNS, block private/loopback/link-local/multicast/reserved IP ranges, and manually validate redirects.
- Added canonical nutrition snapshot/provenance types and validation under `src/lib/domain/nutrition`.
- Updated FoodData Central mapping to emit explicit per-100g basis, source ID, confidence, matched food state, raw/cooked state, nutrients, and `lastVerifiedAt`.
- Updated enrichment persistence to skip plain nutrient values unless Notion has compatible basis fields.
- Replaced lenient `save-meal` generated-field defaults with strict shared validation under `src/lib/domain/meal`.
- Added source classification/source notes mapper support and explicit Notion Notes truncation marker.
- Improved known Ingredient context matching from broad substring checks to normalized token/key matching with match confidence/reason.
- Added `pageSize`, `cursor`, and `search` support to Meals and Ingredients APIs.
- Added first versioned AI boundary under `src/lib/ai/meal-analysis/v1` for model config and response parsing.
- Added `npm test` and focused Node tests for validation, ingredient normalization/matching, FoodData Central basis mapping, nutrition snapshot validation, and recipe URL security.
- Updated architecture, decisions, handoff, known issues, roadmap, and this session log.

Verification:
- `npm run typecheck` passed.
- `npm test` passed: 9/9 tests.
- `npm run lint` passed.
- `npm run build` passed.

Remaining risks:
- Token/private mode is beta-safe but not full auth or household RBAC.
- Household ownership fields are not persisted; current deployment remains single-household/private.
- SSRF defense does DNS checks and manual redirect checks, but does not pin the actual socket IP.
- AI prompt/schema are still mostly route-local; only config and response parsing were moved in this pass.
- `/analyze` remains a large client component and still needs the reducer/component split.

Next recommended actions:
- Add real household auth and ownership fields before any public multi-user deployment.
- Move meal-analysis prompt construction and JSON schema fully into versioned AI modules.
- Extract Notion schema helpers into `src/lib/storage/notion`.
- Wire client search/pagination UI more completely for Meals and Ingredients.
- Continue splitting `/analyze` into reducer-backed review/save/edit components.

# 2026-05-25 Serving Size Controls v1

Goals:
- Reduce serving-size ambiguity in Good Enough Nutrition Estimation v1 without changing Notion schema or adding heavy nutrition modeling.

Completed work:
- Extended `src/lib/domain/nutrition/free-text-estimator.ts` to parse simple quantity and serving signals: numeric/word quantities for eggs, rotis/chapatis, parathas/paranthas, `half bowl`, `one bowl`, `large`, `small`, `extra butter`, `with butter`, and `without butter`.
- Added estimate assumption metadata to meal nutrition estimates: matched components, serving-size assumptions, quantity multipliers, base totals, current serving multiplier, butter inference, confidence, and review-before-save guidance.
- Updated provenance text for estimates so it names matched components, serving assumptions, quantity multipliers, confidence, and the fact that only calories/protein/fiber are estimated.
- Added `/analyze` estimate assumption UI for estimated/reviewed-estimate nutrition only, with matched component badges, serving multiplier controls (`0.5x`, `1x`, `1.5x`, `2x`), and add/remove butter action.
- Serving multiplier and butter review actions update calories/protein/fiber live, preserve null fields, convert source to `user-entered`, and append reviewed-estimate provenance.
- Preserved structured recipe JSON-LD precedence and unavailable/manual nutrition behavior.
- Added tests for gobi parantha with butter, 2 gobi paranthas with butter, without butter, large chicken breast with salad, half bowl dal with rice, vague input, null-preserving serving multipliers, and reviewed estimate provenance.
- Updated README, architecture, decisions, handoff, known issues, roadmap, sources, and this session log.

Verification:
- `npm test` passed: 56/56 tests.

Remaining risks:
- Serving controls are intentionally coarse and beta-grade, not clinical nutrition modeling.
- Rule coverage is still narrow and should only expand when deterministic parsing and provenance remain clear.
- Visual browser verification has not yet been run for the new controls.

Next recommended actions:
- Run `npm run lint` and `npm run build` after docs settle.
- Test the `/analyze` controls visually on desktop/mobile.
- Add more household shorthand fixtures only after seeing real inputs.
