import {
  emptyMealFeedbackSummary,
  type MealFeedbackSummary,
  type MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";
import {
  generateRecommendationReasons,
  normalizeMealType,
  type RecommendationMeal,
  type TodayMealCategory
} from "@/src/lib/domain/recommendations";
import {
  buildMealCookbook,
  type MealCookbook
} from "@/src/lib/domain/meals/cookbook";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

export interface MealDetailNutritionItem {
  id: string;
  label: string;
  value: number | null;
  unit: string;
}

export interface MealDetailViewModel {
  meal: MealSummary;
  feedbackSummary: MealFeedbackSummary;
  sourceBadge: string;
  confidenceBadge: string | null;
  dateLabel: string | null;
  whyReasons: string[];
  feedbackReasons: string[];
  nutritionItems: MealDetailNutritionItem[];
  nutritionProvenance: string | null;
  hasNutritionData: boolean;
  cookbook: MealCookbook;
}

export function getMealDetailPath(mealId: string) {
  return `/meals/${encodeURIComponent(mealId)}`;
}

function normalizeId(id: string) {
  return id.trim().toLowerCase().replace(/-/g, "");
}

function mapMealToRecommendationMeal(meal: MealSummary): RecommendationMeal {
  return {
    id: meal.id,
    url: meal.url,
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
    qualityScore: meal.qualityScore
  };
}

function getRecommendationCategory(meal: MealSummary): TodayMealCategory {
  return normalizeMealType(meal.mealType) ?? "Dinner";
}

function buildFeedbackReasons(summary: MealFeedbackSummary) {
  const reasons: string[] = [];

  if (summary.lovedCount > 0) {
    reasons.push("Household loved this before");
  }

  if (summary.wouldRepeatCount > 0) {
    reasons.push("Marked as something to make again");
  }

  if (summary.dislikedCount > 0 && summary.likedCount > 0) {
    reasons.push("Feedback is mixed");
  } else if (summary.dislikedCount > 0) {
    reasons.push("Someone did not like it last time");
  }

  if (summary.eatenCount >= 2) {
    reasons.push("Logged as eaten more than once");
  }

  return reasons;
}

function buildNutritionItems(meal: MealSummary): MealDetailNutritionItem[] {
  return [
    { id: "calories", label: "Calories", value: meal.calories, unit: "kcal" },
    { id: "protein", label: "Protein", value: meal.proteinG, unit: "g" },
    { id: "carbs", label: "Carbs", value: meal.carbohydratesG, unit: "g" },
    { id: "fat", label: "Fat", value: meal.fatG, unit: "g" },
    { id: "fiber", label: "Fiber", value: meal.fiberG, unit: "g" },
    { id: "sodium", label: "Sodium", value: meal.sodiumMg, unit: "mg" },
    { id: "sugar", label: "Sugar", value: meal.sugarG, unit: "g" },
    {
      id: "quality",
      label: "Quality Score",
      value: meal.qualityScore,
      unit: "/100"
    }
  ];
}

function toHouseholdWhyReason(reason: string) {
  if (/not recently|haven't had/i.test(reason)) {
    return "You have not had this recently.";
  }

  if (/family|favorite|loved/i.test(reason)) {
    return "Marked family friendly.";
  }

  if (/weeknight|snack/i.test(reason)) {
    return "Good weeknight option.";
  }

  if (/quality|rated|nutrition/i.test(reason)) {
    return "Higher quality saved meal.";
  }

  if (/repeat|popular/i.test(reason)) {
    return "Similar meals have worked well.";
  }

  return reason.endsWith(".") ? reason : `${reason}.`;
}

export function buildMealDetailViewModel(
  meals: MealSummary[],
  mealId: string,
  options: {
    generatedAt?: string;
    feedbackByMealId?: MealFeedbackSummaryByMealId;
  } = {}
): MealDetailViewModel | null {
  const requestedId = normalizeId(decodeURIComponent(mealId));
  const meal = meals.find((candidate) => normalizeId(candidate.id) === requestedId);

  if (!meal) {
    return null;
  }

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const recommendationMeals = meals.map(mapMealToRecommendationMeal);
  const recommendationMeal = mapMealToRecommendationMeal(meal);
  const feedbackSummary =
    options.feedbackByMealId?.[meal.id] ?? emptyMealFeedbackSummary(meal.id);
  const category = getRecommendationCategory(meal);
  const whyReasons = Array.from(
    new Set(
      generateRecommendationReasons(
        recommendationMeal,
        recommendationMeals,
        category,
        generatedAt,
        feedbackSummary.totalEvents > 0 ? feedbackSummary : null
      ).map(toHouseholdWhyReason)
    )
  );
  const nutritionItems = buildNutritionItems(meal);

  return {
    meal,
    feedbackSummary,
    sourceBadge: meal.nutritionSource ?? meal.cuisine ?? "Saved meal",
    confidenceBadge: meal.nutritionConfidence,
    dateLabel: feedbackSummary.lastEatenAt ?? meal.createdAt ?? null,
    whyReasons,
    feedbackReasons: buildFeedbackReasons(feedbackSummary),
    nutritionItems,
    nutritionProvenance: meal.nutritionProvenance ?? meal.nutritionSource,
    hasNutritionData: nutritionItems.some((item) => typeof item.value === "number"),
    cookbook: buildMealCookbook(meal, feedbackSummary)
  };
}
