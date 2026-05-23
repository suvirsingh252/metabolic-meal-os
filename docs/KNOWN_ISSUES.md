# Known Issues

Last updated: 2026-05-23

## Critical

- [ ] Real-looking OpenAI and Notion secrets were found in `.env.example` during documentation setup and were scrubbed. Rotate those keys before pushing to GitHub or deploying.

## Bugs

- [ ] In-app browser localhost testing has sometimes been blocked by `net::ERR_BLOCKED_BY_CLIENT`; use command-line checks or a normal browser if this recurs.
- [ ] Multiple Next dev servers can remain running on alternate ports after interrupted sessions; check with `lsof -ti :3011` or inspect `.next/dev/logs`.

## Technical Debt

- [ ] `getServerEnv()` validates all env vars globally. Consider route-specific env helpers if partial deployments become painful.
- [ ] API validators duplicate helpers such as `isRecord`, `isEnumValue`, and `validationError`.
- [ ] Client pages duplicate local `EnumSelect` and `BooleanInput` helpers.
- [ ] Notion `getNotionPageUrl` helper is duplicated across API routes.
- [ ] No automated tests yet.
- [ ] No deployment smoke test script yet.

## UX Problems

- [ ] Analyze, save, and feedback flows are functional but plain.
- [ ] Meals page has no filtering or search yet.
- [ ] Feedback is not related to a saved meal yet.
- [ ] Success/error UI patterns are not fully standardized.

## Future Migrations

- [ ] Add authentication before wider public sharing.
- [ ] Add PWA manifest and mobile home-screen support.
- [ ] Consider replacing Notion with a dedicated database if relational querying, permissions, or performance require it.
- [ ] Consider provider abstractions for AI and storage after workflows stabilize.

## Temporary Implementations

- [ ] Notion is the only persistence layer.
- [ ] Ingredient suggestions are displayed but not saved.
- [ ] Weekly Plans, Ingredients, and Meal Templates database IDs exist but are not fully used.
- [ ] Deployment documentation exists, but actual Vercel deployment remains to be verified.
