# Architectural Decisions

Last updated: 2026-05-23 (session closeout — Analysis Framework v2 complete)

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
