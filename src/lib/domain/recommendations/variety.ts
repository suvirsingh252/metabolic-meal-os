import type {
  RecommendationMeal,
  TodayMealCategory
} from "@/src/lib/domain/recommendations/types";

export function normalizeMealName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeMealType(
  mealType: string | null | undefined
): TodayMealCategory | null {
  const normalized = mealType?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("breakfast")) {
    return "Breakfast";
  }

  if (normalized.includes("lunch")) {
    return "Lunch";
  }

  if (normalized.includes("dinner") || normalized.includes("supper")) {
    return "Dinner";
  }

  if (normalized.includes("snack")) {
    return "Snack";
  }

  return null;
}

export function getDaysSinceMeal(meal: RecommendationMeal, generatedAt: string) {
  return getDaysSinceDate(meal.createdAt, generatedAt);
}

export function getDaysSinceDate(date: string, generatedAt: string) {
  const loggedAt = new Date(date).getTime();
  const now = new Date(generatedAt).getTime();

  if (!Number.isFinite(loggedAt) || !Number.isFinite(now)) {
    return null;
  }

  return Math.max(0, Math.floor((now - loggedAt) / 86_400_000));
}

export function countMealRepeats(meals: RecommendationMeal[], meal: RecommendationMeal) {
  const normalizedName = normalizeMealName(meal.mealName);

  return meals.filter(
    (candidate) => normalizeMealName(candidate.mealName) === normalizedName
  ).length;
}

export function countNutritionFields(meal: RecommendationMeal) {
  return [
    meal.calories,
    meal.proteinG,
    meal.carbohydratesG,
    meal.fatG,
    meal.fiberG
  ].filter((value) => typeof value === "number").length;
}
