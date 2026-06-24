/**
 * Usage: npm run backfill:ingredients:dry-run
 *
 * Dry-run reparse/diff tool for saved meals with ingredient rows that currently
 * render as "As needed". It writes NOTHING to Notion and NOTHING to Postgres.
 */
import { existsSync, readFileSync } from "node:fs";
import { emptyMealFeedbackSummary } from "@/src/lib/domain/feedback";
import {
  compareIngredientBackfill,
  ingredientBackfillClassifications,
  type IngredientBackfillClassification,
  type IngredientBackfillComparison,
  type IngredientBackfillRow
} from "@/src/lib/domain/meals/ingredient-backfill";
import { buildMealCookbook } from "@/src/lib/domain/meals/cookbook";
import { basicRecipeParserAdapter } from "@/src/lib/integrations/recipe-parser";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import type { RecipeIngredient } from "@/src/lib/types/recipe";

interface MealBackfillReport {
  meal: MealSummary;
  comparison: IngredientBackfillComparison;
}

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

function summarizeRows(rows: IngredientBackfillRow[]) {
  if (rows.length === 0) {
    return ["    (none)"];
  }

  return rows.map((row, index) => {
    const amount = row.amount || (row.wouldShowAsNeeded ? "As needed" : "");
    const prefix = `${String(index + 1).padStart(2, " ")}.`;
    const display = [amount, row.name].filter(Boolean).join(" ");

    return `    ${prefix} ${display} | raw=${row.rawText}`;
  });
}

function printMealReport(report: MealBackfillReport) {
  const { meal, comparison } = report;

  console.log(`- ${meal.mealName}`);
  console.log(`  mealId: ${meal.id}`);
  console.log(`  sourceUrl: ${meal.sourceUrl ?? "(none)"}`);
  console.log(`  classification: ${comparison.classification}`);
  console.log(`  reason: ${comparison.reason}`);
  console.log(
    `  As needed: ${comparison.beforeAsNeededCount} -> ${comparison.afterAsNeededCount}`
  );
  console.log(
    `  quantified rows: ${comparison.currentQuantifiedCount} -> ${comparison.reparsedQuantifiedCount}`
  );
  console.log(
    `  name overlap: current coverage ${Math.round(
      comparison.currentNameCoverage * 100
    )}%, overall ${Math.round(comparison.nameOverlapRatio * 100)}%`
  );
  console.log(`  ingredient count delta: ${comparison.ingredientCountDelta}`);
  console.log(`  order differs: ${comparison.orderDiffers ? "yes" : "no"}`);
  console.log("  current ingredient rows:");
  console.log(summarizeRows(comparison.currentRows).join("\n"));
  console.log("  reparsed ingredient rows:");
  console.log(summarizeRows(comparison.reparsedRows).join("\n"));
  console.log("");
}

async function buildReportForMeal(meal: MealSummary): Promise<MealBackfillReport> {
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
    return { meal, comparison: initialComparison };
  }

  try {
    const sourceUrl = meal.sourceUrl;
    const parsed = await basicRecipeParserAdapter.parseFromUrl(sourceUrl);
    const reparsedIngredients: RecipeIngredient[] = parsed.ingredients;

    return {
      meal,
      comparison: compareIngredientBackfill({
        mealName: meal.mealName,
        sourceUrl: meal.sourceUrl,
        currentIngredients: cookbook.ingredients,
        reparsedMealName: parsed.name,
        reparsedSourceUrl: parsed.source.sourceUrl,
        reparsedIngredients
      })
    };
  } catch (error) {
    return {
      meal,
      comparison: compareIngredientBackfill({
        mealName: meal.mealName,
        sourceUrl: meal.sourceUrl,
        currentIngredients: cookbook.ingredients,
        parseError: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

function countByClassification(reports: MealBackfillReport[]) {
  const counts = Object.fromEntries(
    ingredientBackfillClassifications.map((classification) => [
      classification,
      0
    ])
  ) as Record<IngredientBackfillClassification, number>;

  for (const report of reports) {
    counts[report.comparison.classification] += 1;
  }

  return counts;
}

async function main() {
  loadEnvLocal();

  console.log("Ingredient backfill dry run (NO WRITES)\n");

  const { meals } = await queryAllMealSummaries();
  const reports: MealBackfillReport[] = [];

  for (const meal of meals) {
    const report = await buildReportForMeal(meal);

    if (report.comparison.beforeAsNeededCount > 0) {
      reports.push(report);
    }
  }

  const counts = countByClassification(reports);
  const sourceUrlRepairCandidates = reports.filter(
    (report) => report.meal.sourceUrl
  ).length;

  console.log("== Summary ==");
  console.log(`  total meals scanned:           ${meals.length}`);
  console.log(`  meals with As Needed rows:     ${reports.length}`);
  console.log(`  sourceUrl repair candidates:   ${sourceUrlRepairCandidates}`);
  console.log(`  SAFE_AUTO_REPAIR:              ${counts.SAFE_AUTO_REPAIR}`);
  console.log(`  NEEDS_MANUAL_REVIEW:           ${counts.NEEDS_MANUAL_REVIEW}`);
  console.log(`  NO_SOURCE_URL:                 ${counts.NO_SOURCE_URL}`);
  console.log(`  PARSE_FAILED:                  ${counts.PARSE_FAILED}`);
  console.log(`  NO_IMPROVEMENT:                ${counts.NO_IMPROVEMENT}`);
  console.log("");

  console.log("== Detailed report ==");
  for (const report of reports) {
    printMealReport(report);
  }

  if (reports.length === 0) {
    console.log("  No meals currently have As Needed ingredient rows.");
  }

  console.log("Dry run complete. No data was written to Postgres or Notion.");
}

main().catch((error) => {
  console.error("Ingredient backfill dry run failed:", error);
  process.exit(1);
});
