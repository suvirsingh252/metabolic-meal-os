/**
 * Usage: npm run backfill:ingredients:review
 *
 * Exports a local Markdown review artifact for ingredient backfill candidates.
 * It writes only tmp/ingredient-backfill-review.md and writes NOTHING to Notion
 * or Postgres.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { emptyMealFeedbackSummary } from "@/src/lib/domain/feedback";
import {
  compareIngredientBackfill,
  renderIngredientBackfillReviewMarkdown,
  type IngredientBackfillReviewItem
} from "@/src/lib/domain/meals/ingredient-backfill";
import { buildMealCookbook } from "@/src/lib/domain/meals/cookbook";
import { basicRecipeParserAdapter } from "@/src/lib/integrations/recipe-parser";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";

const outputPath = "tmp/ingredient-backfill-review.md";

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

async function buildReviewItem(meal: MealSummary): Promise<IngredientBackfillReviewItem | null> {
  const cookbook = buildMealCookbook(meal, emptyMealFeedbackSummary(meal.id));
  const initialComparison = compareIngredientBackfill({
    mealName: meal.mealName,
    sourceUrl: meal.sourceUrl,
    currentIngredients: cookbook.ingredients
  });

  if (
    initialComparison.beforeAsNeededCount === 0 ||
    initialComparison.classification === "NO_SOURCE_URL" ||
    !meal.sourceUrl
  ) {
    return null;
  }

  try {
    const parsed = await basicRecipeParserAdapter.parseFromUrl(meal.sourceUrl);
    const comparison = compareIngredientBackfill({
      mealName: meal.mealName,
      sourceUrl: meal.sourceUrl,
      currentIngredients: cookbook.ingredients,
      reparsedMealName: parsed.name,
      reparsedSourceUrl: parsed.source.sourceUrl,
      reparsedIngredients: parsed.ingredients
    });

    if (comparison.classification !== "NEEDS_MANUAL_REVIEW") {
      return null;
    }

    return {
      meal: {
        id: meal.id,
        mealName: meal.mealName,
        sourceUrl: meal.sourceUrl
      },
      comparison
    };
  } catch {
    return null;
  }
}

async function main() {
  loadEnvLocal();

  console.log("Ingredient backfill review export (NO DATA MUTATION)");

  const { meals } = await queryAllMealSummaries();
  const reviewItems: IngredientBackfillReviewItem[] = [];

  for (const meal of meals) {
    const item = await buildReviewItem(meal);

    if (item) {
      reviewItems.push(item);
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    renderIngredientBackfillReviewMarkdown(reviewItems),
    "utf8"
  );

  console.log(`Meals scanned: ${meals.length}`);
  console.log(`Manual review meals exported: ${reviewItems.length}`);
  for (const item of reviewItems) {
    console.log(`- ${item.meal.mealName}`);
  }
  console.log(`Review file: ${outputPath}`);
  console.log("No Notion or Postgres data was mutated.");
}

main().catch((error) => {
  console.error("Ingredient backfill review export failed:", error);
  process.exit(1);
});
