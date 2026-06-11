# Metabolic Meal OS

A production-oriented MVP scaffold for a household meal optimization app.

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

## Routes

- `/`
- `/dashboard`
- `/analyze`
- `/meals`
- `/meals/[id]`
- `/feedback`
- `/settings`

`/` renders Today. `/dashboard` remains available as the dashboard intelligence
surface.

## Development

```bash
npm install
npm run dev
```

The app uses server-side OpenAI and Notion integrations. Keep all provider secrets in `.env.local` locally and in Vercel Project Settings for production.

## Environment

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Add your OpenAI API key to `OPENAI_API_KEY` in `.env.local`. Add your Notion integration secret to `NOTION_API_KEY`.

The Notion database IDs come from each Notion database URL. Open the Meals, Ingredients, Feedback, Weekly Plans, and Meal Templates databases in Notion, copy each database URL, and use the long ID in the URL for the matching `NOTION_*_DATABASE_ID` value.

Do not commit `.env.local` or any real API keys. Secrets must stay server-side and must not use the `NEXT_PUBLIC_` prefix.

## Vercel Deployment

1. Push this project to GitHub after running a secret scan.
2. Import the GitHub repo into Vercel as a Next.js project.
3. Add the required environment variables in Vercel Project Settings.
4. Deploy with the default Vercel Next.js settings.
5. Test the public HTTPS URL from desktop and mobile.

Required Vercel environment variables:

- `OPENAI_API_KEY`
- `NOTION_API_KEY`
- `NOTION_MEALS_DATABASE_ID`
- `NOTION_INGREDIENTS_DATABASE_ID`
- `NOTION_FEEDBACK_DATABASE_ID`
- `NOTION_WEEKLY_PLANS_DATABASE_ID`
- `NOTION_MEAL_TEMPLATES_DATABASE_ID`

Redeploy after changes by pushing to the connected GitHub branch or using Vercel Dashboard -> Deployments -> Redeploy.

Deployment checklist:

- OpenAI API key configured.
- Notion API key configured.
- All Notion database IDs configured.
- Meals and Feedback databases shared with the Notion integration.
- `/settings` Notion diagnostics passes on the Vercel URL.

## iPhone Testing And Home Screen

Use the Vercel public HTTPS URL for the most realistic iPhone test. Safari requires HTTPS for the app-like install flow, and this avoids local network and firewall issues.

To add the app to an iPhone home screen:

1. Open the Vercel deployment URL in Safari.
2. Tap the Share button.
3. Choose `Add to Home Screen`.
4. Keep the suggested name, `Meal OS`, or rename it.
5. Launch the app from the new home screen icon.

LAN testing can be useful for quick local checks while developing:

1. Start the dev server with a reachable port, for example `npm run dev -- -p 3011`.
2. Find the Network URL printed by Next.js, such as `http://192.168.x.x:3011`.
3. Open that URL from an iPhone on the same Wi-Fi network.

LAN testing is not a substitute for the Vercel test because it uses plain HTTP, can be blocked by device/network settings, and does not fully match the public mobile deployment path.

PWA notes:

- The app includes a web app manifest at `/manifest.webmanifest`.
- Current icons are simple original placeholder SVG and generated PNG assets in `public/icons`.
- There is no service worker or offline mode yet.

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
- Manual/free-text meals can receive conservative estimated calories, protein, and fiber for a small set of common household foods and shorthand such as `2 rotis and dal`, `paneer wrap`, `rice and chicken`, `egg bhurji and toast`, `oats with yogurt`, `leftover curry and rice`, `half bowl dal`, `large chicken salad`, and `with/without butter`.
- Sodium, sugar, fat, and carbs remain blank unless structured data or review edits provide them.
- Estimated nutrition is labeled with matched components, serving assumptions, confidence, and review guidance. Structured recipe nutrition, estimated nutrition, user-entered edits, and unavailable nutrition are shown separately in the review flow.
- Estimated meals expose coarse review controls before save: serving multiplier `0.5x`, `1x`, `1.5x`, `2x`, plus add/remove butter where relevant.
- User edits or reviewed estimate adjustments become `user-entered` provenance while preserving blank values as `null`, not zero. Repeated serving and butter changes replace stale review notes so saved provenance stays concise.

Dashboard reliability behavior:

- Historical Meals are enriched at read time only. Existing Notion nutrition and score properties win; legacy Notes scorecards can backfill quality metadata; exact nutrition totals are never invented.
- `/dashboard` shows compact data confidence indicators for weekly source mix, missing nutrition, backfilled records, and nutrient sample sizes.
- `/settings` Notion schema diagnostics reports optional Meals field gaps and incompatible property types without mutating Notion schema or blocking the app.

Feedback behavior:

- `/feedback`, Today quick actions, and Meal Detail quick actions save to the existing Notion Meal Feedback database through `POST /api/notion/log-feedback`.
- Today and Meal Detail update visible household feedback summaries optimistically after successful feedback saves, then refresh server data when practical.
- Today shows a compact Recent Household Learning strip derived from existing feedback summaries.
- Today undo is client-side only. It restores the local Today view and learning strip but does not delete or reverse Notion history.
- No Notion schema changes are required for the Beta 2 feedback refresh, learning strip, or client-only undo slices.

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

7. Review or edit the analyzed meal fields, then click `Save to Notion`.

8. Confirm the success link opens the new Notion page in the Meals database.
