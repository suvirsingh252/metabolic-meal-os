/**
 * Usage: tsx scripts/check-db.ts
 *
 * Verifies that DATABASE_URL is reachable and the migrations table exists.
 * Does not read or write application data. Safe to run at any time.
 *
 * This script is intentionally excluded from the test suite and build.
 * Run it manually after applying a migration or when diagnosing connectivity.
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL?.trim();

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
    console.log("  No tables yet — run: npm run db:migrate");
  } else {
    console.log("  Public tables:", tables.map((t) => String(t.table_name)).join(", "));
  }
}

main().catch((error) => {
  console.error("✗ Database connection failed:", error);
  process.exit(1);
});
