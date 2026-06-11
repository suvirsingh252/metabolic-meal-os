import {
  countMealRepeats,
  countNutritionFields,
  getDaysSinceDate,
  getDaysSinceMeal,
  normalizeMealType
} from "@/src/lib/domain/recommendations/variety";
import type { MealFeedbackSummary } from "@/src/lib/domain/feedback";
import type {
  RecommendationMeal,
  TodayMealCategory
} from "@/src/lib/domain/recommendations/types";

export function generateRecommendationReasons(
  meal: RecommendationMeal,
  meals: RecommendationMeal[],
  category: TodayMealCategory,
  generatedAt: string,
  feedbackSummary: MealFeedbackSummary | null = null
) {
  const reasons: string[] = [];
  const daysSinceMeal = getDaysSinceMeal(meal, generatedAt);
  const repeatCount = countMealRepeats(meals, meal);
  const nutritionFields = countNutritionFields(meal);
  const daysSinceFeedbackEating = feedbackSummary?.lastEatenAt
    ? getDaysSinceDate(feedbackSummary.lastEatenAt, generatedAt)
    : null;

  if (feedbackSummary && feedbackSummary.lovedCount > 0) {
    reasons.push("Family loved this");
  }

  if (feedbackSummary && feedbackSummary.wouldRepeatCount > 0) {
    reasons.push("You said you would make this again");
  }

  if (
    feedbackSummary &&
    feedbackSummary.dislikedCount > 0 &&
    feedbackSummary.likedCount > 0
  ) {
    reasons.push("Mixed feedback");
  }

  if (feedbackSummary && feedbackSummary.eatenCount >= 2) {
    reasons.push("Popular repeat");
  }

  if (
    feedbackSummary &&
    feedbackSummary.totalEvents > 0 &&
    daysSinceFeedbackEating !== null &&
    daysSinceFeedbackEating >= 14
  ) {
    reasons.push("Not recently repeated");
  }

  if (
    feedbackSummary &&
    daysSinceFeedbackEating !== null &&
    daysSinceFeedbackEating <= 7
  ) {
    reasons.push("Recently eaten");
  }

  if (meal.familyApproved) {
    reasons.push("Family favorite");
  }

  if (typeof meal.qualityScore === "number" && meal.qualityScore >= 80) {
    reasons.push("Highly rated");
  } else if (typeof meal.qualityScore === "number" && meal.qualityScore >= 70) {
    reasons.push("High quality meal");
  }

  if (daysSinceMeal !== null && daysSinceMeal >= 14) {
    reasons.push("Haven't had this recently");
  }

  if (repeatCount >= 2) {
    reasons.push("Frequently repeated");
  }

  if (category === "Snack" && normalizeMealType(meal.mealType) === "Snack") {
    reasons.push("Great snack option");
  }

  if (nutritionFields >= 4) {
    reasons.push("Good nutrition detail");
  }

  if (meal.weeknightFriendly && category === "Dinner") {
    reasons.push("Weeknight friendly");
  }

  return reasons.slice(0, 4);
}
