import {
  deriveRecommendationContext,
  isMealChipFeedbackSummary,
  type MealFeedbackSummary,
  type MealFeedbackSummaryByMealId,
  type RecommendationContext
} from "@/src/lib/domain/feedback";
import { rankRecommendationsForCategory } from "@/src/lib/domain/recommendations/ranking";
import type {
  MealRecommendation,
  RecommendationMeal,
  RecommendationScoreBreakdown
} from "@/src/lib/domain/recommendations/types";
import {
  getDaysSinceDate,
  getDaysSinceMeal,
  normalizeMealName
} from "@/src/lib/domain/recommendations/variety";

/**
 * Concierge input meal. Extends the shared RecommendationMeal with optional UI
 * metadata (image, estimated time, effort, tags) that the ranking engine does
 * not need but the homepage will. All extra fields are optional so existing
 * callers and tests remain valid, and missing metadata never throws.
 */
export interface DinnerConciergeMeal extends RecommendationMeal {
  imageUrl?: string | null;
  estimatedMinutes?: number | null;
  effortLevel?: string | null;
  tags?: string[];
}

export type DinnerConciergeRefinementGroup = "mood" | "time" | "tonight";

export interface DinnerConciergeRefinementOption {
  id: string;
  label: string;
  group: DinnerConciergeRefinementGroup;
}

export interface DinnerConciergeRefinementState {
  mood: string[];
  time: string | null;
  tonight: string[];
}

export interface DinnerConciergeRecommendation {
  mealId: string;
  name: string;
  imageUrl: string | null;
  cuisine: string | null;
  estimatedMinutes: number | null;
  score: number;
  refinementScore: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  reasons: string[];
  badges: string[];
}

export interface DinnerConciergeEmptyState {
  title: string;
  message: string;
  actionLabel?: string;
}

export interface DinnerConciergeViewModel {
  generatedAt: string;
  leadRecommendation: DinnerConciergeRecommendation | null;
  alternates: DinnerConciergeRecommendation[];
  freshIdeas: DinnerConciergeRecommendation[];
  activeRefinements: DinnerConciergeRefinementState;
  availableRefinements: DinnerConciergeRefinementOption[];
  emptyState?: DinnerConciergeEmptyState;
}

export interface DinnerConciergeInput {
  meals: DinnerConciergeMeal[];
  generatedAt?: string;
  feedbackByMealId?: MealFeedbackSummaryByMealId;
  refinements?: Partial<DinnerConciergeRefinementState>;
}

export const dinnerConciergeRefinements: DinnerConciergeRefinementOption[] = [
  { id: "mediterranean", label: "Mediterranean", group: "mood" },
  { id: "comfort", label: "Comfort", group: "mood" },
  { id: "healthy-lighter", label: "Healthy/Lighter", group: "mood" },
  { id: "fresh", label: "Fresh", group: "mood" },
  { id: "spicy", label: "Spicy", group: "mood" },
  { id: "quick", label: "Quick", group: "mood" },
  { id: "under-20", label: "Under 20 minutes", group: "time" },
  { id: "20-40", label: "20–40 minutes", group: "time" },
  { id: "40-60", label: "40–60 minutes", group: "time" },
  { id: "family-dinner", label: "Family dinner", group: "tonight" },
  { id: "use-ingredients", label: "Use ingredients I have", group: "tonight" },
  { id: "healthier", label: "Healthier option", group: "tonight" },
  { id: "treat-night", label: "Treat night", group: "tonight" }
];

const refinementLabelById = new Map(
  dinnerConciergeRefinements.map((option) => [option.id, option.label])
);

function normalizeRefinementState(
  refinements?: Partial<DinnerConciergeRefinementState>
): DinnerConciergeRefinementState {
  return {
    mood: refinements?.mood ?? [],
    time: refinements?.time ?? null,
    tonight: refinements?.tonight ?? []
  };
}

function hasRefinement(state: DinnerConciergeRefinementState, id: string) {
  return (
    state.mood.includes(id) ||
    state.tonight.includes(id) ||
    state.time === id
  );
}

function labelsFor(ids: string[]): string[] {
  return ids
    .map((id) => refinementLabelById.get(id))
    .filter((label): label is string => Boolean(label));
}

/**
 * Translate refinement selections into the RecommendationContext consumed by the
 * existing chip-feedback scoring. Quick / Under 20 surface as convenience tokens;
 * Healthy/Lighter (and Healthier option) surface as healthy tokens.
 */
function buildContext(
  generatedAt: string,
  state: DinnerConciergeRefinementState
): RecommendationContext {
  const moodLabels = labelsFor(state.mood);
  const tonightLabels = labelsFor(state.tonight);

  // "Healthier option" should also activate the felt-healthy boost, which keys
  // off the literal "healthy" token.
  if (state.tonight.includes("healthier") && !moodLabels.includes("Healthy/Lighter")) {
    moodLabels.push("Healthy/Lighter");
  }

  return deriveRecommendationContext(generatedAt, {
    selectedMoodChips: moodLabels,
    selectedTimeChip: state.time
      ? refinementLabelById.get(state.time) ?? undefined
      : undefined,
    selectedRealityChips: tonightLabels
  });
}

function mealSearchText(meal: DinnerConciergeMeal): string {
  return [meal.cuisine, meal.mealName, ...(meal.tags ?? [])]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function matchesKeywords(meal: DinnerConciergeMeal, keywords: string[]): boolean {
  const text = mealSearchText(meal);
  return keywords.some((keyword) => text.includes(keyword));
}

function effortMinutes(meal: DinnerConciergeMeal): number | null {
  if (typeof meal.estimatedMinutes === "number") {
    return meal.estimatedMinutes;
  }

  switch ((meal.effortLevel ?? "").toLowerCase()) {
    case "low":
    case "quick":
    case "easy":
      return 20;
    case "medium":
    case "moderate":
      return 35;
    case "high":
    case "involved":
      return 55;
    default:
      return null;
  }
}

/**
 * Attribute-based refinement bias applied on top of the base ranking score.
 * Operates on meal metadata so meals without feedback history are still biased
 * by the active refinements. Deterministic integer deltas.
 */
export function computeRefinementScore(
  meal: DinnerConciergeMeal,
  state: DinnerConciergeRefinementState
): number {
  let score = 0;
  const minutes = effortMinutes(meal);
  const isHealthyRefine =
    hasRefinement(state, "healthy-lighter") || hasRefinement(state, "healthier");

  if (hasRefinement(state, "mediterranean")) {
    if (matchesKeywords(meal, ["mediterranean", "greek", "levant", "hummus", "falafel", "tahini"])) {
      score += 18;
    }
  }

  if (hasRefinement(state, "comfort")) {
    if (meal.comfortMeal) {
      score += 14;
    }
    if (matchesKeywords(meal, ["comfort", "stew", "casserole", "roast", "mac", "pie", "noodle"])) {
      score += 8;
    }
  }

  if (hasRefinement(state, "fresh")) {
    if (matchesKeywords(meal, ["fresh", "salad", "citrus", "herb", "slaw", "crisp"])) {
      score += 14;
    }
  }

  if (hasRefinement(state, "spicy")) {
    if (matchesKeywords(meal, ["spicy", "chili", "chilli", "harissa", "sichuan", "curry", "gochujang", "jalapeno"])) {
      score += 14;
    }
  }

  if (isHealthyRefine) {
    if (typeof meal.fiberG === "number" && meal.fiberG >= 8) {
      score += 8;
    }
    if (typeof meal.proteinG === "number" && meal.proteinG >= 25) {
      score += 6;
    }
    if (typeof meal.calories === "number" && meal.calories <= 600) {
      score += 6;
    }
    if (matchesKeywords(meal, ["salad", "bowl", "grilled", "light", "veg"])) {
      score += 6;
    }
  }

  if (hasRefinement(state, "quick")) {
    if (meal.weeknightFriendly) {
      score += 12;
    }
    if (minutes !== null && minutes <= 25) {
      score += 8;
    }
  }

  if (state.time === "under-20") {
    if (minutes !== null && minutes <= 20) {
      score += 16;
    } else if (minutes !== null && minutes > 40) {
      score -= 10;
    } else if (meal.weeknightFriendly) {
      score += 6;
    }
  } else if (state.time === "20-40") {
    if (minutes !== null && minutes >= 20 && minutes <= 40) {
      score += 12;
    }
  } else if (state.time === "40-60") {
    if (minutes !== null && minutes >= 40 && minutes <= 60) {
      score += 10;
    }
  }

  if (hasRefinement(state, "family-dinner")) {
    if (meal.familyApproved) {
      score += 18;
    }
  }

  if (hasRefinement(state, "use-ingredients")) {
    if (meal.weeknightFriendly) {
      score += 6;
    }
    if (minutes !== null && minutes <= 30) {
      score += 4;
    }
  }

  if (hasRefinement(state, "treat-night")) {
    if (meal.comfortMeal) {
      score += 12;
    }
    if (typeof meal.calories === "number" && meal.calories >= 700) {
      score += 6;
    }
    if (matchesKeywords(meal, ["dessert", "pizza", "burger", "fried", "cheesy", "indulgent"])) {
      score += 10;
    }
  }

  return score;
}

function buildBadges(
  meal: DinnerConciergeMeal,
  minutes: number | null
): string[] {
  const badges: string[] = [];

  if (meal.familyApproved) {
    badges.push("Family favorite");
  }
  if (meal.weeknightFriendly) {
    badges.push("Weeknight friendly");
  }
  if (meal.comfortMeal) {
    badges.push("Comfort");
  }
  if (typeof meal.qualityScore === "number" && meal.qualityScore >= 80) {
    badges.push("Highly rated");
  }
  if (meal.cuisine) {
    badges.push(meal.cuisine);
  }
  if (minutes !== null) {
    badges.push(`${minutes} min`);
  } else if (meal.effortLevel) {
    badges.push(`${meal.effortLevel} effort`);
  }

  return badges.slice(0, 4);
}

function toRecommendation(
  ranked: MealRecommendation,
  meal: DinnerConciergeMeal,
  state: DinnerConciergeRefinementState
): DinnerConciergeRecommendation {
  const refinementScore = computeRefinementScore(meal, state);
  const reasons =
    ranked.reasons.length > 0
      ? ranked.reasons
      : ["A solid pick from your saved dinners."];

  return {
    mealId: meal.id,
    name: meal.mealName,
    imageUrl: meal.imageUrl ?? null,
    cuisine: meal.cuisine ?? null,
    estimatedMinutes:
      typeof meal.estimatedMinutes === "number" ? meal.estimatedMinutes : null,
    score: ranked.score + refinementScore,
    refinementScore,
    scoreBreakdown: ranked.scoreBreakdown,
    reasons,
    badges: buildBadges(meal, effortMinutes(meal))
  };
}

function isStronglyNegative(
  summary: MealFeedbackSummary | null
): boolean {
  if (!summary || summary.totalEvents === 0) {
    return false;
  }

  if (isMealChipFeedbackSummary(summary) && summary.chipCounts.not_worth_it > 0) {
    return true;
  }

  return (
    summary.netPreferenceScore <= -5 ||
    (summary.dislikedCount > 0 && summary.dislikedCount > summary.likedCount)
  );
}

function daysSinceSurfaced(
  meal: DinnerConciergeMeal,
  summary: MealFeedbackSummary | null,
  generatedAt: string
): number {
  if (summary?.lastEatenAt) {
    const days = getDaysSinceDate(summary.lastEatenAt, generatedAt);
    if (days !== null) {
      return days;
    }
  }

  return getDaysSinceMeal(meal, generatedAt) ?? Number.MAX_SAFE_INTEGER;
}

function buildFreshIdeas(
   rankedRecommendations: { ranked: MealRecommendation; meal: DinnerConciergeMeal }[],
  excludedMealIds: Set<string>,
  leadCuisine: string | null,
  feedbackByMealId: MealFeedbackSummaryByMealId | undefined,
  generatedAt: string,
  state: DinnerConciergeRefinementState
): DinnerConciergeRecommendation[] {
  const seenNames = new Set<string>();
  const candidates = rankedRecommendations.filter(
    ({ meal }) => !excludedMealIds.has(meal.id)
  );

  const positiveCandidates = candidates.filter(
    ({ meal }) => !isStronglyNegative(feedbackByMealId?.[meal.id] ?? null)
  );
  // Only fall back to strongly-negative meals if nothing else is available.
  const pool = positiveCandidates.length > 0 ? positiveCandidates : candidates;

  const normalizedLeadCuisine = leadCuisine?.toLowerCase() ?? null;

  return pool
    .filter(({ meal }) => {
      const normalizedName = normalizeMealName(meal.mealName);
      if (seenNames.has(normalizedName)) {
        return false;
      }
      seenNames.add(normalizedName);
      return true;
    })
    .map((entry) => {
      const differentCuisine =
        normalizedLeadCuisine === null ||
        (entry.meal.cuisine?.toLowerCase() ?? null) !== normalizedLeadCuisine;
      const summary = feedbackByMealId?.[entry.meal.id] ?? null;
      return {
        entry,
        differentCuisine,
        recencyDays: daysSinceSurfaced(entry.meal, summary, generatedAt)
      };
    })
    .sort((left, right) => {
      if (left.differentCuisine !== right.differentCuisine) {
        return left.differentCuisine ? -1 : 1;
      }
      if (right.recencyDays !== left.recencyDays) {
        return right.recencyDays - left.recencyDays;
      }
      if (right.entry.ranked.score !== left.entry.ranked.score) {
        return right.entry.ranked.score - left.entry.ranked.score;
      }
      return left.entry.meal.mealName.localeCompare(right.entry.meal.mealName);
    })
    .slice(0, 3)
    .map(({ entry }) => toRecommendation(entry.ranked, entry.meal, state));
}

function buildEmptyState(
  totalMeals: number
): DinnerConciergeEmptyState {
  if (totalMeals === 0) {
    return {
      title: "No saved dinners yet",
      message:
        "Add a few meals and Hearth will start picking dinner for you.",
      actionLabel: "Add a meal"
    };
  }

  return {
    title: "No dinner picks tonight",
    message:
      "Your saved meals don't have enough dinner options yet. Analyze or save a dinner to get a recommendation.",
    actionLabel: "Browse saved meals"
  };
}

export function getDinnerConciergeViewModel(
  input: DinnerConciergeInput
): DinnerConciergeViewModel {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const state = normalizeRefinementState(input.refinements);
  const context = buildContext(generatedAt, state);
  const mealsById = new Map(input.meals.map((meal) => [meal.id, meal]));

  const ranked = rankRecommendationsForCategory(input.meals, "Dinner", {
    generatedAt,
    feedbackByMealId: input.feedbackByMealId,
    context
  });

  // Apply the attribute-based refinement bias and re-sort. Deterministic:
  // refinement-adjusted score desc, then meal name.
  const adjusted = ranked
    .map((rankedMeal) => {
      const meal = mealsById.get(rankedMeal.meal.id);
      return meal ? { ranked: rankedMeal, meal } : null;
    })
    .filter(
      (entry): entry is { ranked: MealRecommendation; meal: DinnerConciergeMeal } =>
        entry !== null
    )
    .map((entry) => ({
      ...entry,
      adjustedScore: entry.ranked.score + computeRefinementScore(entry.meal, state)
    }))
    .sort((left, right) => {
      if (right.adjustedScore !== left.adjustedScore) {
        return right.adjustedScore - left.adjustedScore;
      }
      return left.meal.mealName.localeCompare(right.meal.mealName);
    });

  if (adjusted.length === 0) {
    return {
      generatedAt,
      leadRecommendation: null,
      alternates: [],
      freshIdeas: [],
      activeRefinements: state,
      availableRefinements: dinnerConciergeRefinements,
      emptyState: buildEmptyState(input.meals.length)
    };
  }

  const leadEntry = adjusted[0];
  const leadRecommendation = toRecommendation(
    leadEntry.ranked,
    leadEntry.meal,
    state
  );
  const alternateEntries = adjusted.slice(1, 3);
  const alternates = alternateEntries.map((entry) =>
    toRecommendation(entry.ranked, entry.meal, state)
  );

  const excludedMealIds = new Set<string>([
    leadEntry.meal.id,
    ...alternateEntries.map((entry) => entry.meal.id)
  ]);
  const freshIdeas = buildFreshIdeas(
    adjusted.map((entry) => ({ ranked: entry.ranked, meal: entry.meal })),
    excludedMealIds,
    leadRecommendation.cuisine,
    input.feedbackByMealId,
    generatedAt,
    state
  );

  return {
    generatedAt,
    leadRecommendation,
    alternates,
    freshIdeas,
    activeRefinements: state,
    availableRefinements: dinnerConciergeRefinements
  };
}
