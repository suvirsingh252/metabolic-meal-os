# Architecture

Last updated: 2026-05-24 (Shared URL Intake)

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
- Tailwind CSS for styling.
- Local shadcn-style primitives in `components/ui`.
- `lucide-react` for icons.

The UI is still intentionally MVP-simple: cards, forms, badges, alerts, buttons, and native progressive disclosure. No global state manager is used. `/analyze` has a first household-first hierarchy pass; `/meals`, `/feedback`, and `/settings` still need deeper UX simplification.

## Backend/API Architecture

Backend work is implemented through App Router API routes:
- `src/app/api/analyze-meal/route.ts`
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

## OpenAI Integration Flow

Flow:
1. User enters meal or recipe text on `/analyze`.
2. Client calls `POST /api/analyze-meal`.
3. Server validates `recipeText`.
4. If the input looks like a URL, including common shared/social hosts, the recipe-parser adapter normalizes it, strips common tracking parameters, classifies it, fetches and extracts content server-side, and refuses obvious local/private hosts before and after redirects.
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

Structured output is used so the review screen receives predictable fields.

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

## Planned Provider Abstraction

Not yet implemented.

Potential future shape:
- `src/lib/ai/provider.ts`
- `src/lib/storage/provider.ts`
- adapters for OpenAI and Notion.

Reason to defer:
- Current MVP has one AI provider and one storage provider.
- Abstraction now would add ceremony before requirements stabilize.

## Planned Auth Architecture

Auth is deferred.

Likely future options:
- Clerk or Auth.js for household login.
- Server-side session checks in API routes.
- Per-household storage partitioning.
- Later migration away from a single shared Notion workspace if needed.

Auth requirements must be designed before storing multi-household data.

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

## Security Considerations

Current rules:
- Secrets must remain server-side.
- Do not use `NEXT_PUBLIC_` for secrets.
- Do not commit `.env.local`.
- `.env.example` must use placeholders only.
- API routes return generic safe error messages.
- Detailed API failures are logged server-side only.

Known security gap:
- No authentication yet, so a deployed public URL exposes app workflows to anyone with the URL. Add auth before broader sharing or multi-user use.
