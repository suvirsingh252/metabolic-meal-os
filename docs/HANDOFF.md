# Metabolic Meal OS Handoff

Last updated: 2026-05-23 (session closeout — Analysis Framework v2 complete)

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
- Saved-meal selection on feedback form, with manual entry fallback.
- Ingredient suggestion persistence to Notion Ingredients after meal save, without relations.
- Notion schema diagnostics for Meals, Ingredients, and Meal Feedback from Settings.
- PWA foundation with app metadata, manifest, placeholder SVG/PNG icons, and iPhone-friendly layout polish.
- Typed server-side environment configuration.
- Analysis Framework v2: expanded OpenAI structured output with numeric scores, minimal-change framing, cultural notes, shopping additions, prep notes, meal pairings, and cautions. All v2 fields are editable in /analyze before save. Notion Notes field stores a concise v2 summary without schema changes.

Not implemented yet:
- Authentication.
- Meal-to-ingredient relations.
- Weekly planning workflows.
- Meal template workflows.
- Service worker/offline PWA support.
- Recipe URL input: detect a URL, fetch server-side, extract readable content, and pass to analysis. Deferred to next session.

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
- `src/app/manifest.ts`: web app manifest for mobile/home-screen installs.
- `src/lib/ingredients`: ingredient normalization and deduplication helpers.
- `src/lib/env.ts`: typed server-only environment validation with route-scoped helpers.
- `src/lib/types`: shared app types.
- `src/lib/notion`: Notion client, mappers, and page summary extraction.
- `components`: reusable UI and layout components.
- `public/icons`: original placeholder PWA icon assets.

## Current Routes

Pages:
- `/`: dashboard overview.
- `/analyze`: paste recipe text, call analysis API, edit result, save to Notion.
- `/meals`: fetch and display saved meals from Notion.
- `/feedback`: select a saved meal or enter a manual meal name, then log post-meal feedback to Notion.
- `/settings`: Notion diagnostics and server environment status.

## Current API Endpoints

- `POST /api/analyze-meal`
  - Input: `{ recipeText: string }`
  - Uses OpenAI structured JSON output.
  - Returns `MealAnalysisResult`.

- `GET /api/diagnostics/notion`
  - Verifies Notion API key, Meals database ID, and database access.
  - Returns safe success/failure JSON.

- `GET /api/diagnostics/notion-schemas`
  - Retrieves safe schema summaries for Meals, Ingredients, and Meal Feedback.
  - Returns database key, ID, title, and property name/type pairs.
  - Uses scoped env helpers and never returns API keys.
  - Can return partial schema results with safe per-database errors.

- `GET /api/notion/meals`
  - Queries the Notion Meals database's primary data source.
  - Returns simplified meal summaries.

- `POST /api/notion/save-meal`
  - Input: `MealAnalysisResult`
  - Saves core meal fields to Notion Meals.
  - Writes a concise Analysis Framework v2 summary into the existing `Notes` field via `buildMealNotesSummary`.
  - Does not add new Notion properties or create relations.

- `POST /api/notion/save-ingredients`
  - Input: `{ mealName: string, ingredients: string[] }`
  - Normalizes, deduplicates, and persists ingredient suggestions to Notion Ingredients.
  - Avoids creating duplicate ingredient pages by normalized ingredient title.
  - Saves source meal name and created date only when compatible Ingredients properties exist.
  - Does not relate ingredients to meals yet.

- `POST /api/notion/log-feedback`
  - Input: `MealFeedbackRequest`
  - Saves meal feedback fields to Notion Meal Feedback.
  - Saves the meal name in the feedback title for readability.
  - If `selectedMealId` is present and the Feedback database has a compatible `Meal` relation property, writes the relation to the selected Meal page.
  - If the `Meal` relation property is missing, saves feedback without relation and returns a non-blocking warning.

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

Current route-scoped usage:
- `/api/analyze-meal`: `OPENAI_API_KEY`
- `/api/diagnostics/notion`: `NOTION_API_KEY`, `NOTION_MEALS_DATABASE_ID`
- `/api/diagnostics/notion-schemas`: scoped Meals, Ingredients, and Feedback env helpers
- `/api/notion/meals`: `NOTION_API_KEY`, `NOTION_MEALS_DATABASE_ID`
- `/api/notion/save-meal`: `NOTION_API_KEY`, `NOTION_MEALS_DATABASE_ID`
- `/api/notion/save-ingredients`: `NOTION_API_KEY`, `NOTION_INGREDIENTS_DATABASE_ID`
- `/api/notion/log-feedback`: `NOTION_API_KEY`, `NOTION_FEEDBACK_DATABASE_ID`

Available env helpers:
- `getOpenAIEnv()`
- `getNotionMealsEnv()`
- `getNotionFeedbackEnv()`
- `getNotionIngredientsEnv()`
- `getFullNotionEnv()`
- `getFullServerEnv()`
- `getServerEnv()` remains as a compatibility alias for full server env validation.

Rules:
- Never use `NEXT_PUBLIC_` for OpenAI or Notion secrets.
- Never commit `.env.local`.
- `.env.example` must contain placeholders only.
- Vercel environment variables must be configured in Project Settings before remote testing.

## Deployment Status

Current status:
- Local build passes.
- No `vercel.json` is currently necessary.
- GitHub repo exists and is pushed.
- Vercel deployment exists and has succeeded.
- Public HTTPS deployment is live.
- Production Notion diagnostics works after Vercel env vars were completed.

Deployment risks:
- Serverless API routes depend on correct Vercel env vars.
- Notion integration must be shared with every Notion database used by the app.
- OpenAI and Notion keys that were accidentally placed in `.env.example` should be rotated if not already completed.

## Mobile/PWA Strategy

Current strategy:
- Next.js web app.
- Vercel deployment.
- Mobile-friendly responsive UI.
- Progressive Web App enhancement.
- iPhone home-screen support.
- Basic manifest and original placeholder SVG/PNG icons.
- Safe-area padding and larger mobile form/tap targets.

Deferred:
- Service worker/offline mode.
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

- Rotate the OpenAI and Notion keys that were found in `.env.example` if not already completed.
- Analysis Framework v2 has not been smoke-tested on the live Vercel deployment yet. Deploy and verify before trusting production.

## Immediate Next Tasks

1. Push Analysis Framework v2 to GitHub and deploy to Vercel.
2. On the live URL: open `/analyze`, run an analysis, confirm all v2 sections appear (Quick Verdict, Scorecard, Concerns, Strategy, Shopping & Prep).
3. Save a meal to Notion and open the Notion page — confirm `Notes` contains the v2 summary block.
4. Open `/meals` and confirm the saved meal appears.
5. Rotate exposed OpenAI and Notion keys if not already completed.
6. Next feature slice: Recipe URL analysis support (detect URL, fetch server-side, extract readable content via jsdom + @mozilla/readability, fall back to pasted text on failure).

## Manual Testing Checklist

Local:
- Run `npm install`.
- Copy `.env.example` to `.env.local`.
- Fill in server env vars with real local values.
- Run `npm run dev -- -p 3011`.
- Open `/settings` and test Notion connection.
- In `/settings`, click `Test Notion Schemas` and verify Meals, Ingredients, and Feedback property lists appear.
- Open `/analyze`, paste at least 10 characters, and verify the Analyze button enables.
- Analyze a meal and verify all Analysis Framework v2 sections appear: Quick Verdict, Scorecard (five numeric fields), Main Concerns, Minimal-Change Version, More Supportive Version, Plate Strategy, Why This Helps, Cultural Notes, Shopping Additions, Prep Notes, Meal Pairings, Cautions.
- Edit at least one score, one text field, and one array field to confirm they are editable before save.
- Save the meal to Notion and open the returned Notion link.
- In Notion, confirm the `Notes` field contains: original notes, Analysis Framework v2 Summary header, Quick Verdict, Scorecard, Main Concerns, Plate Strategy, and Cautions sections.
- Verify ingredient persistence status appears after meal save.
- Open the Ingredients database and verify new normalized suggestions are created without duplicate repeats.
- Open `/meals` and verify the saved meal appears.
- Open `/feedback`, verify saved meals load in the Meal dropdown.
- Select a saved meal and verify it fills Feedback Entry.
- Edit Feedback Entry manually and submit feedback.
- If the `Meal` relation property is missing, verify feedback still saves and displays the warning.
- Open the returned Notion link.
- Open `/manifest.webmanifest` and verify it returns manifest JSON.
- From iPhone Safari, use Share -> Add to Home Screen on the Vercel URL.

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
- Ingredients: save normalized ingredient suggestions after meal save.
- Meal Feedback: save post-meal feedback with a saved or manual meal name.
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
- `Notes` rich_text — now contains original notes plus a concise Analysis Framework v2 summary (quick verdict, scorecard, main concerns, plate strategy, cautions). Built by `src/lib/notion/meal-notes.ts`. No new Notion properties were added.

Current Feedback properties used:
- `Feedback Entry` title
- `Meal` relation to Meals, optional but required for true selected-meal relation writes
- `Energy After` select
- `Hunger Later` select
- `Cravings Later` checkbox
- `Would Repeat` checkbox
- `Notes` rich_text

Manual Notion setup required for feedback relations:
1. Open the Meal Feedback database in Notion.
2. Add a Relation property named exactly `Meal`.
3. Point the relation to the Meals database.
4. Share both databases with the same Notion integration.
5. Run `/settings` -> `Test Notion Schemas` and confirm Meal Feedback includes `Meal` with type `relation`.
6. Selected-meal feedback will then write the relation automatically.

Feedback relation status:
- The app code supports writing the Meal Feedback → Meals relation when the `Meal` relation property exists in Notion.
- If the relation property is present, selected-meal feedback writes a relation automatically.
- If the relation property is absent, feedback still saves and returns a non-blocking warning.
- Relation support is deployed. Verify in `/settings` → `Test Notion Schemas` that Meal Feedback includes a `Meal` property of type `relation`; if not, create it manually following the steps above.

Current Ingredients behavior:
- Uses the database's title property for ingredient name.
- Optional source meal property is used if named `Source Meal`, `Source Meal Name`, `Meal`, or `Meal Name` and typed as rich_text or select.
- Optional created date property is used if named `Created`, `Created Date`, `Created At`, or `Added Date` and typed as date.
- Duplicate detection uses trimmed, lowercase, lightly singularized ingredient names.

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
- GitHub repo is already connected.
- Vercel deployment is already live.
- Add or update server-side environment variables in Vercel Project Settings.
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
