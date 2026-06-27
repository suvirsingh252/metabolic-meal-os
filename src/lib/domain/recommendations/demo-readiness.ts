import { normalizeIngredientListWithStats } from "@/src/lib/ingredients";
import type { RecommendationMeal } from "@/src/lib/domain/recommendations/types";

const COMPLETE_NUTRITION_FIELDS = [
  "calories",
  "proteinG",
  "carbohydratesG",
  "fatG",
  "fiberG"
] as const;

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function ingredientLines(meal: Pick<RecommendationMeal, "ingredientsText">) {
  return (meal.ingredientsText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function hasCompleteRecommendationIngredients(
  meal: Pick<RecommendationMeal, "ingredientsText">
) {
  const lines = ingredientLines(meal);

  if (lines.length === 0) {
    return false;
  }

  const normalized = normalizeIngredientListWithStats(lines);

  return (
    normalized.ingredients.length === lines.length &&
    normalized.duplicateCount === 0 &&
    normalized.malformedCount === 0
  );
}

export function hasCompleteRecommendationNutrition(
  meal: Pick<
    RecommendationMeal,
    "calories" | "proteinG" | "carbohydratesG" | "fatG" | "fiberG"
  >
) {
  return COMPLETE_NUTRITION_FIELDS.every(
    (field) => typeof meal[field] === "number"
  );
}

/**
 * Demo-safe recommendations should only come from meals that can stand up in a
 * polished investor walkthrough: image, core metadata, usable ingredients, and
 * complete top-line nutrition. This intentionally uses only fields already
 * available to the recommendation engine.
 */
export function isDemoReadyRecommendationMeal(meal: RecommendationMeal) {
  return (
    hasText(meal.imageUrl) &&
    hasText(meal.cuisine) &&
    hasText(meal.mealType) &&
    hasCompleteRecommendationIngredients(meal) &&
    hasCompleteRecommendationNutrition(meal)
  );
}
