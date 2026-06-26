# Database Migration Runbook

Last updated: 2026-06-26

This is the supported process for Postgres/Drizzle migrations. Do not start a
schema change unless this process can be followed for the target database.

## Scope

- Applies to Postgres schema changes generated from `src/lib/db/schema.ts`.
- Uses committed Drizzle migration files in `drizzle/`.
- Does not start or imply a Notion-to-Postgres migration.
- Does not replace Notion as the saved meal archive.

## DATABASE_URL Source

`DATABASE_URL` must be the direct connection string for the database being
checked or migrated.

Local and preview checks:
- Put the target value in `.env.local`, or export it in the shell before running
  commands.
- `.env.local` is ignored and must never be committed.

Production:
- Use the production database connection string from the database provider or
  Vercel Project Settings for the production environment.
- Confirm the value points at the intended production database before running
  `db:migrate`.
- `vercel env pull` and `vercel env run -e production` can show encrypted
  sensitive values as empty locally. Do not treat an empty local pull as proof
  that production runtime has no value.

## Supported Commands

Check the target database:

```bash
npm run db:check
```

`db:check` is metadata-only. It verifies:
- `DATABASE_URL` is set and reachable.
- The expected public application tables exist.
- `drizzle.__drizzle_migrations` exists.
- The applied Drizzle migration count matches the local migration journal.

Apply pending migrations:

```bash
npm run db:migrate
```

Verify after migration:

```bash
npm run db:check
```

Expected verification result:
- Connection succeeds.
- Public tables include `meals`, `dinner_feedback`, `grocery_lists`,
  `grocery_list_items`, and `weekly_dinner_plans`.
- Drizzle reports all local migrations applied.

## Normal Migration Flow

1. Confirm the target environment and `DATABASE_URL`.
2. Review the generated SQL in `drizzle/`.
3. Run `npm run db:check`.
4. If `db:check` fails only because expected tables or migration state are
   missing, confirm this is the intended target before continuing.
5. Run `npm run db:migrate`.
6. Run `npm run db:check` again.
7. Smoke-test the affected app route or API endpoint.
8. Record the command results and target environment in the handoff docs.

## Production Safety

- Run production migrations from a desktop/operator environment where the full
  command, target, and diff can be reviewed.
- Do not run production migrations from phone/mobile SSH.
- Do not run `drizzle-kit push` in production. Use generated migrations and
  `npm run db:migrate`.
- Do not run migrations from Vercel request handlers as the normal path.
- Do not deploy feature code that requires an unapplied migration.
- If `db:check` shows the database is ahead of the local journal, stop and
  reconcile branch/drizzle history before continuing.

## Emergency-Only Runtime Routes

Temporary runtime migration routes were used as an emergency recovery path for
Planner V2. They are not the supported process.

Only consider an emergency runtime route when:
- production is broken because a migration cannot be applied by the supported
  command path,
- the route is narrowly scoped to one reviewed migration operation,
- access is explicitly protected,
- the route is removed immediately after recovery, and
- the incident is documented in handoff notes.

The normal process remains: set `DATABASE_URL`, run `npm run db:migrate`, then
verify with `npm run db:check`.
