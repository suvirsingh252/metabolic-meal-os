import type { MealFeedbackSummary } from "@/src/lib/domain/feedback";
import {
  deriveRecommendationContext,
  getFeedbackScoreAdjustment,
  isMealChipFeedbackSummary,
  type RecommendationContext
} from "@/src/lib/domain/feedback";
import type {
  RecommendationExplanation,
  RecommendationMeal,
  RecommendationScoreBreakdown,
  TodayMealCategory
} from "@/src/lib/domain/recommendations/types";
import {
  countMealRepeats,
  countNutritionFields,
  getDaysSinceDate,
  getDaysSinceMeal
} from "@/src/lib/domain/recommendations/variety";

export interface ScoreRecommendationInput {
  meal: RecommendationMeal;
  meals: RecommendationMeal[];
  category: TodayMealCategory;
  generatedAt: string;
  feedbackSummary: MealFeedbackSummary | null;
  context?: RecommendationContext;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function computeSchedulingScore(meal: RecommendationMeal) {
  let score = 0;

  if (typeof meal.qualityScore === "number") {
    score += clamp(meal.qualityScore, 0, 100) * 0.4;
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

  score += countNutritionFields(meal) * 3;

  return score;
}

export function computePreferenceScore(
  feedbackSummary: MealFeedbackSummary | null
) {
  if (!feedbackSummary || feedbackSummary.totalEvents === 0) {
    return 0;
  }

  let score = 0;

  score += Math.min(30, feedbackSummary.netPreferenceScore * 2);
  score += Math.min(18, feedbackSummary.lovedCount * 12);
  score += Math.min(14, feedbackSummary.wouldRepeatCount * 5);
  score += Math.min(8, feedbackSummary.eatenCount * 2);
  score -= Math.min(28, feedbackSummary.dislikedCount * 10);
  score -= Math.min(18, feedbackSummary.wouldNotRepeatCount * 8);

  return score;
}

export function computeRecencyScore(
  meal: RecommendationMeal,
  generatedAt: string,
  feedbackSummary: MealFeedbackSummary | null
) {
  const daysSinceMeal = getDaysSinceMeal(meal, generatedAt);
  let score = 0;

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

  if (feedbackSummary?.lastEatenAt) {
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
      score -= 27;
    } else if (
      daysSinceFeedbackEating !== null &&
      daysSinceFeedbackEating <= 14
    ) {
      score -= 8;
    } else if (
      daysSinceFeedbackEating !== null &&
      daysSinceFeedbackEating >= 21
    ) {
      score += 8;
    }
  }

  return score;
}

export function computeVarietyPenalty(
  meal: RecommendationMeal,
  meals: RecommendationMeal[],
  generatedAt: string,
  feedbackSummary: MealFeedbackSummary | null
) {
  const repeatCount = countMealRepeats(meals, meal);
  const daysSinceFeedbackEating = feedbackSummary?.lastEatenAt
    ? getDaysSinceDate(feedbackSummary.lastEatenAt, generatedAt)
    : null;
  let penalty = 0;

  if (repeatCount >= 3) {
    penalty -= Math.min(10, (repeatCount - 2) * 3);
  }

  if (
    feedbackSummary &&
    feedbackSummary.eatenCount >= 2 &&
    daysSinceFeedbackEating !== null &&
    daysSinceFeedbackEating <= 14
  ) {
    penalty -= 20;
  }

  if (
    feedbackSummary &&
    feedbackSummary.eatenCount >= 4 &&
    daysSinceFeedbackEating !== null &&
    daysSinceFeedbackEating <= 30
  ) {
    penalty -= 8;
  }

  return penalty;
}

export function scoreRecommendation(
  input: ScoreRecommendationInput
): RecommendationScoreBreakdown {
  const isChipSummary = isMealChipFeedbackSummary(input.feedbackSummary);
  const context =
    input.context ?? deriveRecommendationContext(input.generatedAt);
  const schedulingScore = computeSchedulingScore(input.meal);
  // Chip feedback already feeds the base preference fields, so it owns the
  // feedback term via getFeedbackScoreAdjustment; running computePreferenceScore
  // as well would double-count loved/disliked signals. Legacy summaries keep
  // the original preference path.
  const preferenceScore = isChipSummary
    ? 0
    : computePreferenceScore(input.feedbackSummary);
  const feedbackAdjustment = getFeedbackScoreAdjustment(
    input.feedbackSummary,
    context
  );
  const recencyScore = computeRecencyScore(
    input.meal,
    input.generatedAt,
    input.feedbackSummary
  );
  const varietyPenalty = computeVarietyPenalty(
    input.meal,
    input.meals,
    input.generatedAt,
    input.feedbackSummary
  );
  const totalScore =
    schedulingScore +
    preferenceScore +
    recencyScore +
    varietyPenalty +
    feedbackAdjustment;

  return {
    preferenceScore,
    recencyScore,
    varietyPenalty,
    schedulingScore,
    feedbackAdjustment,
    totalScore
  };
}

export function generateRecommendationExplanation(
  input: ScoreRecommendationInput,
  scoreBreakdown: RecommendationScoreBreakdown
): RecommendationExplanation {
  const details: string[] = [];
  const feedback = input.feedbackSummary;

  if (feedback && feedback.totalEvents > 0) {
    if (scoreBreakdown.preferenceScore > 0) {
      details.push("Similar meals have worked well for your household.");
    } else if (scoreBreakdown.preferenceScore < 0) {
      details.push("Past feedback makes this a cautious pick.");
    } else {
      details.push("Household feedback is neutral for this meal.");
    }
  } else {
    details.push("No household feedback yet, so preference starts neutral.");
  }

  if (scoreBreakdown.recencyScore > 0) {
    details.push("Recency helps because this meal has not appeared lately.");
  } else if (scoreBreakdown.recencyScore < 0) {
    details.push("Recency lowers the score to avoid repeating it too soon.");
  } else {
    details.push("Recency is neutral for this meal.");
  }

  if (scoreBreakdown.varietyPenalty < 0) {
    details.push("This meal has repeated recently, so Tablewise is cautious about suggesting it again.");
  } else {
    details.push("This adds variety because it has not repeated too often lately.");
  }

  if (scoreBreakdown.schedulingScore > 0) {
    details.push("This saved meal has useful quality or planning signals.");
  } else {
    details.push("Saved meal details are limited, so this is a lighter recommendation.");
  }

  const headline =
    feedback && feedback.totalEvents > 0
      ? "Chosen from saved meals plus household feedback."
      : "Chosen from saved meal metadata while feedback is sparse.";

  return {
    headline,
    details
  };
}
