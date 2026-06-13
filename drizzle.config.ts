import { defineConfig } from "drizzle-kit";

// drizzle.config.ts is used only by drizzle-kit CLI commands (generate, migrate,
// push, studio). It is never imported by the Next.js runtime.
//
// DATABASE_URL must be set in .env.local for local commands.
// In CI/production, pass it via the shell environment or Vercel env vars.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
