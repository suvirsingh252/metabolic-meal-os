import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { normalizeIngredientListWithStats, parseRecipeIngredientText } from "@/src/lib/ingredients";
import {
  hasCompleteRecommendationIngredients,
  hasCompleteRecommendationNutrition,
  isDemoReadyRecommendationMeal
} from "@/src/lib/domain/recommendations/demo-readiness";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { RecommendationMeal } from "@/src/lib/domain/recommendations/types";

const REPORT_PATH = "docs/INVESTOR_DEMO_READINESS.md";

type MetadataField =
  | "cuisine"
  | "mealType"
  | "prepTime"
  | "cookTime"
  | "servings"
  | "nutrition"
  | "description"
  | "tags";

const metadataLabels: Record<MetadataField, string> = {
  cuisine: "Cuisine",
  mealType: "Meal type",
  prepTime: "Prep time",
  cookTime: "Cook time",
  servings: "Servings",
  nutrition: "Nutrition",
  description: "Description",
  tags: "Tags"
};

const unsupportedMetadataFields = new Set<MetadataField>([
  "prepTime",
  "cookTime",
  "servings"
]);

function loadEnvFileIfPresent(path: string) {
  let contents = "";

  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
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

    if (value && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function percent(count: number, total: number) {
  if (total === 0) {
    return "0.0%";
  }

  return `${((count / total) * 100).toFixed(1)}%`;
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function nutritionFieldCount(meal: MealSummary) {
  return [
    meal.calories,
    meal.proteinG,
    meal.carbohydratesG,
    meal.fatG,
    meal.fiberG,
    meal.sodiumMg,
    meal.sugarG
  ].filter((value) => typeof value === "number").length;
}

function hasNutrition(meal: MealSummary) {
  return nutritionFieldCount(meal) > 0;
}

function hasDescription(meal: MealSummary) {
  return hasText(meal.optimizedVersion) || hasText(meal.notes);
}

function hasTags(meal: MealSummary) {
  return [
    meal.proteinLevel,
    meal.satietyLevel,
    meal.bloodSugarImpact,
    meal.effortLevel,
    meal.familyApproved ? "Family Approved" : null,
    meal.weeknightFriendly ? "Weeknight Friendly" : null,
    meal.comfortMeal ? "Comfort Meal" : null
  ].some(hasText);
}

function hasMetadataField(meal: MealSummary, field: MetadataField) {
  switch (field) {
    case "cuisine":
      return hasText(meal.cuisine);
    case "mealType":
      return hasText(meal.mealType);
    case "nutrition":
      return hasNutrition(meal);
    case "description":
      return hasDescription(meal);
    case "tags":
      return hasTags(meal);
    case "prepTime":
    case "cookTime":
    case "servings":
      return false;
  }
}

function ingredientLines(meal: MealSummary) {
  return (meal.ingredientsText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function auditIngredients(meal: MealSummary) {
  const lines = ingredientLines(meal);
  const parsed = lines.map((line) => ({ line, parsed: parseRecipeIngredientText(line) }));
  const normalized = normalizeIngredientListWithStats(lines);
  const duplicateNames = new Map<string, number>();

  for (const ingredient of normalized.ingredients) {
    duplicateNames.set(ingredient.key, (duplicateNames.get(ingredient.key) ?? 0) + 1);
  }

  const toTasteCount = lines.filter((line) => /\bto taste\b/i.test(line)).length;
  const asNeededCount = lines.filter((line) => /\bas needed\b/i.test(line)).length;
  const malformedCount =
    normalized.malformedCount +
    parsed.filter(({ parsed: parsedLine }) => parsedLine === null).length;
  const parserFailureCount = parsed.filter(
    ({ line, parsed: parsedLine }) =>
      parsedLine !== null &&
      /^\d/.test(line) &&
      parsedLine.quantity === null &&
      parsedLine.unit === null
  ).length;
  const inconsistentUnits = parsed.filter(
    ({ parsed: parsedLine }) =>
      parsedLine?.quantity !== null && parsedLine?.unit === null
  ).length;

  return {
    lineCount: lines.length,
    duplicateCount: normalized.duplicateCount,
    inconsistentUnits,
    toTasteCount,
    asNeededCount,
    malformedCount,
    parserFailureCount,
    complete: hasCompleteRecommendationIngredients(meal)
  };
}

function toRecommendationMeal(meal: MealSummary): RecommendationMeal {
  return {
    id: meal.id,
    url: meal.url,
    imageUrl: meal.imageUrl,
    mealName: meal.mealName,
    createdAt: meal.createdAt,
    cuisine: meal.cuisine,
    mealType: meal.mealType,
    familyApproved: meal.familyApproved,
    weeknightFriendly: meal.weeknightFriendly,
    comfortMeal: meal.comfortMeal,
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbohydratesG: meal.carbohydratesG,
    fatG: meal.fatG,
    fiberG: meal.fiberG,
    qualityScore: meal.qualityScore,
    proteinLevel: meal.proteinLevel,
    satietyLevel: meal.satietyLevel,
    bloodSugarImpact: meal.bloodSugarImpact,
    effortLevel: meal.effortLevel,
    notes: meal.notes,
    ingredientsText: meal.ingredientsText,
    instructionsText: meal.instructionsText,
    metabolicScore: meal.metabolicScore,
    proteinScore: meal.proteinScore,
    fiberScore: meal.fiberScore,
    satietyScoreNumeric: meal.satietyScoreNumeric,
    bloodSugarRiskScore: meal.bloodSugarRiskScore
  };
}

function demoScore(meal: MealSummary) {
  let score = 0;

  if (meal.imageUrl) score += 25;
  if (meal.cuisine) score += 10;
  if (meal.mealType) score += 10;
  if (hasDescription(meal)) score += 10;
  if (hasTags(meal)) score += 8;
  if (hasCompleteRecommendationNutrition(meal)) score += 20;
  if (hasCompleteRecommendationIngredients(meal)) score += 15;
  if (meal.weeknightFriendly) score += 4;
  if (meal.familyApproved) score += 4;
  if (typeof meal.qualityScore === "number") score += Math.min(10, meal.qualityScore / 10);

  return score;
}

function formatIssueList(meals: MealSummary[], predicate: (meal: MealSummary) => boolean) {
  const names = meals.filter(predicate).map((meal) => meal.mealName).slice(0, 12);

  return names.length > 0 ? names.join(", ") : "None detected";
}

function buildReport(meals: MealSummary[], generatedAt: string) {
  const totalRecipes = meals.length;
  const recipesWithImages = meals.filter((meal) => hasText(meal.imageUrl)).length;
  const recipesWithoutImages = totalRecipes - recipesWithImages;
  const metadataFields = Object.keys(metadataLabels) as MetadataField[];
  const metadataRows = metadataFields.map((field) => {
    const complete = meals.filter((meal) => hasMetadataField(meal, field)).length;
    const note = unsupportedMetadataFields.has(field)
      ? "No persisted field available in current MealSummary schema"
      : "";

    return `| ${metadataLabels[field]} | ${complete}/${totalRecipes} | ${percent(complete, totalRecipes)} | ${note} |`;
  });
  const ingredientAudits = meals.map((meal) => ({ meal, audit: auditIngredients(meal) }));
  const ingredientComplete = ingredientAudits.filter(({ audit }) => audit.complete).length;
  const demoCandidates = meals
    .filter((meal) => isDemoReadyRecommendationMeal(toRecommendationMeal(meal)))
    .sort((left, right) => {
      const scoreDelta = demoScore(right) - demoScore(left);
      return scoreDelta !== 0 ? scoreDelta : left.mealName.localeCompare(right.mealName);
    })
    .slice(0, 20);
  const ingredientIssueCount = ingredientAudits.filter(
    ({ audit }) =>
      audit.duplicateCount > 0 ||
      audit.inconsistentUnits > 0 ||
      audit.toTasteCount > 0 ||
      audit.asNeededCount > 0 ||
      audit.malformedCount > 0 ||
      audit.parserFailureCount > 0
  ).length;

  return `# Investor Demo Readiness

Generated: ${generatedAt}

## Recipe Totals

| Metric | Count |
| --- | ---: |
| Total recipes | ${totalRecipes} |
| Recipes with images | ${recipesWithImages} |
| Recipes without images | ${recipesWithoutImages} |
| Image coverage | ${percent(recipesWithImages, totalRecipes)} |

Image coverage before/after: ${percent(recipesWithImages, totalRecipes)} / ${percent(recipesWithImages, totalRecipes)}. This report is an audit snapshot; run \`npm run images:backfill -- --write\` with valid Notion/OpenAI credentials to execute the existing image backfill pipeline.

## Metadata Completeness

| Field | Complete | Coverage | Notes |
| --- | ---: | ---: | --- |
${metadataRows.join("\n")}

No deterministic metadata fills were applied by this audit. Missing prep time, cook time, and servings cannot be filled without adding or mapping persisted fields.

## Ingredient Quality

| Metric | Count |
| --- | ---: |
| Recipes with complete normalized ingredients | ${ingredientComplete}/${totalRecipes} |
| Recipes with any ingredient issue | ${ingredientIssueCount} |
| Duplicate ingredient entries | ${ingredientAudits.reduce((sum, item) => sum + item.audit.duplicateCount, 0)} |
| Inconsistent quantity/unit lines | ${ingredientAudits.reduce((sum, item) => sum + item.audit.inconsistentUnits, 0)} |
| "to taste" lines | ${ingredientAudits.reduce((sum, item) => sum + item.audit.toTasteCount, 0)} |
| "as needed" lines | ${ingredientAudits.reduce((sum, item) => sum + item.audit.asNeededCount, 0)} |
| Malformed ingredient lines | ${ingredientAudits.reduce((sum, item) => sum + item.audit.malformedCount, 0)} |
| Parser failure suspects | ${ingredientAudits.reduce((sum, item) => sum + item.audit.parserFailureCount, 0)} |

Original recipe text is preserved. The audit uses the existing ingredient parser and normalizer for diagnostics only.

## Top Demo Recipes

${demoCandidates.length > 0
    ? demoCandidates
        .map(
          (meal, index) =>
            `${index + 1}. ${meal.mealName} (${[meal.cuisine, meal.mealType].filter(Boolean).join(", ") || "metadata incomplete"})`
        )
        .join("\n")
    : "No recipes currently satisfy the demo recommendation gate: image, cuisine, meal type, complete normalized ingredients, and calories/protein/carbs/fat/fiber."}

## Remaining Issues

- Missing images: ${formatIssueList(meals, (meal) => !hasText(meal.imageUrl))}
- Missing cuisine: ${formatIssueList(meals, (meal) => !hasText(meal.cuisine))}
- Missing meal type: ${formatIssueList(meals, (meal) => !hasText(meal.mealType))}
- Missing nutrition: ${formatIssueList(meals, (meal) => !hasNutrition(meal))}
- Incomplete ingredients: ${formatIssueList(meals, (meal) => !hasCompleteRecommendationIngredients(meal))}

## Recommendation Quality

Today and Dinner Concierge recommendations now use only demo-ready recipes: image present, cuisine and meal type present, complete normalized ingredients, and complete top-line nutrition.

## Known Limitations

- This audit depends on live Notion access through \`NOTION_API_KEY\` and \`NOTION_MEALS_DATABASE_ID\`.
- Prep time, cook time, and servings are not currently exposed by \`MealSummary\`, so they are reported as unavailable rather than inferred.
- The image backfill pipeline can only improve coverage when source image metadata is recoverable or AI image generation/storage credentials are configured.
- Ingredient normalization is diagnostic here; original recipe text is intentionally preserved.
`;
}

function buildBlockedReport(error: unknown, generatedAt: string) {
  return `# Investor Demo Readiness

Generated: ${generatedAt}

## Status

The live recipe corpus audit could not run in this checkout.

Reason: ${String(error instanceof Error ? error.message : error)}

## Recipe Totals

| Metric | Count |
| --- | ---: |
| Total recipes | unavailable |
| Recipes with images | unavailable |
| Recipes without images | unavailable |
| Image coverage | unavailable |

## Remaining Issues

- Valid Notion credentials are required to audit stored recipes.
- Run \`npm run investor-demo:audit\` after configuring \`NOTION_API_KEY\` and \`NOTION_MEALS_DATABASE_ID\`.
- Run \`npm run images:backfill -- --write\` to execute the existing image backfill pipeline.

## Recommendation Quality

Today and Dinner Concierge recommendations are gated to demo-ready recipes in code, even though this report could not inspect the live corpus.

## Known Limitations

- Prep time, cook time, and servings are not currently exposed by \`MealSummary\`.
- No live image coverage before/after can be computed without corpus access.
`;
}

async function main() {
  loadEnvFileIfPresent(".env.local");
  loadEnvFileIfPresent(".env.vercel.production.local");

  const generatedAt = new Date().toISOString();
  let report: string;

  try {
    const { meals } = await queryAllMealSummaries();
    report = buildReport(meals, generatedAt);
  } catch (error) {
    report = buildBlockedReport(error, generatedAt);
    process.exitCode = 1;
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, report);
  console.log(`Wrote ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
