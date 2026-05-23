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
- `/analyze`
- `/meals`
- `/feedback`
- `/settings`

## Development

```bash
npm install
npm run dev
```

No API keys are required for this scaffold. OpenAI and Notion integrations are intentionally left for the next implementation phase and should stay server-side when added.

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

## Analyze Meal API

Temporary local test example:

```bash
curl -X POST http://localhost:3011/api/analyze-meal \
  -H "Content-Type: application/json" \
  -d '{"recipeText":"Chana masala with chickpeas, tomatoes, onions, garlic, ginger, spices, and basmati rice for dinner."}'
```

This endpoint requires `OPENAI_API_KEY` in `.env.local`.

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
