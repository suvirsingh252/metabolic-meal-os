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
import {
  buildMealIntelligence,
  type MealIntelligence
} from "@/src/lib/domain/meal-intelligence";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

export interface MealDetailNutritionItem {
  id: string;
  label: string;
  value: number | null;
  unit: string;
}

export type MealOsNutritionConfidence =
  | "Imported"
  | "Estimated"
  | "Manual"
  | "Unknown";

export interface MealOsSummaryViewModel {
  quickVerdict: string | null;
  whyItWorks: string | null;
  optimization: string | null;
  nutritionConfidence: MealOsNutritionConfidence;
  familyConsideration: string | null;
  hasContent: boolean;
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
  mealOsSummary: MealOsSummaryViewModel;
  intelligence: MealIntelligence;
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
    imageUrl: meal.imageUrl,
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
    qualityScore: meal.qualityScore,
    proteinLevel: meal.proteinLevel,
    satietyLevel: meal.satietyLevel,
    bloodSugarImpact: meal.bloodSugarImpact,
    effortLevel: meal.effortLevel,
    notes: meal.notes,
    ingredientsText: meal.ingredientsText,
    instructionsText: meal.instructionsText,
    metabolicScore: meal.metabolicScore,
    proteinScore: meal.proteinScore,
    fiberScore: meal.fiberScore,
    satietyScoreNumeric: meal.satietyScoreNumeric,
    bloodSugarRiskScore: meal.bloodSugarRiskScore
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

function normalizeNotesLine(value: string) {
  return value.replace(/\[Truncated for Notion rich_text limit\]/gi, "").trim();
}

function extractNotesSection(notes: string | null, heading: string) {
  if (!notes) {
    return null;
  }

  const target = heading.toLowerCase();
  const lines = notes.split(/\r?\n/);
  const collected: string[] = [];
  let active = false;

  for (const line of lines) {
    const trimmed = normalizeNotesLine(line);
    const headingMatch = trimmed.match(/^([^:]+):$/);

    if (headingMatch) {
      if (active) {
        break;
      }

      active = headingMatch[1].trim().toLowerCase() === target;
      continue;
    }

    if (active && trimmed) {
      collected.push(trimmed.replace(/^\s*[-*]\s+/, "").trim());
    }
  }

  const value = collected.join(" ").trim();

  return value || null;
}

function normalizeNutritionConfidence(meal: MealSummary): MealOsNutritionConfidence {
  const source = meal.nutritionSource?.toLowerCase() ?? "";
  const provenance = meal.nutritionProvenance?.toLowerCase() ?? "";
  const confidence = meal.nutritionConfidence?.toLowerCase() ?? "";
  const combined = `${source} ${provenance} ${confidence}`;

  if (
    combined.includes("user-entered") ||
    combined.includes("manual") ||
    combined.includes("manually")
  ) {
    return "Manual";
  }

  if (
    combined.includes("recipe-json-ld") ||
    combined.includes("import") ||
    combined.includes("parsed")
  ) {
    return "Imported";
  }

  if (
    combined.includes("estimated") ||
    combined.includes("notion-backfill") ||
    combined.includes("backfill") ||
    ["high", "medium", "low"].includes(confidence)
  ) {
    return "Estimated";
  }

  return "Unknown";
}

function firstUsefulReason(reasons: string[]) {
  return reasons.map((reason) => reason.trim()).find(Boolean) ?? null;
}

function buildFamilyConsideration(
  meal: MealSummary,
  feedbackReasons: string[],
  feedbackSummary: MealFeedbackSummary
) {
  const feedbackReason = firstUsefulReason(feedbackReasons);

  if (feedbackReason) {
    return feedbackReason;
  }

  if (feedbackSummary.recentNotes.length > 0) {
    const note = feedbackSummary.recentNotes
      .map((value) => value.trim())
      .find((value) => value.length > 0);

    if (note) {
      return note;
    }
  }

  if (meal.familyApproved) {
    return "Marked family approved.";
  }

  if (meal.weeknightFriendly) {
    return "Marked weeknight friendly.";
  }

  if (meal.comfortMeal) {
    return "Marked as a comfort meal.";
  }

  return null;
}

function buildMealOsSummary(
  meal: MealSummary,
  whyReasons: string[],
  feedbackReasons: string[],
  feedbackSummary: MealFeedbackSummary
): MealOsSummaryViewModel {
  const quickVerdict = extractNotesSection(meal.notes, "Quick Verdict");
  const whyItWorks =
    extractNotesSection(meal.notes, "Plate Strategy") ?? firstUsefulReason(whyReasons);
  const optimization = meal.optimizedVersion?.trim() || null;
  const familyConsideration = buildFamilyConsideration(
    meal,
    feedbackReasons,
    feedbackSummary
  );
  const nutritionConfidence = normalizeNutritionConfidence(meal);

  return {
    quickVerdict,
    whyItWorks,
    optimization,
    nutritionConfidence,
    familyConsideration,
    hasContent: Boolean(
      quickVerdict ||
        whyItWorks ||
        optimization ||
        familyConsideration ||
        nutritionConfidence !== "Unknown"
    )
  };
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
  const feedbackReasons = buildFeedbackReasons(feedbackSummary);
  const intelligence = buildMealIntelligence(
    meal,
    meals,
    feedbackSummary.totalEvents > 0 ? feedbackSummary : null
  );

  return {
    meal,
    feedbackSummary,
    sourceBadge: meal.nutritionSource ?? meal.cuisine ?? "Saved meal",
    confidenceBadge: meal.nutritionConfidence,
    dateLabel: feedbackSummary.lastEatenAt ?? meal.createdAt ?? null,
    whyReasons,
    feedbackReasons,
    nutritionItems,
    nutritionProvenance: meal.nutritionProvenance ?? meal.nutritionSource,
    hasNutritionData: nutritionItems.some((item) => typeof item.value === "number"),
    mealOsSummary: buildMealOsSummary(
      meal,
      whyReasons,
      feedbackReasons,
      feedbackSummary
    ),
    intelligence,
    cookbook: buildMealCookbook(meal, feedbackSummary)
  };
}
