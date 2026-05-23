# Architectural Decisions

Last updated: 2026-05-23

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
