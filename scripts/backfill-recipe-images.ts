/**
 * Usage:
 *   npm run images:backfill
 *   npm run images:backfill -- --write
 *   npm run images:backfill -- --limit 25
 *
 * Dry-run is the default. --write copies/generates images, updates compatible
 * Notion metadata/cover, and refreshes the Postgres mirror row.
 */
import { existsSync, readFileSync } from "node:fs";
import {
  planMealImageResolution,
  resolveMealImageForMeal,
  shouldResolveMealImage
} from "@/src/lib/images/meal-image-resolver";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

function loadEnvLocal() {
  if (!existsSync(".env.local")) {
    return;
  }

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

function parseArgs(argv: string[]) {
  const args = {
    write: false,
    limit: Number.POSITIVE_INFINITY,
    meal: null as string | null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--write") {
      args.write = true;
      continue;
    }

    if (arg === "--limit") {
      const limit = Number(argv[index + 1]);
      args.limit = Number.isFinite(limit) && limit > 0 ? limit : args.limit;
      index += 1;
      continue;
    }

    if (arg === "--meal") {
      args.meal = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

function shouldSkipMeal(meal: MealSummary) {
  if (meal.imageSource === "manual") {
    return "manual image";
  }

  if (!shouldResolveMealImage(meal)) {
    return "already has image";
  }

  return null;
}

async function main() {
  loadEnvLocal();

  const args = parseArgs(process.argv.slice(2));
  const { meals } = await queryAllMealSummaries();
  const selectedMeals = args.meal
    ? meals.filter(
        (meal) =>
          meal.id === args.meal ||
          meal.mealName.toLowerCase().includes(args.meal!.toLowerCase())
      )
    : meals;
  const candidates = selectedMeals
    .map((meal) => ({ meal, skipReason: shouldSkipMeal(meal) }))
    .filter(({ skipReason }) => !skipReason)
    .slice(0, args.limit);

  console.log(
    `Recipe image backfill: ${args.write ? "WRITE" : "DRY RUN"} mode. ${candidates.length} candidate(s).`
  );

  let updated = 0;
  let failed = 0;

  for (const { meal } of candidates) {
    console.log(`- ${meal.mealName} (${meal.id})`);

    try {
      if (!args.write) {
        const plan = await planMealImageResolution(meal);
        console.log(
          plan.strategy === "original"
            ? `  Would copy original image: ${plan.originalImageUrl}`
            : `  Would generate AI image. Prompt: ${plan.prompt}`
        );
        continue;
      }

      const { metadata, strategy } = await resolveMealImageForMeal(meal);
      updated += 1;
      console.log(
        `  Updated via ${strategy}: ${metadata.imageStatus}${
          metadata.imageUrl ? ` ${metadata.imageUrl}` : ""
        }`
      );
    } catch (error) {
      failed += 1;
      console.error(`  Failed: ${String(error)}`);
    }
  }

  const skipped = selectedMeals.length - candidates.length;
  console.log(
    `Done. Updated ${updated}; failed ${failed}; skipped ${skipped}; mode ${
      args.write ? "write" : "dry-run"
    }.`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Recipe image backfill failed:", error);
  process.exit(1);
});
