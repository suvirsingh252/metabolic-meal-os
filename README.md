# Hearth

**Dinner is handled.** The operating system for family meals.

Hearth is a household meal intelligence app — meal planning that learns your
household's real preferences over time: meals, feedback, substitutions, recipes,
nutrition context, and planning patterns.

A production-oriented MVP scaffold for a household meal optimization app.

> **Rebrand note:** This product was previously named **Metabolic Meal OS** (also
> referred to as "Meal OS") and later **Tablewise**. It has been rebranded to
> **Hearth**. Historical
> references to the old name remain in changelog and decision history below for
> continuity. Internal identifiers — the repository, npm package name, deployment
> project, environment variables, Notion schema fields, database names, and API
> routes — intentionally keep their original names and were not changed by the
> rebrand.

## Project Handoff

Future development sessions should start with `docs/HANDOFF.md`.

The persistent engineering docs live in:

- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/SESSION_LOG.md`

Follow the mandatory start-of-session and end-of-session procedures in `docs/HANDOFF.md`.

## AI Development Workflow (AgentOps)

This repo uses a repo-local AI workflow so multiple CLI tools (Claude Code,
Codex, Gemini CLI, aider, and deterministic CLIs like `gh`/`vercel`/`drizzle`)
do not cross wires. It lives in `/ai`:

- `ai/AGENT_RULES.md` — binding rules for any AI agent (read first).
- `ai/CLI_ROLES.md` — which tool does what, plus an installed-status table.
  **Only Claude Code and npm are installed today; the others are candidates.**
- `ai/CURRENT_TASK.md` — the single active task packet / tree owner.
- `ai/TASK_PACKET_TEMPLATE.md` — how the PM defines a unit of work.
- `ai/CLOSEOUT_CHECKLIST.md` — end-of-task gate (mirrors HANDOFF).
- `ai/SESSION_HANDOFF.md` — explicit ownership handoffs between agents.
- `ai/PROMPT_LIBRARY.md` — reusable per-tool prompts.

Helper scripts (read-only / safe, degrade gracefully if a CLI is absent):

```bash
bash scripts/agent-status.sh      # what's installed + active task
bash scripts/agent-closeout.sh    # run lint/typecheck/test/build gate
```

Agents must not install CLIs or add dependencies, must not change app behavior
for tooling tasks, and must not commit unless asked. See `ai/AGENT_RULES.md`.

## Phone Operations

You can drive this repo over SSH from an iPhone (Termius + tmux). Full guide:
`ai/MOBILE_WORKFLOW.md`. The golden rule is **always work inside tmux** so a
dropped connection detaches instead of killing your work.

```bash
# Reconnect (attach if a session exists, else create one)
tmux attach -t tablewise || tmux new -s tablewise

# Detach (safe — keeps everything running):  Ctrl-b d
```

Safe from a phone: `bash scripts/agent-status.sh` (now reports the current tmux
session and window count), the validation gate via
`bash scripts/agent-closeout.sh` (start it, detach, reattach for the summary),
and git inspection (`git status`, `git diff`, `git log`).

Avoid from a phone: commits/pushes, destructive git, `drizzle-kit migrate` or any
production migration/deploy, dependency installs, and editing `.env*` secrets —
do those from a desktop where you can review the full diff. See
`ai/MOBILE_WORKFLOW.md` for the complete do / do-not list.

## Routes

- `/`
- `/dashboard`
- `/analyze`
- `/analyze?intake=<id>` — pre-filled from iPhone Share Sheet intake
- `/meals`
- `/meals/[id]`
- `/planner`
- `/feedback`
- `/settings`
- `POST /api/intake/share` — iPhone Shortcut intake endpoint

`/` renders Today. `/dashboard` remains available as the dashboard intelligence
surface.

## Development

```bash
npm install
npm run dev
```

The app uses server-side OpenAI and Notion integrations. Keep all provider secrets in `.env.local` locally and in Vercel Project Settings for production.

## Current Closeout Gates

Beta 2 closeout is not complete until these gates are closed:

- Supported database migration runbook.
- Mobile QA.
- Write-flow verification.
- Notion relation/schema verification.

Beta 3 feature work must not start until those gates pass. Current verified
state and future recommendations are tracked separately in `docs/HANDOFF.md`
and `docs/ROADMAP.md`.

## Environment

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Add your OpenAI API key to `OPENAI_API_KEY` in `.env.local`. Add your Notion integration secret to `NOTION_API_KEY`.

For database checks and migrations, `DATABASE_URL` must come from the target
Postgres environment. Use `.env.local` or an exported shell value for local
operations, and use the verified production connection string from the database
provider or Vercel Project Settings before production migrations.

The Notion database IDs come from each Notion database URL. Open the Meals, Ingredients, Feedback, Meal Plan, Weekly Plans, and Meal Templates databases in Notion, copy each database URL, and use the long ID in the URL for the matching `NOTION_*_DATABASE_ID` value.

Do not commit `.env.local` or any real API keys. Secrets must stay server-side and must not use the `NEXT_PUBLIC_` prefix.

## Database Migrations

The supported migration process is documented in
`docs/DB_MIGRATION_RUNBOOK.md`.

Normal flow:

```bash
npm run db:check
npm run db:migrate
npm run db:check
```

`db:check` verifies database connectivity, expected public tables, and Drizzle
migration state using metadata only. Temporary runtime migration routes are
emergency-only and are not the normal process.

## Vercel Deployment

1. Push this project to GitHub after running a secret scan.
2. Import the GitHub repo into Vercel as a Next.js project.
3. Add the required environment variables in Vercel Project Settings.
4. Deploy with the default Vercel Next.js settings.
5. Test the public HTTPS URL from desktop and mobile.

Required Vercel environment variables:

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN` — required for durable Visual Cookbook image storage in Vercel Blob
- `NOTION_API_KEY`
- `NOTION_MEALS_DATABASE_ID`
- `NOTION_INGREDIENTS_DATABASE_ID`
- `NOTION_FEEDBACK_DATABASE_ID`
- `NOTION_MEAL_PLAN_SOURCE_ID` — enables `/planner`; use the active Meal Plan data source ID
- `NOTION_MEAL_PLAN_DATABASE_ID` — optional fallback if using the parent database ID instead of the data source ID
- `NOTION_WEEKLY_PLANS_DATABASE_ID`
- `NOTION_MEAL_TEMPLATES_DATABASE_ID`
- `APP_AUTH_TOKEN` — **required**; long random secret that gates every page and API route
- `ALLOW_UNAUTHENTICATED` — set to `false` for private production; `true` is an explicit trusted family/beta open mode
- `IOS_SHORTCUT_TOKEN` — **required for iPhone intake**; secret token for the iPhone Share Sheet Shortcut (Beta 3.6)
- `NOTION_MEAL_INTAKE_DATABASE_ID` — optional; enables intake persistence (Beta 3.6)

Visual Cookbook production image storage requires a Vercel Blob store connected
to both Preview and Production. Create/link it with:

```bash
vercel blob create-store metabolic-meal-os-recipe-images --access public --environment production --environment preview --yes
```

This creates a public Blob store, links it to the Vercel project, and adds
`BLOB_READ_WRITE_TOKEN` for the selected environments. After changing Blob or
environment configuration, redeploy before verifying image upload/resolve flows.

## Authentication

The deployment is private by default:

- If `APP_AUTH_TOKEN` is unset and no opt-out is configured, all requests fail closed with 503. Production must set `APP_AUTH_TOKEN`.
- Browser users sign in at `/login` by entering the `APP_AUTH_TOKEN` value. A successful login sets an `HttpOnly` `app_auth_token` cookie (Secure in production, SameSite=Lax, 30-day expiry). Unauthenticated page requests redirect to `/login`; unauthenticated API requests get a JSON 401.
- API clients authenticate with `Authorization: Bearer <APP_AUTH_TOKEN>` or `x-app-auth-token: <APP_AUTH_TOKEN>`.
- The iPhone Shortcut authenticates `POST /api/intake/share` with `Authorization: Bearer <IOS_SHORTCUT_TOKEN>` (cookies are not accepted there).
- `ALLOW_UNAUTHENTICATED=true` explicitly disables app authentication for browser users and guarded app API routes, even when `APP_AUTH_TOKEN` is set. Use it only for trusted family/beta testing; it is not recommended for broader production use.
- `POST /api/intake/share` still requires `IOS_SHORTCUT_TOKEN` when `ALLOW_UNAUTHENTICATED=true`.
- `PRIVATE_DEPLOYMENT_MODE=false` is a deprecated legacy opt-out kept for one release; it logs a warning. Migrate to `ALLOW_UNAUTHENTICATED=true`.

> **Warning:** Do not deploy the auth release to production until `APP_AUTH_TOKEN` and `IOS_SHORTCUT_TOKEN` are set in Vercel production (and `ALLOW_UNAUTHENTICATED=false`). Deploying without them fails closed and locks out the app.

Redeploy after changes by pushing to the connected GitHub branch or using Vercel Dashboard -> Deployments -> Redeploy.

Deployment checklist:

- `APP_AUTH_TOKEN` set to a long random secret in Vercel production.
- `IOS_SHORTCUT_TOKEN` set to a long random secret in Vercel production.
- `ALLOW_UNAUTHENTICATED=false` in Vercel production.
- OpenAI API key configured.
- Vercel Blob store linked and `BLOB_READ_WRITE_TOKEN` configured for Preview and Production.
- Notion API key configured.
- All Notion database IDs configured.
- Meals and Feedback databases shared with the Notion integration.
- Meal Plan data source/database shared with the Notion integration if Planner is enabled.
- `/settings` Notion diagnostics passes on the Vercel URL.
- `/planner` loads; if configured, the current week Breakfast, Lunch, Dinner, and Snack slots can be assigned, cleared, and marked cooked/skipped/swapped.
- `IOS_SHORTCUT_TOKEN` set and iPhone Shortcut configured (see iPhone Shortcut Setup below).

## iPhone Testing And Home Screen

Use the Vercel public HTTPS URL for the most realistic iPhone test. Safari requires HTTPS for the app-like install flow, and this avoids local network and firewall issues.

To add the app to an iPhone home screen:

1. Open the Vercel deployment URL in Safari.
2. Tap the Share button.
3. Choose `Add to Home Screen`.
4. Keep the suggested name, `Hearth`, or rename it.
5. Launch the app from the new home screen icon.

LAN testing can be useful for quick local checks while developing:

1. Start the dev server with a reachable port, for example `npm run dev -- -p 3011`.
2. Find the Network URL printed by Next.js, such as `http://192.168.x.x:3011`.
3. Open that URL from an iPhone on the same Wi-Fi network.

LAN testing is not a substitute for the Vercel test because it uses plain HTTP, can be blocked by device/network settings, and does not fully match the public mobile deployment path.

PWA notes:

- The app includes a web app manifest at `/manifest.webmanifest`.
- App icons are the Hearth mark: `public/icons/hearth-icon.svg`, `hearth-192.png`, `hearth-512.png`, and `hearth-apple-touch-icon.png`, plus `public/favicon.ico`. They live under `public/icons/` (and `favicon.ico` at root) because the auth middleware exempts those paths, so PWA/iOS clients can fetch them unauthenticated.
- There is no service worker or offline mode yet.

## iPhone Shortcut Setup (Beta 3.6)

The iPhone Share Sheet Shortcut lets you send recipe URLs, social post URLs, or copied recipe text from any app directly into Hearth for analysis.

### Notion Intake Database

Before setting up the Shortcut, create a new Notion database called **Meal Intake** and share it with your Notion integration. Add these properties:

| Property | Type |
|---|---|
| Name | Title |
| URL | URL |
| Raw Text | Text |
| Source | Text |
| Status | Select (options: Pending, Analyzed, Error) |
| Created At | Date |
| Error | Text |

Copy the database ID from the Notion URL and set `NOTION_MEAL_INTAKE_DATABASE_ID` in Vercel.

### Shortcut steps

1. Open the **Shortcuts** app on your iPhone.
2. Tap **+** to create a new shortcut. Name it **Send to Hearth**.
3. Tap the info icon and enable **Use as Share Sheet**.
4. Under **Share Sheet Types**, enable **URLs**, **Text**, **Safari Web Pages**, **Rich Text**, and **Apps** if available.
5. Set **If there's no input** to **Continue**.
6. Add a **Get Text from Input** action using **Shortcut Input**.
7. Add a **Dictionary** action:
   ```json
   {
     "input": "<Shortcut variable: Text>",
     "source": "ios-shortcut",
     "sharedAt": "<Shortcut variable: Current Date>"
   }
   ```
8. Add a **Get Contents of URL** action with these settings:
   - **URL**: `https://metabolic-meal-os-due4.vercel.app/api/intake/share`
   - **Method**: POST
   - **Headers**:
     - `Authorization`: `Bearer <your IOS_SHORTCUT_TOKEN>`
     - `Accept`: `application/json`
   - **Request Body**: JSON
   - **JSON body**: Dictionary from step 7
9. Add a **Show Result** action using **Contents of URL**.

For now, the Shortcut only shows the server response. Later, add **Get Dictionary from Contents of URL**, get `openUrl`, convert it to a URL, and open it.

### Token security

- `IOS_SHORTCUT_TOKEN` is a private server-only secret. Choose a long random string.
- Set it in Vercel Project Settings (not `NEXT_PUBLIC_*`).
- Add it to the Shortcut Authorization header exactly as `Bearer <token>`.
- Rotate it if the Shortcut is shared or the device is compromised.

## Analyze Meal API

Temporary local test example:

```bash
curl -X POST http://localhost:3011/api/analyze-meal \
  -H "Content-Type: application/json" \
  -d '{"recipeText":"Chana masala with chickpeas, tomatoes, onions, garlic, ginger, spices, and basmati rice for dinner."}'
```

This endpoint requires `OPENAI_API_KEY` in `.env.local`.

Nutrition behavior:

- Recipe pages with schema.org JSON-LD nutrition facts populate structured meal-level nutrition when available.
- When structured nutrition is unavailable, parsed recipe ingredients can now receive conservative estimated calories, protein, and fiber. Structured nutrition still wins; ingredient-based estimates are labeled as `estimated`.
- Manual/free-text meals can receive conservative estimated calories, protein, and fiber for a set of common household foods and shorthand such as `2 rotis and dal`, `paneer wrap`, `rice and chicken`, `egg bhurji and toast`, `oats with yogurt`, `leftover curry and rice`, `half bowl dal`, `large chicken salad`, and `with/without butter`.
- Social intake paths benefit when they recover ingredient lists from captions or normalized recipe text.
- Sodium, sugar, fat, and carbs remain blank unless structured data or review edits provide them.
- Estimated nutrition is labeled with matched components, serving assumptions, confidence, and review guidance. Structured recipe nutrition, estimated nutrition, user-entered edits, and unavailable nutrition are shown separately in the review flow.
- Estimated meals expose coarse review controls before save: serving multiplier `0.5x`, `1x`, `1.5x`, `2x`, plus add/remove butter where relevant.
- User edits or reviewed estimate adjustments become `user-entered` provenance while preserving blank values as `null`, not zero. Repeated serving and butter changes replace stale review notes so saved provenance stays concise.

Saved meal continuity and intelligence:

- Beta 6.3 (`f49d023`, Add app-native save continuity links): after Save, the primary next action is `View saved meal`, with `Add to Planner` as the secondary app-native continuation. Notion links remain secondary/advanced.
- Beta 6.4 (`8be7817`, Surface saved meal intelligence summary): Meal Detail now surfaces a compact Meal OS Summary with quick verdict, why it works, minimal optimization, nutrition confidence, and family considerations by reusing already persisted Notes, optimized version, nutrition metadata, and feedback signals. No new storage architecture or Notion schema change was introduced.
- Beta 6.5 (`9a04047`, Estimate nutrition from recipe ingredients): missing nutrition is reduced by using ingredient-based estimates when structured recipe nutrition is unavailable. Manual nutrition entry remains optional.

Dashboard reliability behavior:

- Beta 3.5 audit verified the full Analyze -> Save -> Notion -> Meals -> Dashboard nutrition lifecycle with a known meal. New saves now inspect the active Notion data source before writing optional nutrition fields, so compatible Meals properties receive calories, protein, fiber, nutrition source/provenance/confidence, and meal quality.
- Historical Meals are enriched at read time only. Existing Notion nutrition and score properties win; legacy Notes scorecards can backfill quality metadata; exact nutrition totals are never invented.
- `/dashboard` starts with household takeaways: what Hearth learned, what to do next, and how confident the insights are. Technical signal details live under Signal confidence.
- `/settings` Notion schema diagnostics reports optional Meals field gaps and incompatible property types without mutating Notion schema or blocking the app.

Feedback behavior:

- `/feedback`, Today quick actions, and Meal Detail quick actions save to the existing Notion Meal Feedback database through `POST /api/notion/log-feedback`.
- Today and Meal Detail update visible household feedback summaries optimistically after successful feedback saves, then refresh server data when practical.
- Quick action semantics are intentionally explicit: `Ate This` logs eaten only; `Loved It` logs eaten, loved, and worth repeating; Meal Detail `Would Make Again` is repeat-only in the household summary.
- Today shows a compact Recent Household Learning strip derived from existing feedback summaries.
- Today undo is client-side only. It restores the local Today view and learning strip but does not delete or reverse persisted feedback history.
- Meal Detail and Feedback use explicit saved-state copy instead of implying persisted undo exists.
- No Notion schema changes are required for the Beta 2/Beta 3 feedback refresh, learning strip, usability copy, or client-only undo slices.

Recommendation behavior:

- Today recommendations use deterministic scoring from existing saved meal metadata and existing household feedback summaries only.
- The score is split into preference, recency, variety penalty, and saved scheduling metadata components.
- No OpenAI call, generated recommendation, or new Notion property is used for recommendation ranking.
- With no feedback history, preference remains neutral and Today falls back to stable saved-meal metadata scoring.
- Today cards show 2-4 plain household reasons and include an expandable `Why this meal?` explanation generated from the same deterministic score components.
- Beta 3.5 hardening fixed mobile `Suggest Another` cycling so categories with alternatives can keep rotating after temporary exclusions are exhausted, and repeated-saved-meal reasons no longer imply household success unless feedback supports that claim.

Planner behavior:

- `/planner` is a Notion-backed Weekly Planner v1.1.
- It renders the current Monday-Sunday week with Breakfast, Lunch, Dinner, and Snack slots.
- Saved meals from the existing Meals database are the only assignable options. The planner does not invent meals, generate weeks, or build grocery lists.
- The planner can assign a saved meal, clear a planned meal relation, and update status to `Planned`, `Cooked`, `Skipped`, or `Swapped`.
- If `NOTION_MEAL_PLAN_SOURCE_ID` or `NOTION_MEAL_PLAN_DATABASE_ID` is missing, or the Meal Plan schema is incomplete, `/planner` shows setup diagnostics and blocks writes without crashing.

## Family Cookbook Architecture (Beta 5)

Beta 5 turns `/meals/[id]` into a cooking-first family cookbook view:

Plan
↓
Cook
↓
Adjust
↓
Remember
↓
Shop
↓
Stock

Current implementation:

- Meal Detail now prioritizes `Make This Again`, `Ate This`, `Loved It`, `Add to Planner`, `How We Make It`, `Ingredients`, `Instructions`, `Original Recipe`, `Nutrition`, and `Advanced details`.
- `How We Make It` is an overlay on the saved recipe, not a replacement. Family adjustments are saved through the existing Meal Feedback database with a cookbook marker and are read back into the family section.
- Ingredients are represented in the app as structured cookbook ingredients with `name`, `quantity`, `unit`, and `rawText`. Older meals may only have name/raw text when quantities were not available.
- Instructions are rendered as large mobile cooking steps when saved notes contain an instructions/method section.
- Original recipe access stays secondary through `Open Original Recipe`, using `Source URL` when present and the saved Notion record as fallback.

Grocery lists, pantry inventory, barcode scanning, shopping workflows, and inventory consumption are intentionally deferred. Beta 5 only establishes the data boundary needed later: source recipe data remains preserved, family modifications layer on top, and structured ingredient fields are not flattened into plain text.

Cookbook Data Pipeline (Beta 5.1):

```text
Analyze -> Save -> Notion -> Reload -> Cookbook
```

- Analyze captures recipe content, not just analysis: URL imports carry the parser's verbatim JSON-LD ingredients and instructions into the result; pasted text uses AI `extractedIngredients`/`extractedInstructions` (verbatim-copy instructed) as a fallback. Parser output always wins over model output.
- Save embeds canonical `Ingredients:` and `Instructions:` sections into the Notion `Notes` property — exactly the headers the cookbook view parses back out — so capture requires no Notion schema changes. If the Meals database has optional `Ingredients`/`Instructions` rich_text properties, they are written too. Notes are chunked across 2000-character rich_text blocks instead of truncating.
- Source URL persists through aliases including the household `Original Source` url property.
- Reload prefers dedicated properties, then Notes sections, then graceful empty states for older meals. No migration is required; re-analyzing and re-saving a recipe URL upgrades an old entry.
- Family adjustments remain feedback-backed overlays and never modify the saved recipe.

Grocery and inventory remain deferred on purpose: aggregation needs trustworthy quantities, and Beta 5.1 stops at verbatim ingredient fidelity so future aggregation can build on real data instead of heuristics.

Meal Plan Notion database:

| Property | Type |
|---|---|
| Name | Title |
| Plan Date | Date |
| Meal Slot | Select: Dinner, Lunch, Breakfast, Snack |
| Meal | Relation to existing Meals database/data source |
| Status | Select: Planned, Cooked, Skipped, Swapped |
| Source | Select: Manual, Suggested, Generated |
| Household Notes | Rich text |

Beta 3 usability behavior:

- Normal household flows use Hearth language (`Save meal`, `Saved to Hearth`, `Saved meals`) instead of Notion-facing copy.
- External saved-record links remain available only in Advanced details where kept.
- Analyze uses staged loading copy (`Reading meal details...`, `Estimating household fit...`, `Checking nutrition signals...`, `Preparing your review...`) and tells users detailed meals can take about 20-30 seconds.
- Meal Detail starts with household summary, quick feedback semantics, why the meal works, nutrition/quality, and recent feedback. Raw notes, provenance, and external saved-record links live under Advanced details.

## Manual Integration Test

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Fill in `.env.local` with your OpenAI API key, Notion API key, and Notion database IDs.

3. In Notion, open the Meals database, use the Share menu, and invite the Notion integration that owns `NOTION_API_KEY`.

4. Start the dev server:

```bash
npm run dev
```

5. Open `http://localhost:3011/settings` and click `Test Notion Connection`. A successful check shows the Meals database title.

6. Open `http://localhost:3011/analyze`, paste a recipe or meal idea, and run analysis.

7. Review or edit the analyzed meal fields, then click `Save meal`.

8. Confirm the success state says `Saved to Hearth.` and, under Advanced details, the saved record opens in the Meals database.

## Mobile UX Principles

Beta 4 pauses feature development and treats iPhone use as the primary design constraint.

Principles:
- Preserve all existing capabilities.
- Make each mobile route optimize for one primary job.
- Keep the primary job within roughly two phone screen lengths where practical.
- Collapse secondary information by default.
- Keep desktop workflows information-dense where that helps repeated use.
- Prefer day selectors, segmented controls, accordions, and expandable sections over long vertical stacks.
- Avoid rendering entire datasets on phones unless the user explicitly expands them.

Route decisions:
- `/today`: primary job is getting through today. Daily suggestions and quick `Ate This` / `Loved It` actions stay first; learning, fresh ideas, and health snapshot move behind secondary disclosure.
- `/analyze`: primary job is saving a meal. Intake is shorter on mobile, the submit button is full-width, and `Save meal` appears immediately after practical guidance and quick edits. Nutrition, scores, evidence, provenance, and advanced saved fields remain expandable.
- `/meals`: primary job is finding a meal quickly. Mobile starts with Recent/Favorites/All controls, search, and a six-item default list with `Show all`; desktop still renders the full filtered grid.
- `/planner`: primary job is deciding what we are eating. Mobile uses a horizontal day selector and shows one day at a time; desktop keeps the full week grid.
- `/dashboard`: primary job is answering "How are we doing?" Household takeaways and today's metrics stay visible; targets, quality/data, weekly insights, and recent meals are expandable.
- `/feedback`: primary job is logging household learning. Meal selection, feedback entry, and save are first; energy/hunger/cravings/notes are optional details.
- `/settings`: primary job remains fixing/configuring the system. Household defaults and integration status stay separated from diagnostics.
- `/meals/[id]`: primary job is reusing the meal. `Would Make Again` is first, quick feedback actions are immediately available, and summary/why/nutrition/provenance are expandable.
