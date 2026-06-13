import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/src/lib/db/schema";

function getDatabaseUrl(): string {
  if (typeof window !== "undefined") {
    throw new Error("Database client must only be used server-side.");
  }

  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "Missing required server environment variable: DATABASE_URL. Add it to .env.local."
    );
  }

  return url;
}

export function getDbClient() {
  const sql = neon(getDatabaseUrl());
  return drizzle(sql, { schema });
}

export type DbClient = ReturnType<typeof getDbClient>;
