import { generateRecommendationReasons } from "@/src/lib/domain/recommendations/reasons";
import {
  generateRecommendationExplanation,
  scoreRecommendation
} from "@/src/lib/domain/recommendations/scoring";
import {
  normalizeMealName,
  normalizeMealType
} from "@/src/lib/domain/recommendations/variety";
import {
  deriveRecommendationContext,
  getFeedbackExplanationReasons,
  type MealFeedbackSummary,
  type MealFeedbackSummaryByMealId,
  type RecommendationContext
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
  context?: Partial<RecommendationContext>;
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
  const context = deriveRecommendationContext(
    options.generatedAt,
    options.context
  );

  return candidates
    .map((meal) => {
      const feedbackSummary = options.feedbackByMealId?.[meal.id] ?? null;
      const scoreBreakdown = scoreRecommendation({
        meal,
        meals,
        category,
        generatedAt: options.generatedAt,
        feedbackSummary,
        context
      });
      const reasons = [
        ...generateRecommendationReasons(
          meal,
          meals,
          category,
          options.generatedAt,
          feedbackSummary
        ),
        ...getFeedbackExplanationReasons(feedbackSummary, context)
      ];
      const explanation = generateRecommendationExplanation(
        {
          meal,
          meals,
          category,
          generatedAt: options.generatedAt,
          feedbackSummary
        },
        scoreBreakdown
      );
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
        score: scoreBreakdown.totalScore,
        scoreBreakdown,
        reasons,
        explanation,
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
  const excludedMealIds = Array.from(
    new Set([...(options.excludedMealIds ?? []), currentMealId])
  );
  const nextSuggestion =
    rankRecommendationsForCategory(meals, category, {
      ...options,
      excludedMealIds
    })[0] ?? null;

  if (nextSuggestion || excludedMealIds.length <= 1) {
    return nextSuggestion;
  }

  return (
    rankRecommendationsForCategory(meals, category, {
      ...options,
      excludedMealIds: [currentMealId]
    })[0] ?? null
  );
}
