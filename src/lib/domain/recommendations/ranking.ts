import { generateRecommendationReasons } from "@/src/lib/domain/recommendations/reasons";
import {
  countMealRepeats,
  countNutritionFields,
  getDaysSinceDate,
  getDaysSinceMeal,
  normalizeMealName,
  normalizeMealType
} from "@/src/lib/domain/recommendations/variety";
import type {
  MealFeedbackSummary,
  MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";
import type {
  MealRecommendation,
  RecommendationMeal,
  TodayMealCategory
} from "@/src/lib/domain/recommendations/types";

export interface RankRecommendationOptions {
  generatedAt: string;
  excludedMealIds?: string[];
  excludedMealNames?: string[];
  feedbackByMealId?: MealFeedbackSummaryByMealId;
}

function scoreMeal(
  meal: RecommendationMeal,
  meals: RecommendationMeal[],
  generatedAt: string,
  feedbackSummary: MealFeedbackSummary | null
) {
  const daysSinceMeal = getDaysSinceMeal(meal, generatedAt);
  const repeatCount = countMealRepeats(meals, meal);
  const nutritionFields = countNutritionFields(meal);
  let score = 0;

  if (typeof meal.qualityScore === "number") {
    score += Math.max(0, Math.min(meal.qualityScore, 100)) * 0.4;
  }

  if (meal.familyApproved) {
    score += 24;
  }

  if (meal.weeknightFriendly) {
    score += 6;
  }

  if (meal.comfortMeal) {
    score += 4;
  }

  score += nutritionFields * 3;
  score += Math.min(10, Math.max(0, repeatCount - 1) * 4);

  if (daysSinceMeal === null) {
    score -= 5;
  } else if (daysSinceMeal <= 2) {
    score -= 45;
  } else if (daysSinceMeal <= 7) {
    score -= 24;
  } else if (daysSinceMeal <= 14) {
    score -= 8;
  } else if (daysSinceMeal >= 30) {
    score += 10;
  } else {
    score += 4;
  }

  if (feedbackSummary) {
    score += Math.min(30, feedbackSummary.netPreferenceScore * 2);
    score += Math.min(18, feedbackSummary.lovedCount * 12);
    score += Math.min(14, feedbackSummary.wouldRepeatCount * 5);
    score += Math.min(8, feedbackSummary.eatenCount * 2);
    score -= Math.min(28, feedbackSummary.dislikedCount * 10);
    score -= Math.min(18, feedbackSummary.wouldNotRepeatCount * 8);

    if (feedbackSummary.lastEatenAt) {
      const daysSinceFeedbackEating = getDaysSinceDate(
        feedbackSummary.lastEatenAt,
        generatedAt
      );

      if (daysSinceFeedbackEating !== null && daysSinceFeedbackEating <= 2) {
        score -= 80;
      } else if (
        daysSinceFeedbackEating !== null &&
        daysSinceFeedbackEating <= 7
      ) {
        score -= 45;
      } else if (
        daysSinceFeedbackEating !== null &&
        daysSinceFeedbackEating <= 14
      ) {
        score -= 12;
      } else if (
        daysSinceFeedbackEating !== null &&
        daysSinceFeedbackEating >= 21
      ) {
        score += 8;
      }
    }
  }

  return score;
}

function getConfidence(
  meal: RecommendationMeal,
  candidateCount: number,
  reasons: string[],
  feedbackSummary: MealFeedbackSummary | null
): MealRecommendation["confidence"] {
  if (
    feedbackSummary?.confidence === "high" ||
    feedbackSummary?.confidence === "medium"
  ) {
    return "medium";
  }

  if (
    candidateCount < 2 ||
    reasons.length === 0 ||
    (!meal.familyApproved && meal.qualityScore === null)
  ) {
    return "low";
  }

  return "medium";
}

export function rankRecommendationsForCategory(
  meals: RecommendationMeal[],
  category: TodayMealCategory,
  options: RankRecommendationOptions
): MealRecommendation[] {
  const excludedIds = new Set(options.excludedMealIds ?? []);
  const excludedNames = new Set(
    (options.excludedMealNames ?? []).map(normalizeMealName)
  );
  const candidates = meals.filter((meal) => {
    const mealType = normalizeMealType(meal.mealType);

    return (
      mealType === category &&
      !excludedIds.has(meal.id) &&
      !excludedNames.has(normalizeMealName(meal.mealName))
    );
  });

  return candidates
    .map((meal) => {
      const reasons = generateRecommendationReasons(
        meal,
        meals,
        category,
        options.generatedAt,
        options.feedbackByMealId?.[meal.id] ?? null
      );
      const feedbackSummary = options.feedbackByMealId?.[meal.id] ?? null;
      const confidence = getConfidence(
        meal,
        candidates.length,
        reasons,
        feedbackSummary
      );

      return {
        meal,
        feedbackSummary,
        category,
        score: scoreMeal(meal, meals, options.generatedAt, feedbackSummary),
        reasons,
        confidence,
        confidenceNote:
          confidence === "low"
            ? "Low confidence: limited saved meal signals."
            : feedbackSummary
              ? "Based on your saved meals and household feedback."
              : "Based on your saved meals."
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.meal.mealName.localeCompare(right.meal.mealName);
    });
}

export function getSuggestionForCategory(
  meals: RecommendationMeal[],
  category: TodayMealCategory,
  options: RankRecommendationOptions
) {
  return rankRecommendationsForCategory(meals, category, options)[0] ?? null;
}

export function getAlternativeSuggestion(
  meals: RecommendationMeal[],
  category: TodayMealCategory,
  currentMealId: string,
  options: RankRecommendationOptions
) {
  return (
    rankRecommendationsForCategory(meals, category, {
      ...options,
      excludedMealIds: [...(options.excludedMealIds ?? []), currentMealId]
    })[0] ?? null
  );
}
