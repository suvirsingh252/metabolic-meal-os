/**
 * Usage: tsx scripts/check-db.ts
 *
 * Verifies that DATABASE_URL is reachable, expected public tables exist, and
 * Drizzle migration state matches the local migration journal.
 * Reads metadata only. Does not read or write application data.
 *
 * This script is intentionally excluded from the test suite and build.
 * Run it manually after applying a migration or when diagnosing connectivity.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const expectedPublicTables = [
  "dinner_feedback",
  "grocery_list_items",
  "grocery_lists",
  "meals",
  "weekly_dinner_plans"
];

type MigrationJournal = {
  entries?: Array<{ tag?: string }>;
};

function getLocalMigrationTags() {
  const journalPath = join(process.cwd(), "drizzle", "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournal;

  return (journal.entries ?? [])
    .map((entry) => entry.tag)
    .filter((tag): tag is string => Boolean(tag));
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  let hasFailure = false;

  function fail(message: string) {
    hasFailure = true;
    console.error("✗", message);
  }

  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local or the shell environment.");
    process.exit(1);
  }

  const sql = neon(url);

  // A lightweight connectivity probe — no app data read or written.
  const [row] = await sql`SELECT current_database() AS db, now() AS ts`;
  console.log("✓ Connected to Neon database:", row.db, "at", row.ts);

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  if (tables.length === 0) {
    fail("No public tables found. Run: npm run db:migrate");
  } else {
    const tableNames = tables.map((table) => String(table.table_name));
    const tableSet = new Set(tableNames);
    const missingTables = expectedPublicTables.filter((table) => !tableSet.has(table));

    console.log("✓ Public tables:", tableNames.join(", "));

    if (missingTables.length > 0) {
      fail(`Missing expected public tables: ${missingTables.join(", ")}`);
    }
  }

  const migrationTables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'drizzle'
      AND table_name = '__drizzle_migrations'
  `;

  if (migrationTables.length === 0) {
    fail("Drizzle migration table drizzle.__drizzle_migrations is missing. Run: npm run db:migrate");
  } else {
    const [migrationState] = await sql`
      SELECT count(*)::int AS count, max(created_at) AS latest_created_at
      FROM drizzle.__drizzle_migrations
    `;
    const appliedCount = Number(migrationState.count);
    const latestCreatedAt = migrationState.latest_created_at;
    const localMigrationTags = getLocalMigrationTags();

    console.log(
      "✓ Drizzle migrations:",
      `${appliedCount}/${localMigrationTags.length} applied`,
      latestCreatedAt ? `(latest created_at: ${latestCreatedAt})` : ""
    );

    if (appliedCount < localMigrationTags.length) {
      const pendingTags = localMigrationTags.slice(appliedCount);
      fail(`Pending local migrations not recorded in database: ${pendingTags.join(", ")}`);
    }

    if (appliedCount > localMigrationTags.length) {
      fail(
        `Database has ${appliedCount} migration records but local journal has ${localMigrationTags.length}. Check branch/drizzle history before continuing.`
      );
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("✗ Database connection failed:", error);
  process.exit(1);
});
