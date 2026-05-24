# Architectural Decisions

Last updated: 2026-05-24 (Evidence-Aware Analysis v3)

## 2026-05-24 — Evidence-Aware Analysis v3 Uses Static Guidance At Runtime

Decision: Wire the existing source registry and health-guidance principles into `/api/analyze-meal` prompt context and structured output with four v3 fields: `evidenceNotes`, `confidenceNotes`, `safetyDisclaimer`, and `guidanceBasis`.

Reasoning:
- The app needs safer family decision support for diabetes risk awareness, insulin-sensitivity-friendly eating, possible PCOS-supportive patterns, Canadian household context, and culturally preserving food guidance.
- Source/principle IDs make generated guidance reviewable without adding long citations or medical claims.
- A small v3 schema avoids a larger rewrite and keeps current Notion schema stable.

Tradeoffs:
- V3 output is still model-generated and should be reviewed for wording drift.
- Guidance basis uses static source/principle IDs, not live source retrieval.
- Notion Notes remains the persistence surface, so v3 summaries must stay concise because of the rich_text character limit.
- USDA nutrient lookup remains diagnostic-only and is intentionally not used in runtime analysis.

## 2026-05-24 — Ingredient Nutrient Enrichment Skips Missing Schema

Decision: Add `/api/ingredients/enrich` as an explicit diagnostic/update endpoint that updates only existing compatible Ingredients properties and reports missing fields as skipped.

Reasoning:
- Notion remains manually controlled; app code should not mutate schema.
- USDA nutrient data should be reviewable before it influences analysis or saved ingredients automatically.
- The current Ingredients database lacks the proposed nutrient properties, so graceful skipping keeps the MVP working.

Tradeoffs:
- No enrichment persists until the optional Notion properties are added manually.
- The Settings tool exposes a page-ID based workflow that is diagnostic rather than family-facing.

## 2026-05-24 — FoodData Central Lookup Is Diagnostic First

Decision: Add a server-side USDA FoodData Central ingredient lookup endpoint and Settings diagnostic panel without changing analysis prompts, Notion schema, or ingredient persistence.

Reasoning:
- Verifiable nutrient data should be tested in isolation before it influences AI analysis or saved household data.
- `FDC_API_KEY` must stay route-scoped so unrelated app routes keep working without it.
- Ingredient matching is inherently uncertain, especially for branded foods and culturally specific ingredients, so the response includes confidence, matched description, FDC ID, and notes.

Tradeoffs:
- No automatic nutrition enrichment yet.
- Settings now has a diagnostic tool that depends on external USDA availability and rate limits.
- Matching uses a heuristic common-food-first strategy that needs real-world review.

## 2026-05-24 — Evidence-Aware Foundation Before Prompt Changes

Decision: Add a typed source registry and safe health-guidance principle modules before changing OpenAI prompts, output schemas, Notion schemas, or UI behavior.

Reasoning:
- Health and nutrition guidance needs verifiable source IDs and explicit allowed/prohibited uses before being used in generated analysis.
- Diabetes-aware and PCOS-aware support must stay general and non-diagnostic.
- Open Food Facts is useful for packaged-food data, but it is crowdsourced and must remain lower confidence.
- Keeping this static and unused at runtime avoids changing current MVP behavior while creating a safer next step.

Tradeoffs:
- No user-visible source citations appear yet.
- The prompt still relies on existing embedded safety language until a dedicated prompt/schema slice wires this foundation in.
- Source review dates need maintenance.

## 2026-05-24 — Basic Recipe URL Parser Before Heavier Dependencies

Decision: Implement Recipe URL analysis through the existing `recipe-parser` adapter with a dependency-free parser that prefers schema.org Recipe JSON-LD and falls back to cleaned HTML text.

Reasoning:
- Keeps the MVP lightweight and avoids adding dependency/network-install risk during this slice.
- Many recipe sites expose useful JSON-LD, which is enough for the first URL import foundation.
- The parser boundary remains stable if a future session swaps in jsdom + @mozilla/readability.
- `/api/analyze-meal` remains the single analysis endpoint, preserving the current client flow.

Tradeoffs:
- Cleaned HTML fallback is less accurate than a full Readability extraction.
- Some recipe sites block server-side fetches or render recipe content client-side.
- SSRF protection currently blocks obvious local/private hostnames but does not perform DNS resolution checks.

## 2026-05-24 — Canada-First Household Defaults

Decision: Make the initial household defaults explicitly Canada-centred: country `CA`, province `NS`, city `Halifax`, preferred units `mixed`, currency `CAD`, and temperature unit `C`.

Reasoning:
- Grocery pricing, package sizes, weather context, nutrition labels, store availability, and seasonal planning are country- and region-sensitive.
- A single typed default profile is safer than scattering Canadian assumptions throughout prompts, components, and integrations.
- No settings persistence UI is required yet; the current Settings page only surfaces read-only defaults.

Tradeoffs:
- The app is not multi-region yet.
- Future households outside Nova Scotia will need editable preferences and persistence.

## 2026-05-24 — External APIs Through Adapters Only

Decision: Create integration adapter folders for Open Food Facts, nutrition, recipe parsing, grocery prices, and weather, but keep them as stubs/interfaces for now.

Reasoning:
- Future API logic needs stable homes before integrations are added.
- Stubs prevent pages and routes from directly coupling to external providers.
- The current MVP remains functional without network dependencies beyond the existing OpenAI and Notion routes.

Tradeoffs:
- The stubs do not provide user-visible features yet.
- Adapter interfaces may evolve once real API constraints are known.

## 2026-05-24 — Keep AI Enrichment Separate From Canonical Recipe Data

Decision: Add a `RecipeAiAnalysis` type for summaries, suggested tags, nutrition estimates, substitutions, and Canadian grocery notes instead of merging AI enrichment into canonical recipe fields.

Reasoning:
- AI-generated nutrition and grocery notes are estimates and should not overwrite trusted recipe data.
- Future review/promote workflows need to distinguish original recipe content from model-generated suggestions.
- This preserves a clean path to add model versioning and generated timestamps.

Tradeoffs:
- More records/types will exist once AI analysis is persisted.
- UI work is still needed to review or promote AI suggestions.

## 2026-05-24 — Introduce Structured Ingredients Cautiously

Decision: Add a `RecipeIngredient` shape and update normalization to accept either legacy strings or structured ingredients.

Reasoning:
- Existing ingredient persistence depends on string suggestions and should not be broken.
- Future recipe import, grocery list, nutrition, and pantry features need quantity/unit/category/preparation fields.
- Accepting both shapes allows incremental migration.

Tradeoffs:
- Current Notion ingredient persistence still stores normalized names only.
- Parsing raw text into quantities and units remains deferred.

## 2026-05-24 — Household Feedback As Personalization Foundation

Decision: Add a `HouseholdRecipeFeedback` type for recipe-level preference signals such as rating, would-make-again, actual difficulty, cleanup level, spice/heaviness flags, notes, and modifications.

Reasoning:
- Household feedback is a future personalization moat for meal planning.
- The current feedback form remains unchanged, preserving the MVP.
- The richer shape creates a target for the next feedback UI/database slice.

Tradeoffs:
- No UI or persistence exists for the richer feedback fields yet.
- Existing Notion Meal Feedback remains the active feedback workflow.

## 2026-05-24 — Source Tracking Without Required Notion Schema Changes

Decision: Add recipe source fields to analysis/save types and write them to Notion only when compatible optional Meals properties already exist.

Reasoning:
- Recipe import and parsing need durable provenance.
- Current manual-paste saves can safely default to `sourceType: manual` and `parserVersion: manual-v1`.
- Notion schema drift should not break existing family workflows.

Tradeoffs:
- Source fields are not persisted in Notion unless matching optional properties are manually added.
- `save-meal` now reads the Meals database schema before creating a page.

## 2026-05-23 — Defer Recipe URL Analysis to Next Session

Decision: Defer Recipe URL input support to a dedicated future session.

Reasoning:
- Recipe URL analysis requires server-side HTTP fetching, HTML parsing (jsdom), and readable content extraction (@mozilla/readability) — a meaningful vertical slice with its own failure modes.
- The current analyze flow (paste text) is working and deployed. Adding URL support mid-session would risk introducing untested fetch/parse edge cases.
- Deferring keeps the current session focused on Analysis Framework v2 closeout and production verification.

Planned approach for next session:
- Detect whether the `/analyze` input looks like a URL (simple heuristic: starts with `http://` or `https://`).
- If URL: POST to a new server-side route or extend `/api/analyze-meal` to accept a `recipeUrl` field; fetch the URL server-side (no CORS exposure); parse with jsdom + @mozilla/readability to extract article text; pass extracted text through the existing analysis pipeline.
- If fetch or parse fails: return a graceful error; let the user paste the text manually instead.
- No changes to the OpenAI schema or Notion mapper are expected.

Tradeoffs:
- Deferred one session.
- Server-side fetch adds a new outbound network dependency; some recipe sites block bots or require headers.

## 2026-05-23 — Analysis Framework v2

Decision: Store the v2 analysis summary inside the existing Notion `Notes` rich_text field rather than adding new Notion properties.

Reasoning:
- Notion schema changes require manual setup and break if property names do not match exactly.
- The v2 fields (scores, verdict, concerns, plate strategy, cautions) are useful for human review in Notion but do not need to be queryable or filterable at this stage.
- Combining original notes with a structured plain-text v2 summary into one field keeps the Notion Meals schema stable.
- `buildMealNotesSummary` in `src/lib/notion/meal-notes.ts` owns this formatting, making it easy to change the layout or expand coverage later.

Tradeoffs:
- The Notes field becomes longer and contains structured text that is not individually queryable in Notion.
- If v2 fields need to be filtered or sorted in Notion later (e.g., filter by Metabolic Score), new Notion properties will need to be added manually and the mapper updated.
- The Notion 2000-character rich_text limit is managed with truncation; verbose outputs may lose trailing cautions.

## 2026-05-23

Decision: Use Next.js App Router.

Reasoning:
- Supports pages and server-side API routes in one codebase.
- Works naturally with Vercel.
- Keeps OpenAI and Notion keys server-side.
- Provides a clear path to PWA/mobile-web deployment.

Tradeoffs:
- Requires careful client/server boundaries.
- App Router conventions can shift across Next versions.

## 2026-05-23

Decision: Use Notion as the initial database.

Reasoning:
- Fastest path to structured household records.
- User can inspect and edit data directly.
- Good fit for MVP iteration before final schema is known.

Tradeoffs:
- Querying and relations are less flexible than a purpose-built database.
- Production permissions and multi-user access will become limiting.
- Notion API/schema changes can affect SDK usage.

## 2026-05-23

Decision: Start with PWA/mobile web before React Native.

Reasoning:
- Single codebase.
- Fastest path to remote phone testing through Vercel HTTPS.
- Lower operational complexity.
- Workflows should be validated before native investment.

Tradeoffs:
- Less native feel.
- No App Store distribution yet.
- Offline/push/native integrations need extra PWA work or future native work.

## 2026-05-23

Decision: Defer authentication.

Reasoning:
- MVP is still validating core meal analysis and Notion persistence workflows.
- Auth would add product and infrastructure complexity before the data model stabilizes.

Tradeoffs:
- Public deployment is not suitable for broad sharing.
- Anyone with the URL can access available workflows until auth is added.

## 2026-05-23

Decision: Use OpenAI structured outputs for meal analysis.

Reasoning:
- The review UI needs predictable fields.
- Structured JSON reduces parsing fragility.
- TypeScript interfaces can mirror API response shape.

Tradeoffs:
- Schema changes require prompt/API updates.
- Strict structured outputs may need iteration if the model cannot fit edge cases into the schema.

## 2026-05-23

Decision: Add PWA foundation without native mobile or offline service worker.

Reasoning:
- Makes the Vercel-hosted web app easier to test and launch from iPhone.
- Keeps the MVP on one Next.js codebase.
- Adds manifest, app metadata, safe-area handling, and mobile control sizing before deeper mobile investment.

Tradeoffs:
- Home-screen launch is app-like, but still a web app.
- Offline support, push notifications, and native integrations remain deferred.
- Placeholder icons should be replaced with polished production assets later.

## 2026-05-23

Decision: Add route-scoped server-side environment validation.

Reasoning:
- Fails loudly when required server config is missing.
- Keeps secrets out of client components.
- Gives API routes a typed configuration surface.
- Lets each route require only the provider keys and database IDs it actually uses.

Tradeoffs:
- More helper functions exist in `src/lib/env.ts`.
- Broad workflows can still use `getFullServerEnv()` or `getFullNotionEnv()` when they truly need complete configuration.

## 2026-05-23

Decision: Keep MVP UI state local.

Reasoning:
- Current flows are simple forms and lists.
- Avoids global state management before cross-page state requirements exist.

Tradeoffs:
- Some duplicated form helpers exist.
- Shared state may be needed later for richer workflows.

## 2026-05-23

Decision: Create persistent handoff documentation.

Reasoning:
- Project will continue across sessions, devices, and context windows.
- Durable docs reduce context loss.
- Mandatory start/end procedures make future work safer.

Tradeoffs:
- Docs must be maintained.
- Stale docs can mislead future sessions if not updated.
