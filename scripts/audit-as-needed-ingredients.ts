/**
 * Usage: npm run audit:as-needed-ingredients
 *
 * Read-only audit for saved meal ingredient rows that currently have no parsed
 * quantity/unit and would display as "As needed" in meal detail.
 *
 * It writes NOTHING to Notion and NOTHING to Postgres.
 */
import { existsSync, readFileSync } from "node:fs";
import { emptyMealFeedbackSummary } from "@/src/lib/domain/feedback";
import {
  buildMealCookbook,
  formatCookbookIngredientAmount
} from "@/src/lib/domain/meals/cookbook";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";

interface AuditRow {
  mealId: string;
  mealName: string;
  sourceUrl: string | null;
  ingredientName: string;
  rawText: string;
}

function isBareAsNeededRow(row: { name: string; rawText: string }) {
  return row.name.trim().toLowerCase() === row.rawText.trim().toLowerCase();
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

async function main() {
  loadEnvLocal();

  console.log("As-needed ingredient audit (DRY RUN - no writes)\n");

  const { meals } = await queryAllMealSummaries();
  const asNeededRows: AuditRow[] = [];
  const unknownAmountWithRawRows: AuditRow[] = [];
  let mealsWithCookbookIngredients = 0;
  let totalIngredientRows = 0;

  for (const meal of meals) {
    const cookbook = buildMealCookbook(meal, emptyMealFeedbackSummary(meal.id));

    if (cookbook.ingredients.length > 0) {
      mealsWithCookbookIngredients += 1;
    }

    for (const ingredient of cookbook.ingredients) {
      totalIngredientRows += 1;

      if (formatCookbookIngredientAmount(ingredient)) {
        continue;
      }

      const row = {
        mealId: meal.id,
        mealName: meal.mealName,
        sourceUrl: meal.sourceUrl,
        ingredientName: ingredient.name,
        rawText: ingredient.rawText
      };

      if (isBareAsNeededRow(ingredient)) {
        asNeededRows.push(row);
      } else {
        unknownAmountWithRawRows.push(row);
      }
    }
  }

  console.log("== Summary ==");
  console.log(`  meals scanned:                         ${meals.length}`);
  console.log(
    `  meals with cookbook ingredients:       ${mealsWithCookbookIngredients}`
  );
  console.log(`  ingredient rows scanned:               ${totalIngredientRows}`);
  console.log(`  rows that would show As needed:        ${asNeededRows.length}`);
  console.log(
    `  rows with raw text but unknown amount: ${unknownAmountWithRawRows.length}`
  );
  console.log("");

  console.log("== As needed rows ==");
  for (const row of asNeededRows) {
    console.log(
      [
        `- ${row.mealName}`,
        `mealId=${row.mealId}`,
        `ingredient=${row.ingredientName}`,
        `source=${row.sourceUrl ?? "(none)"}`,
        `raw=${row.rawText || "(none)"}`
      ].join(" | ")
    );
  }

  if (asNeededRows.length === 0) {
    console.log("  None");
  }

  console.log("");
  console.log("== Unknown amount rows with preserved raw text ==");
  for (const row of unknownAmountWithRawRows) {
    console.log(
      [
        `- ${row.mealName}`,
        `mealId=${row.mealId}`,
        `ingredient=${row.ingredientName}`,
        `source=${row.sourceUrl ?? "(none)"}`,
        `raw=${row.rawText || "(none)"}`
      ].join(" | ")
    );
  }

  if (unknownAmountWithRawRows.length === 0) {
    console.log("  None");
  }

  console.log("");
  console.log("Dry run complete. No data was written to Postgres or Notion.");
}

main().catch((error) => {
  console.error("As-needed ingredient audit failed:", error);
  process.exit(1);
});
