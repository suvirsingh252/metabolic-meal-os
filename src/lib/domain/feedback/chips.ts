import {
  emptyMealFeedbackSummary,
  type MealFeedbackSummary
} from "@/src/lib/domain/feedback/summary";

export type FeedbackChip =
  | "loved_it"
  | "family_loved_it"
  | "would_make_again"
  | "felt_healthy"
  | "too_much_work"
  | "needed_too_many_ingredients"
  | "better_for_weekends"
  | "not_worth_it";

export interface RecommendationContext {
  dayOfWeek: number;
  selectedMoodChips?: string[];
  selectedTimeChip?: string;
  selectedRealityChips?: string[];
}

export interface FeedbackChipEvent {
  mealId: string | null;
  chipType: FeedbackChip;
  createdAt: string;
}

export type FeedbackChipCounts = Record<FeedbackChip, number>;

export interface MealChipFeedbackSummary extends MealFeedbackSummary {
  chipCounts: FeedbackChipCounts;
  familyLovedCount: number;
  feltHealthyCount: number;
  tooMuchWorkCount: number;
  tooManyIngredientsCount: number;
  betterForWeekendsCount: number;
}

const feedbackChips: FeedbackChip[] = [
  "loved_it",
  "family_loved_it",
  "would_make_again",
  "felt_healthy",
  "too_much_work",
  "needed_too_many_ingredients",
  "better_for_weekends",
  "not_worth_it"
];

function emptyChipCounts(): FeedbackChipCounts {
  return Object.fromEntries(
    feedbackChips.map((chip) => [chip, 0])
  ) as FeedbackChipCounts;
}

export function emptyMealChipFeedbackSummary(
  mealId: string
): MealChipFeedbackSummary {
  return {
    ...emptyMealFeedbackSummary(mealId),
    chipCounts: emptyChipCounts(),
    familyLovedCount: 0,
    feltHealthyCount: 0,
    tooMuchWorkCount: 0,
    tooManyIngredientsCount: 0,
    betterForWeekendsCount: 0
  };
}

function latestDate(left: string | null, right: string) {
  if (!left) {
    return right;
  }

  return right > left ? right : left;
}

function getConfidence(totalEvents: number): MealFeedbackSummary["confidence"] {
  if (totalEvents === 0) {
    return "none";
  }

  if (totalEvents >= 5) {
    return "high";
  }

  if (totalEvents >= 2) {
    return "medium";
  }

  return "low";
}

export function summarizeMealChipFeedback(
  events: FeedbackChipEvent[]
): Record<string, MealChipFeedbackSummary> {
  const summaries: Record<string, MealChipFeedbackSummary> = {};

  for (const event of events) {
    if (!event.mealId) {
      continue;
    }

    const summary =
      summaries[event.mealId] ?? emptyMealChipFeedbackSummary(event.mealId);

    summary.totalEvents += 1;
    summary.lastEatenAt = latestDate(summary.lastEatenAt, event.createdAt);
    summary.chipCounts[event.chipType] += 1;

    if (
      event.chipType === "loved_it" ||
      event.chipType === "family_loved_it"
    ) {
      summary.lovedCount += 1;
      summary.likedCount += 1;
      summary.wouldRepeatCount += 1;
      summary.lastPositiveAt = latestDate(summary.lastPositiveAt, event.createdAt);
      summary.netPreferenceScore += 6;
    } else if (event.chipType === "would_make_again") {
      summary.likedCount += 1;
      summary.wouldRepeatCount += 1;
      summary.lastPositiveAt = latestDate(summary.lastPositiveAt, event.createdAt);
      summary.netPreferenceScore += 3;
    } else if (event.chipType === "felt_healthy") {
      summary.likedCount += 1;
      summary.lastPositiveAt = latestDate(summary.lastPositiveAt, event.createdAt);
      summary.netPreferenceScore += 1;
    } else if (event.chipType === "not_worth_it") {
      summary.dislikedCount += 1;
      summary.wouldNotRepeatCount += 1;
      summary.netPreferenceScore -= 7;
    }

    if (event.chipType === "family_loved_it") {
      summary.familyLovedCount += 1;
    } else if (event.chipType === "felt_healthy") {
      summary.feltHealthyCount += 1;
    } else if (event.chipType === "too_much_work") {
      summary.tooMuchWorkCount += 1;
    } else if (event.chipType === "needed_too_many_ingredients") {
      summary.tooManyIngredientsCount += 1;
    } else if (event.chipType === "better_for_weekends") {
      summary.betterForWeekendsCount += 1;
    }

    summary.confidence = getConfidence(summary.totalEvents);
    summaries[event.mealId] = summary;
  }

  return summaries;
}

export function isMealChipFeedbackSummary(
  summary: MealFeedbackSummary | MealChipFeedbackSummary | null
): summary is MealChipFeedbackSummary {
  return Boolean(summary) && "chipCounts" in (summary as object);
}

export function deriveRecommendationContext(
  generatedAt: string,
  overrides: Partial<RecommendationContext> = {}
): RecommendationContext {
  return {
    dayOfWeek: new Date(generatedAt).getUTCDay(),
    ...overrides
  };
}

function normalizedContextTokens(context: RecommendationContext) {
  return [
    ...(context.selectedMoodChips ?? []),
    context.selectedTimeChip,
    ...(context.selectedRealityChips ?? [])
  ]
    .filter((token): token is string => Boolean(token))
    .map((token) => token.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
}

function hasAnyContextToken(
  context: RecommendationContext,
  matches: string[]
) {
  const tokens = normalizedContextTokens(context);

  return tokens.some((token) =>
    matches.some((match) => token.includes(match))
  );
}

function isWeeknight(dayOfWeek: number) {
  return dayOfWeek >= 1 && dayOfWeek <= 4;
}

function isWeekendContext(dayOfWeek: number) {
  return dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
}

function isHealthyOrLighterContext(context: RecommendationContext) {
  return hasAnyContextToken(context, ["healthy", "lighter", "light"]);
}

function isConvenienceContext(context: RecommendationContext) {
  return hasAnyContextToken(context, [
    "quick",
    "quicker",
    "under_20",
    "under20",
    "low_effort",
    "easy",
    "convenient"
  ]);
}

export function getFeedbackScoreAdjustment(
  summary: MealChipFeedbackSummary | MealFeedbackSummary | null,
  context: RecommendationContext
) {
  if (!summary || summary.totalEvents === 0 || !("chipCounts" in summary)) {
    return 0;
  }

  const healthyContext = isHealthyOrLighterContext(context);
  const convenienceContext = isConvenienceContext(context);
  let score = 0;

  score += summary.chipCounts.loved_it * 24;
  score += summary.chipCounts.family_loved_it * 28;
  score += summary.chipCounts.would_make_again * 12;
  score += summary.chipCounts.felt_healthy * (healthyContext ? 10 : 4);
  score -= summary.chipCounts.not_worth_it * 30;

  if (isWeeknight(context.dayOfWeek)) {
    score -= summary.chipCounts.too_much_work * 12;
    score -= summary.chipCounts.needed_too_many_ingredients * 10;
    score -= summary.chipCounts.better_for_weekends * 14;
  } else {
    score -= summary.chipCounts.needed_too_many_ingredients * 6;

    if (summary.chipCounts.better_for_weekends > 0) {
      score += convenienceContext
        ? summary.chipCounts.better_for_weekends * -8
        : summary.chipCounts.better_for_weekends * 4;
    }
  }

  if (convenienceContext) {
    score -= summary.chipCounts.too_much_work * 4;
    score -= summary.chipCounts.needed_too_many_ingredients * 6;
  }

  return score;
}

export function getFeedbackExplanationReasons(
  summary: MealChipFeedbackSummary | MealFeedbackSummary | null,
  context: RecommendationContext
) {
  if (!summary || summary.totalEvents === 0 || !("chipCounts" in summary)) {
    return [];
  }

  const reasons: string[] = [];
  const healthyContext = isHealthyOrLighterContext(context);
  const convenienceContext = isConvenienceContext(context);

  if (summary.chipCounts.loved_it > 0) {
    reasons.push("Loved by the household before.");
  }

  if (summary.chipCounts.family_loved_it > 0) {
    reasons.push("Family-friendly pick based on past feedback.");
  }

  if (summary.chipCounts.would_make_again > 0) {
    reasons.push("Marked as worth making again.");
  }

  if (summary.chipCounts.felt_healthy > 0) {
    reasons.push(
      healthyContext
        ? "Healthy-feeling feedback supports tonight's lighter filter."
        : "Past feedback said this felt healthy."
    );
  }

  if (summary.chipCounts.too_much_work > 0 && isWeeknight(context.dayOfWeek)) {
    reasons.push("Past feedback said this may be too much work for a weeknight.");
  }

  if (summary.chipCounts.needed_too_many_ingredients > 0) {
    reasons.push(
      convenienceContext
        ? "Ingredient load conflicts with the quick or low-effort filter."
        : "Past feedback flagged too many ingredients."
    );
  }

  if (summary.chipCounts.better_for_weekends > 0) {
    if (isWeeknight(context.dayOfWeek)) {
      reasons.push("Past feedback says this is better saved for a weekend.");
    } else if (isWeekendContext(context.dayOfWeek) && !convenienceContext) {
      reasons.push("Weekend context fits past feedback for this meal.");
    } else if (convenienceContext) {
      reasons.push("Weekend fit is tempered by the quick or low-effort filter.");
    }
  }

  if (summary.chipCounts.not_worth_it > 0) {
    reasons.push("Past feedback said this was not worth repeating.");
  }

  return reasons;
}
