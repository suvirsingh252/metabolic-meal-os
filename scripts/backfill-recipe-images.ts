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
import { basicRecipeParserAdapter } from "@/src/lib/integrations/recipe-parser";
import {
  buildAiRecipeImageMetadata,
  buildOriginalRecipeImageMetadata,
  buildRecipeImagePrompt,
  type RecipeImageContext
} from "@/src/lib/images/recipe-image-pipeline";
import { updateMealImageMetadata } from "@/src/lib/images/meal-image-persistence";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { MealImageMetadata } from "@/src/lib/types/meal";
import type { RecipeIngredient } from "@/src/lib/types/recipe";

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

function hasUsableImage(meal: MealSummary) {
  return Boolean(meal.imageUrl && meal.imageStatus === "ready");
}

function shouldSkipMeal(meal: MealSummary) {
  if (meal.imageSource === "manual") {
    return "manual image";
  }

  if (hasUsableImage(meal)) {
    return "already has image";
  }

  return null;
}

function parseIngredientLines(meal: MealSummary): RecipeIngredient[] {
  const text = meal.ingredientsText ?? "";

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 60)
    .map((rawText) => ({ rawText }));
}

function parseInstructionLines(meal: MealSummary) {
  const text = meal.instructionsText ?? "";

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
}

function buildContext(
  meal: MealSummary,
  originalImageUrl: string | null
): RecipeImageContext {
  return {
    title: meal.mealName,
    cuisine: meal.cuisine,
    ingredients: parseIngredientLines(meal),
    instructions: parseInstructionLines(meal),
    dietaryTags: [
      meal.mealType ?? "",
      meal.proteinLevel ? `${meal.proteinLevel} protein` : "",
      meal.weeknightFriendly ? "weeknight friendly" : "",
      meal.comfortMeal ? "comfort meal" : ""
    ].filter(Boolean),
    platingContext: meal.optimizedVersion ?? meal.notes,
    sourceName: meal.sourceName,
    sourceUrl: meal.sourceUrl,
    originalImageUrl
  };
}

async function findOriginalImageUrl(meal: MealSummary) {
  if (meal.imageOriginalUrl) {
    return meal.imageOriginalUrl;
  }

  if (!meal.sourceUrl) {
    return null;
  }

  const parsed = await basicRecipeParserAdapter.parseFromUrl(meal.sourceUrl);

  return parsed.image?.url ?? parsed.canonicalRecipe?.image?.url ?? null;
}

async function buildImageMetadataForMeal(
  meal: MealSummary
): Promise<{ metadata: MealImageMetadata; strategy: "original" | "ai" }> {
  const originalImageUrl = await findOriginalImageUrl(meal);

  if (originalImageUrl) {
    const original = await buildOriginalRecipeImageMetadata(
      buildContext(meal, originalImageUrl)
    );

    if (original) {
      return { metadata: original, strategy: "original" };
    }
  }

  const ai = await buildAiRecipeImageMetadata(buildContext(meal, null));

  return { metadata: ai, strategy: "ai" };
}

async function planImageMetadataForMeal(meal: MealSummary) {
  const originalImageUrl = await findOriginalImageUrl(meal).catch((error) => {
    console.warn(`  Original image lookup failed: ${String(error)}`);
    return null;
  });

  if (originalImageUrl) {
    return {
      strategy: "original" as const,
      prompt: null,
      originalImageUrl
    };
  }

  return {
    strategy: "ai" as const,
    prompt: buildRecipeImagePrompt(buildContext(meal, null)),
    originalImageUrl: null
  };
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
        const plan = await planImageMetadataForMeal(meal);
        console.log(
          plan.strategy === "original"
            ? `  Would copy original image: ${plan.originalImageUrl}`
            : `  Would generate AI image. Prompt: ${plan.prompt}`
        );
        continue;
      }

      const { metadata, strategy } = await buildImageMetadataForMeal(meal);
      await updateMealImageMetadata(meal, metadata);
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
