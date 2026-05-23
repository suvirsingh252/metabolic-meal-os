# Metabolic Meal OS Handoff

Last updated: 2026-05-23

This is the primary resume document for future Codex sessions. Keep it current.

## Current Project Status

Metabolic Meal OS is a production-oriented MVP Next.js app for household meal optimization.

Implemented:
- Responsive dashboard shell and route navigation.
- Recipe/meal analysis via OpenAI structured outputs.
- Editable analysis review form.
- Save analyzed meals to the Notion Meals database.
- Notion diagnostics from Settings.
- Meals list loaded from the Notion Meals database.
- Meal feedback logging to the Notion Meal Feedback database.
- Typed server-side environment configuration.

Not implemented yet:
- Authentication.
- Meal-to-feedback relations.
- Ingredient suggestion persistence.
- Weekly planning workflows.
- Meal template workflows.
- PWA manifest/service worker.
- Vercel deployment has not been confirmed from this repo.

## Current Architecture

Stack:
- Next.js App Router with TypeScript.
- React client components where interactivity is needed.
- Tailwind CSS and local shadcn-style UI primitives.
- OpenAI SDK for meal analysis.
- Notion SDK for persistence.
- Vercel is the intended deployment target.

Code organization:
- `src/app`: App Router pages and API routes.
- `src/lib/env.ts`: typed server-only environment validation.
- `src/lib/types`: shared app types.
- `src/lib/notion`: Notion client, mappers, and page summary extraction.
- `components`: reusable UI and layout components.

## Current Routes

Pages:
- `/`: dashboard overview.
- `/analyze`: paste recipe text, call analysis API, edit result, save to Notion.
- `/meals`: fetch and display saved meals from Notion.
- `/feedback`: log post-meal feedback to Notion.
- `/settings`: Notion diagnostics and server environment status.

## Current API Endpoints

- `POST /api/analyze-meal`
  - Input: `{ recipeText: string }`
  - Uses OpenAI structured JSON output.
  - Returns `MealAnalysisResult`.

- `GET /api/diagnostics/notion`
  - Verifies Notion API key, Meals database ID, and database access.
  - Returns safe success/failure JSON.

- `GET /api/notion/meals`
  - Queries the Notion Meals database's primary data source.
  - Returns simplified meal summaries.

- `POST /api/notion/save-meal`
  - Input: `MealAnalysisResult`
  - Saves core meal fields to Notion Meals.
  - Does not save ingredient suggestions or relations yet.

- `POST /api/notion/log-feedback`
  - Input: `MealFeedbackRequest`
  - Saves meal feedback fields to Notion Meal Feedback.
  - Does not relate feedback to Meals yet.

## Environment Variables

Required server-side variables:

```bash
OPENAI_API_KEY=
NOTION_API_KEY=
NOTION_MEALS_DATABASE_ID=
NOTION_INGREDIENTS_DATABASE_ID=
NOTION_FEEDBACK_DATABASE_ID=
NOTION_WEEKLY_PLANS_DATABASE_ID=
NOTION_MEAL_TEMPLATES_DATABASE_ID=
```

Rules:
- Never use `NEXT_PUBLIC_` for OpenAI or Notion secrets.
- Never commit `.env.local`.
- `.env.example` must contain placeholders only.
- Vercel environment variables must be configured in Project Settings before remote testing.

## Deployment Status

Current status:
- Local build passes.
- No `vercel.json` is currently necessary.
- App is intended to deploy as a standard Next.js app on Vercel.
- Remote phone testing should use the Vercel public HTTPS deployment URL.

Deployment risks:
- Serverless API routes depend on correct Vercel env vars.
- Notion integration must be shared with every Notion database used by the app.
- OpenAI and Notion keys that were accidentally placed in `.env.example` must be rotated before public GitHub/Vercel use.

## Mobile/PWA Strategy

Current strategy:
- Next.js web app.
- Vercel deployment.
- Mobile-friendly responsive UI.
- Progressive Web App enhancement.
- iPhone home-screen support.

Deferred:
- React Native.
- Expo.
- Native iOS.
- App Store deployment.

Reasoning:
- Maximize iteration speed.
- Maintain one codebase.
- Reduce operational complexity.
- Validate workflows before native investment.

## Current Blockers

- Rotate the OpenAI and Notion keys that were found in `.env.example` during this session.
- Confirm Vercel deployment and remote mobile testing.
- Confirm all Notion database schemas match app property names exactly.
- `getServerEnv()` currently validates all configured env vars, even endpoints that only need one subset. This is strict and useful, but can make partial environment setup fail broadly.

## Immediate Next Tasks

1. Rotate exposed OpenAI and Notion keys.
2. Push project to GitHub after confirming no secrets remain.
3. Import GitHub repo into Vercel.
4. Configure Vercel environment variables.
5. Deploy and test `/settings`, `/analyze`, `/meals`, and `/feedback` from a phone on public HTTPS.
6. Add PWA manifest and iPhone home-screen metadata.
7. Add relations between feedback and meals.

## Manual Testing Checklist

Local:
- Run `npm install`.
- Copy `.env.example` to `.env.local`.
- Fill in server env vars with real local values.
- Run `npm run dev -- -p 3011`.
- Open `/settings` and test Notion connection.
- Open `/analyze`, paste at least 10 characters, and verify the Analyze button enables.
- Analyze a meal and edit returned fields.
- Save the meal to Notion and open the returned Notion link.
- Open `/meals` and verify the saved meal appears.
- Open `/feedback`, submit a feedback entry, and open the returned Notion link.

Verification commands:

```bash
npm run typecheck
npm run lint
npm run build
```

## How To Start Local Dev

```bash
npm install
cp .env.example .env.local
npm run dev -- -p 3011
```

If another Next dev server is running, find it:

```bash
lsof -ti :3011
```

Then stop the process if it is safe to do so:

```bash
kill <pid>
```

## How To Deploy To Vercel

1. Push the project to GitHub.
2. In Vercel, create a new project from the GitHub repo.
3. Use the default Next.js framework settings.
4. Add all required environment variables in Vercel Project Settings.
5. Deploy.
6. Open the public HTTPS URL on desktop and mobile.
7. Test `/settings` first, then the full Analyze -> Save -> Meals -> Feedback path.

Redeploy after changes:
- Push to the connected GitHub branch, or
- Use Vercel Dashboard -> Deployments -> Redeploy.

No `vercel.json` is required at the moment.

## Important Notion Setup Details

Required databases:
- Meals.
- Ingredients.
- Meal Feedback.
- Weekly Plans.
- Meal Templates.

Current write/read usage:
- Meals: save analyzed meals and list saved meals.
- Meal Feedback: save post-meal feedback.
- Other database IDs are configured but not actively used yet.

Required sharing:
- Each used database must be shared with the Notion integration tied to `NOTION_API_KEY`.
- If diagnostics fail, first verify database sharing and database IDs.

Current Meals properties used:
- `Meal Name` title
- `Cuisine` select
- `Meal Type` select
- `Protein Level` select
- `Satiety Level` select
- `Blood Sugar Impact` select
- `Effort Level` select
- `Family Approved` checkbox
- `Weeknight Friendly` checkbox
- `Comfort Meal` checkbox
- `Optimized Version` rich_text
- `Notes` rich_text

Current Feedback properties used:
- `Feedback Entry` title
- `Energy After` select
- `Hunger Later` select
- `Cravings Later` checkbox
- `Would Repeat` checkbox
- `Notes` rich_text

# Mandatory Start-of-Session Procedure

At the beginning of EVERY future Codex session:

1. Read:
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

2. Summarize:
- current project state
- current priorities
- blockers
- technical debt
- next recommended task

3. Do NOT begin coding until the current state is understood.

# Mandatory End-of-Session Procedure

At the end of EVERY future Codex session:

1. Update `HANDOFF.md`
2. Update `ROADMAP.md`
3. Update `SESSION_LOG.md`
4. Update `KNOWN_ISSUES.md` if needed
5. Update `DECISIONS.md` if architectural decisions changed
6. Add any new environment variables
7. Add any new API routes
8. Add any deployment changes
9. Add unfinished work and blockers
10. Verify all docs remain internally consistent

This is REQUIRED before ending a session.

# Development Standards

Requirements:
- Keep secrets server-side only.
- Never expose OpenAI or Notion keys.
- Prefer typed interfaces.
- Prefer server actions/API routes for backend work.
- Add safe error handling.
- Log detailed errors server-side only.
- Use incremental vertical slices.
- Keep MVP complexity low.
- Avoid premature optimization.
- Prefer composable architecture.
- Avoid large refactors without documentation updates.
- Keep documentation current with routes, env vars, API routes, and deployment changes.

## Deployment And Recovery Procedures

Local startup:
- Run `npm install`.
- Create `.env.local`.
- Run `npm run dev -- -p 3011`.

LAN testing:
- Local LAN testing may work from `http://<machine-ip>:3011`, but public mobile testing should use Vercel HTTPS.
- Do not hardcode localhost in app code.

Vercel deployment:
- Push to GitHub.
- Import into Vercel.
- Add server-side environment variables.
- Deploy with default Next.js settings.

GitHub workflow:
- Before pushing, run a secret scan with a tool such as `gitleaks` or a carefully scoped `rg` search for real provider key prefixes.
- Verify `.env.local` is ignored.
- Verify `.env.example` contains placeholders only.

Recover from broken env config:
- Check Vercel Project Settings -> Environment Variables.
- Confirm values are set for the target environment.
- Redeploy after changing env vars.
- Use `/settings` -> `Test Notion Connection`.

Rotate API keys:
- Revoke the old OpenAI key in the OpenAI dashboard.
- Create a new OpenAI key and update `.env.local` and Vercel.
- Revoke or replace the Notion integration secret.
- Update `.env.local` and Vercel.
- Redeploy.

Reconnect Notion integrations:
- Open each database in Notion.
- Use Share and invite the integration.
- Confirm the integration has access.
- Run `/settings` diagnostics.
