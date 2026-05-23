# Architecture

Last updated: 2026-05-23

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

The UI is intentionally MVP-simple: cards, forms, badges, alerts, and buttons. No global state manager is used.

## Backend/API Architecture

Backend work is implemented through App Router API routes:
- `src/app/api/analyze-meal/route.ts`
- `src/app/api/diagnostics/notion/route.ts`
- `src/app/api/notion/meals/route.ts`
- `src/app/api/notion/save-meal/route.ts`
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
4. Server reads `OPENAI_API_KEY`.
5. OpenAI Responses API returns structured JSON.
6. UI renders editable `MealAnalysisResult`.

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

Diagnostics:
1. `/settings` calls `GET /api/diagnostics/notion`.
2. Server retrieves the Meals database.
3. UI displays safe success/failure state.

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

Current entities:
- Meals.
- Meal Feedback.

Configured but not fully used:
- Ingredients.
- Weekly Plans.
- Meal Templates.

Expected evolution:
- Relate feedback entries to meals.
- Save ingredient suggestions.
- Build weekly plan records.
- Add meal template reuse.
- Add richer constraints and household preferences.
- Consider a real database if querying, permissions, or performance outgrow Notion.

## Future PWA Strategy

Planned:
- Web app manifest.
- App icons.
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
