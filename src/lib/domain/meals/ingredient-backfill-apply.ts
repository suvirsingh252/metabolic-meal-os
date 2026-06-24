import { emptyMealFeedbackSummary } from "@/src/lib/domain/feedback";
import {
  cookbookIngredientToBackfillRow,
  type IngredientBackfillReplacementPayload
} from "@/src/lib/domain/meals/ingredient-backfill";
import { buildMealCookbook } from "@/src/lib/domain/meals/cookbook";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { RecipeIngredient } from "@/src/lib/types/recipe";

export const ingredientBackfillConfirmationPhrase = "APPLY INGREDIENT BACKFILL";

export interface IngredientBackfillApplyInput {
  mealIdentifier?: string | null;
  payload?: IngredientBackfillReplacementPayload | null;
  write?: boolean;
  confirmation?: string | null;
}

export interface IngredientBackfillApplyDeps {
  queryMeals(): Promise<MealSummary[]>;
  updateNotionIngredients(input: {
    meal: MealSummary;
    ingredients: RecipeIngredient[];
  }): Promise<MealSummary>;
  refreshPostgresMirror(input: { meal: MealSummary }): Promise<void>;
}

export interface IngredientBackfillApplyResult {
  status: "aborted" | "dry_run" | "applied";
  reason: string;
  meal?: MealSummary;
  before: RecipeIngredient[];
  after: RecipeIngredient[];
}

const approvedCheckboxPattern = /- \[[xX]\] Approve this exact replacement payload/;

export function parseApprovedIngredientBackfillPayloadSource(
  content: string
): IngredientBackfillReplacementPayload | null {
  try {
    return JSON.parse(content) as IngredientBackfillReplacementPayload;
  } catch {
    // Continue with the review Markdown parser below.
  }

  const sections = content
    .split(/\n(?=## \d+\. )/)
    .filter((section) => approvedCheckboxPattern.test(section));

  if (sections.length === 0) {
    return null;
  }

  if (sections.length > 1) {
    throw new Error("More than one approved ingredient replacement section was found.");
  }

  const jsonMatch = sections[0].match(/```json\n([\s\S]*?)\n```/);

  if (!jsonMatch) {
    throw new Error("Approved ingredient replacement section does not contain JSON.");
  }

  return {
    ...(JSON.parse(jsonMatch[1]) as IngredientBackfillReplacementPayload),
    approved: true
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeIngredientForCompare(ingredient: RecipeIngredient) {
  return {
    rawText: ingredient.rawText.trim(),
    name: ingredient.name?.trim() || null,
    quantity:
      ingredient.quantity === null || ingredient.quantity === undefined
        ? null
        : String(ingredient.quantity).trim() || null,
    unit: ingredient.unit?.trim() || null
  };
}

function normalizeCurrentMealIngredients(meal: MealSummary): RecipeIngredient[] {
  const cookbook = buildMealCookbook(meal, emptyMealFeedbackSummary(meal.id));

  return cookbook.ingredients.map((ingredient) => {
    const row = cookbookIngredientToBackfillRow(ingredient);

    return {
      rawText: row.rawText,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit
    };
  });
}

function ingredientsMatch(left: RecipeIngredient[], right: RecipeIngredient[]) {
  return (
    JSON.stringify(left.map(normalizeIngredientForCompare)) ===
    JSON.stringify(right.map(normalizeIngredientForCompare))
  );
}

function sourceUrlsMatch(left: string | null, right: string | null) {
  return (left ?? "").trim().replace(/\/$/, "") ===
    (right ?? "").trim().replace(/\/$/, "");
}

function findMatchingMeals(meals: MealSummary[], identifier: string) {
  const normalizedIdentifier = identifier.trim();
  const slug = slugify(normalizedIdentifier);

  return meals.filter(
    (meal) =>
      meal.id === normalizedIdentifier ||
      meal.id.replace(/-/g, "") === normalizedIdentifier.replace(/-/g, "") ||
      slugify(meal.mealName) === slug
  );
}

function normalizeId(value: string) {
  return value.trim().replace(/-/g, "");
}

function abort(
  reason: string,
  before: RecipeIngredient[] = [],
  after: RecipeIngredient[] = []
): IngredientBackfillApplyResult {
  return {
    status: "aborted",
    reason,
    before,
    after
  };
}

export async function applyIngredientBackfill(
  input: IngredientBackfillApplyInput,
  deps: IngredientBackfillApplyDeps
): Promise<IngredientBackfillApplyResult> {
  const mealIdentifier = input.mealIdentifier?.trim();
  const payload = input.payload ?? null;

  if (!mealIdentifier) {
    return abort("Missing meal identifier.");
  }

  if (!payload) {
    return abort("Missing approved replacement payload.");
  }

  if (!payload.approved) {
    return abort("Replacement payload is not approved.");
  }

  if (
    !Array.isArray(payload.expectedCurrentIngredients) ||
    !Array.isArray(payload.replaceIngredientsWith)
  ) {
    return abort("Approved payload is missing expected before or after ingredients.");
  }

  if (
    normalizeId(payload.mealId) !== normalizeId(mealIdentifier) &&
    slugify(payload.mealName) !== slugify(mealIdentifier)
  ) {
    return abort("Meal identifier does not match approved payload.");
  }

  const meals = await deps.queryMeals();
  const matches = findMatchingMeals(meals, mealIdentifier);

  if (matches.length === 0) {
    return abort("No saved meal matched the identifier.");
  }

  if (matches.length > 1) {
    return abort("More than one saved meal matched the identifier.");
  }

  const meal = matches[0];
  const before = normalizeCurrentMealIngredients(meal);
  const after = payload.replaceIngredientsWith;

  if (meal.id !== payload.mealId) {
    return {
      ...abort("Matched meal id does not match approved payload mealId.", before, after),
      meal
    };
  }

  if (!sourceUrlsMatch(meal.sourceUrl, payload.sourceUrl)) {
    return {
      ...abort("Current saved sourceUrl does not match approved payload.", before, after),
      meal
    };
  }

  if (!ingredientsMatch(before, payload.expectedCurrentIngredients)) {
    return {
      ...abort("Current saved ingredient payload no longer matches approved before payload.", before, after),
      meal
    };
  }

  if (!input.write) {
    return {
      status: "dry_run",
      reason: "Dry run only. Re-run with --write to mutate this one meal.",
      meal,
      before,
      after
    };
  }

  if (input.confirmation !== ingredientBackfillConfirmationPhrase) {
    return {
      ...abort(
        `Typed confirmation must exactly equal "${ingredientBackfillConfirmationPhrase}".`,
        before,
        after
      ),
      meal
    };
  }

  const updatedMeal = await deps.updateNotionIngredients({
    meal,
    ingredients: after
  });

  await deps.refreshPostgresMirror({ meal: updatedMeal });

  return {
    status: "applied",
    reason: "Updated Notion ingredients and refreshed the Postgres mirror.",
    meal: updatedMeal,
    before,
    after
  };
}

export function formatIngredientBackfillDiff(result: IngredientBackfillApplyResult) {
  const formatRows = (ingredients: RecipeIngredient[]) =>
    ingredients.length > 0
      ? ingredients
          .map((ingredient, index) => {
            const amount = [ingredient.quantity, ingredient.unit]
              .filter(Boolean)
              .join(" ");
            const name = ingredient.name || ingredient.rawText;

            return `${index + 1}. ${[amount, name].filter(Boolean).join(" ")} | raw=${ingredient.rawText}`;
          })
          .join("\n")
      : "(none)";

  return [
    `Status: ${result.status}`,
    `Reason: ${result.reason}`,
    result.meal ? `Meal: ${result.meal.mealName} (${result.meal.id})` : null,
    "",
    "Before:",
    formatRows(result.before),
    "",
    "After:",
    formatRows(result.after)
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
