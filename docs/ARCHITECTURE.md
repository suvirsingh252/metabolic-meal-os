# Architecture

Last updated: 2026-05-25 (Visual + Household Fixture Hardening)

For a brand-new PM/chat, start with `docs/PM_HANDOVER.md`. This file is the concise technical architecture reference.

## Frontend Architecture

Metabolic Meal OS uses Next.js App Router with TypeScript and React.

Frontend surfaces:
- Server-rendered page shell and static pages where possible.
- Client components for interactive flows:
  - `/analyze`
  - `/meals`
  - `/feedback`
  - `/settings`
- `/` and `/dashboard` share the dashboard intelligence client backed by `/api/dashboard`.
- Tailwind CSS for styling.
- Local shadcn-style primitives in `components/ui`.
- `/analyze` state is reducer-backed in `src/app/analyze/reducer.ts` with controller logic in `src/app/analyze/hooks/use-analyze-controller.ts` and UI sections under `src/app/analyze/components`.
- `lucide-react` for icons.

The UI is still intentionally MVP-simple: cards, forms, badges, alerts, buttons, and native progressive disclosure. No global state manager is used. `/analyze` has a first household-first hierarchy pass; `/meals`, `/feedback`, and `/settings` still need deeper UX simplification.

## Backend/API Architecture

Backend work is implemented through App Router API routes:
- `src/app/api/analyze-meal/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/diagnostics/notion/route.ts`
- `src/app/api/diagnostics/notion-schemas/route.ts`
- `src/app/api/ingredients/lookup/route.ts`
- `src/app/api/ingredients/enrich/route.ts`
- `src/app/api/notion/ingredients/route.ts`
- `src/app/api/notion/meals/route.ts`
- `src/app/api/notion/save-meal/route.ts`
- `src/app/api/notion/save-ingredients/route.ts`
- `src/app/api/notion/log-feedback/route.ts`

API routes:
- run server-side only.
- read secrets through `src/lib/env.ts`.
- return safe client-facing errors.
- log detailed errors server-side only.
- pass through shared private-deployment, request-size, and in-memory rate-limit guards for high-risk routes.

Shared backend guardrails live in `src/lib/server/request-guards.ts`. They cover private deployment/token checks, bounded JSON parsing/request-size limits, route-specific rate limits, and safe client-facing errors.

Rate limiting:
- API guards call `src/lib/server/rate-limit`.
- The default provider is `MemoryRateLimiter`.
- The interface is ready for Redis/Upstash later, but the current implementation is single-instance only.

## OpenAI Integration Flow

Flow:
1. User enters meal or recipe text on `/analyze`.
2. Client calls `POST /api/analyze-meal`.
3. Server validates `recipeText`.
4. If the input looks like a URL, including common shared/social hosts, the recipe-parser adapter normalizes it, strips common tracking parameters, classifies it, resolves DNS, rejects private/reserved hosts, follows redirects manually through the same checks, fetches and extracts content server-side.
5. Server reads matching known Ingredients from Notion as lightweight context when available.
6. Server builds Evidence-Aware Analysis v3 prompt context from the source registry and health-guidance modules.
7. Server reads `OPENAI_API_KEY`.
8. OpenAI Responses API returns structured JSON.
9. UI renders an editable `MealAnalysisResult`, starting with a household-first summary.

URL intake classifications:
- `manual-text`
- `recipe-page`
- `social-video`
- `video-page`
- `short-link`
- `unknown-url`

Recipe extraction:
- Recipe/blog pages prefer schema.org Recipe JSON-LD.
- Fallback extraction uses accessible title/site metadata, OpenGraph description, likely recipe snippets, and a bounded page excerpt.
- Social/video pages only use accessible HTML/OpenGraph metadata. The app does not use browser automation, video downloads, paid scraping, or platform bypasses.
- If a social/video link or blocked page does not expose enough recipe detail, `/api/analyze-meal` returns a clear fallback asking the user to paste the caption, transcript, ingredients, or spoken recipe summary instead of calling OpenAI.
- If a recipe page exposes schema.org JSON-LD nutrition facts, the parser carries meal-level totals forward with provenance. Structured recipe nutrition takes precedence over any estimate.
- For manual/free-text meals without structured nutrition, `src/lib/domain/nutrition/free-text-estimator.ts` can add conservative dashboard-critical estimates for calories, protein, and fiber only. It now parses coarse household shorthand such as `2 rotis and dal`, `paneer wrap`, `rice and chicken`, `egg bhurji and toast`, `oats with yogurt`, `leftover curry and rice`, `half bowl dal`, `small paneer bowl`, `large chicken salad`, and butter inclusion/exclusion. Sodium, sugar, fat, and carbs remain `null` unless they came from structured data or user review.
- The AI prompt still does not ask OpenAI to calculate calories or exact macros.

Structured output is used so the review screen receives predictable fields.

AI module boundary:
- Versioned config, prompt, JSON schema, source context, request validation, recipe preparation, response parsing, fallback behavior, and service orchestration live under `src/lib/ai/meal-analysis/v1`.
- `src/app/api/analyze-meal/route.ts` is now a thin controller.
- Responses include `analysisVersion` and `analysisModel` metadata.

## Notion Integration Flow

Notion client:
- `src/lib/notion/client.ts`
- uses `NOTION_API_KEY`.

Meal save:
1. User edits analysis on `/analyze`.
2. Client calls `POST /api/notion/save-meal`.
3. Server validates `MealAnalysisResult`.
4. Server maps fields to Notion properties.
5. Server writes to `NOTION_MEALS_DATABASE_ID`.

Meals list:
1. `/meals` calls `GET /api/notion/meals`.
2. Server retrieves Meals database.
3. Server queries the database primary data source.
4. Server maps Notion pages to `MealSummary`.
5. `pageSize`, `cursor`, and `search` are supported to avoid unbounded scans.

Feedback:
1. `/feedback` calls `POST /api/notion/log-feedback`.
2. Server validates `MealFeedbackRequest`.
3. Server writes to `NOTION_FEEDBACK_DATABASE_ID`.
4. If a compatible Meal relation property exists, server writes the relation to the selected Meal.

Diagnostics:
1. `/settings` calls `GET /api/diagnostics/notion`.
2. Server retrieves the Meals database.
3. UI displays safe success/failure state.
4. `/settings` can also call `GET /api/diagnostics/notion-schemas` to inspect safe schema summaries, including relation target database/data-source IDs for relation properties.

Ingredient persistence:
1. After a meal is saved, `/analyze` can call `POST /api/notion/save-ingredients`.
2. `/analyze` passes the saved Meal page ID returned by `save-meal`.
3. Server normalizes and deduplicates ingredient suggestion strings.
4. Server inspects the active Ingredients schema and the configured Meals primary data source.
5. Server creates missing Ingredient pages and writes the Meal relation when a compatible relation property exists.
6. For duplicate Ingredient pages, server preserves existing relations and adds the saved Meal relation when it is missing.
7. If no compatible relation exists, ingredient persistence still succeeds and returns a non-blocking warning.

USDA lookup/enrichment:
1. `/settings` can call `POST /api/ingredients/lookup` for lookup-only diagnostics.
2. `/settings` can load existing Ingredients via `GET /api/notion/ingredients`.
3. `/settings` can call `POST /api/ingredients/enrich` to update a selected Ingredient page.
4. Enrichment updates only compatible existing Notion properties and never creates schema.
5. Plain nutrient values are only persisted when compatible basis fields such as `Nutrient Amount Basis` and `Nutrient Basis Unit` exist.

Nutrition provenance:
- Canonical nutrition snapshot types live in `src/lib/domain/nutrition`.
- FoodData Central mappings emit explicit `amountBasis`, `basisUnit`, `per100g`, source ID, confidence, food state, nutrients, and `lastVerifiedAt`.
- Runtime validation rejects snapshots that would persist nutrients without a basis.
- Free-text meal estimates use `nutritionEstimate.source: estimated`, low/medium confidence, optional assumption metadata, and provenance that names matched components, serving-size assumptions, quantity multipliers, confidence, and review-before-save guidance.
- The `/analyze` review panel distinguishes structured recipe nutrition, estimated nutrition, reviewed estimates, user-edited estimate values, manual values, and unavailable nutrition. Estimate assumptions are shown only for estimated/reviewed-estimate nutrition, not structured recipe JSON-LD nutrition.
- Users can apply coarse serving multipliers (`0.5x`, `1x`, `1.5x`, `2x`) and add/remove inferred butter before saving. Repeated serving or butter changes replace stale review notes so provenance stays concise.
- User edits in the review panel convert the nutrition source to `user-entered` and append review-edit provenance. Blank fields remain blank/null, not zero.

## Dashboard Analytics Architecture

Dashboard intelligence is intentionally separated from React:
- `src/lib/domain/analytics/types.ts`
- `src/lib/domain/analytics/aggregate-meals.ts`
- `src/lib/domain/analytics/insights.ts`
- `src/lib/domain/analytics/quality.ts`
- `src/lib/domain/analytics/dashboard-view-model.ts`

The API route is `GET /api/dashboard`.

`/api/dashboard`:
- reads recent saved meals through `src/lib/notion/meals-query.ts`;
- maps Notion meal summaries into analytics meals;
- builds and returns a stable `DashboardViewModel`;
- accepts optional target query params: `calories`, `protein`, `fiber`, and `sodium`;
- does not call OpenAI.

`DashboardViewModel` includes:
- generated timestamp;
- today totals, targets, target progress, meal count, and average quality;
- 7-day totals, daily averages, meal count, trend labels, and average quality;
- rule-based insights;
- recent meals;
- best recent meal and highest-opportunity recent meal.

Aggregation rules:
- missing values remain `null`;
- zero is preserved as a known value;
- totals only include nutrients that are present;
- estimated or reviewed-estimate calories/protein/fiber can contribute to dashboard totals when saved, but provenance/source distinguish them from structured recipe facts and user-entered values;
- dashboard cards and chips are designed to preserve unknown nutrition states without forcing zeroes and now wrap labels more reliably on mobile;
- functions are deterministic and unit tested.

Targets are configurable in the dashboard UI for calories, protein, fiber, and sodium. Current target settings are client-side only through `localStorage` and query params to `/api/dashboard`; there is no server-side user settings persistence yet.

Meal quality v1 is a rule-based 0-100 score using protein density, fiber density, sodium load, sugar load, ingredient diversity, and minimally processed signal where available. If exact nutrition is unavailable, legacy Analysis Framework scorecards can provide read-time quality backfill. No predictive coaching, ML, or household-level analytics are implemented.

## Planned Provider Abstraction

Not yet implemented.

Potential future shape:
- `src/lib/ai/provider.ts`
- `src/lib/storage/provider.ts`
- adapters for OpenAI and Notion.

Reason to defer:
- Current MVP has one AI provider and one storage provider.
- Abstraction now would add ceremony before requirements stabilize.

## Auth And Tenancy Architecture

Current beta-safe stance:
- The app is private by default through `PRIVATE_DEPLOYMENT_MODE`.
- If `APP_AUTH_TOKEN` is set, middleware and guarded API routes require `Authorization: Bearer`, `x-app-auth-token`, or an `app_auth_token` cookie matching it.
- If `PRIVATE_DEPLOYMENT_MODE=false` and no `APP_AUTH_TOKEN` exists, routes return 503 instead of running as a public app.

Tenancy:
- Current deployment assumes one private household/workspace and one set of Notion databases.
- Records can now carry `householdId`, `createdBy`, `visibility`, and `schemaVersion` from private deployment config.
- Notion writes project this metadata when compatible properties exist.
- Meals reads filter by configured `householdId` when a compatible `Household ID` rich_text property exists.
- True multi-household auth/RBAC is not implemented yet. Do not operate this as a public multi-tenant app until login identity and authorization are enforced.

## Planned Data Model Evolution

Current source of truth:
- Notion databases.

Actively used entities:
- Meals.
- Ingredients.
- Meal Feedback.

Configured but not fully used:
- Weekly Plans.
- Meal Templates.

Expected evolution:
- Persist structured ingredient fields beyond normalized suggestion strings.
- Persist structured ingredients beyond normalized suggestion strings.
- Build weekly plan records.
- Add meal template reuse.
- Add richer constraints and household preferences.
- Consider a real database if querying, permissions, or performance outgrow Notion.

## Future PWA Strategy

Planned:
- Web app manifest. Implemented.
- App icons. Implemented.
- iPhone home-screen metadata.
- Offline-friendly shell if useful.
- Installability checks.

Not planned yet:
- Complex offline data sync.
- Push notifications.

## Future Mobile Strategy

Current path:
- Responsive web app deployed to Vercel.
- Mobile testing through public HTTPS URL.
- PWA enhancements for home-screen use.

Deferred:
- React Native.
- Expo.
- Native iOS.
- App Store deployment.

Rationale:
- One codebase.
- Faster iteration.
- Lower operational complexity.
- Validate workflows before native investment.

## Deployment Architecture

Target:
- GitHub repo connected to Vercel.
- Vercel builds Next.js app.
- API routes run as serverless functions.
- Environment variables configured in Vercel.

No `vercel.json` is currently required.

Manual Vercel deployment checklist:
1. Confirm `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass locally.
2. Commit and push from the local machine when ready.
3. Confirm required environment variables in Vercel.
4. Trigger or wait for deployment from `main`.
5. Smoke test `/`, `/analyze`, `/dashboard`, `/api/dashboard`, and `/api/analyze-meal`.
6. If token/private deployment guardrails are enabled, verify the production access header/token behavior.

## Notion Schema Policy

The app does not create or mutate Notion schema automatically.

Meal-level nutrition persistence writes only compatible existing Notion properties:
- calories;
- protein;
- carbs;
- fat;
- fiber;
- sodium;
- sugar;
- nutrition confidence/provenance/source;
- explicit analysis scores;
- meal quality score.

Nutrition source precedence for new analyses:
1. structured recipe nutrition such as recipe JSON-LD;
2. Notion backfill on saved/read records where applicable;
3. conservative free-text estimate for manual meal descriptions;
4. unavailable state;
5. user-entered review override after edits.

Legacy backfill is read-time only:
- exact nutrition totals are not invented for old meals;
- quality can be inferred from existing scorecards in Notes;
- there is no Notion write-back migration job yet.

## Security Considerations

Current rules:
- Secrets must remain server-side.
- Do not use `NEXT_PUBLIC_` for secrets.
- Do not commit `.env.local`.
- `.env.example` must use placeholders only.
- API routes return generic safe error messages.
- Detailed API failures are logged server-side only.

Known security gap:
- Token auth is available, but user accounts and household-level authorization are not implemented.
- In-memory rate limiting is beta-safe for a single runtime but not enough for distributed production abuse protection.
- Recipe URL intake uses HTTPS-only URLs, DNS preflight, redirect revalidation, timeouts, response size caps, and content-type checks. The current Fetch-based implementation cannot guarantee socket-level IP pinning in this runtime, so it should not be described as complete SSRF protection.
