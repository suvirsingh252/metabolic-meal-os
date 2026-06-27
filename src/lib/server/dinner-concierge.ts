import {
  feedbackChipTypes,
  isFeedbackChip,
  summarizeMealChipFeedback,
  type FeedbackChip,
  type FeedbackChipEvent,
  type MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";
import {
  dinnerConciergeRefinements,
  getDinnerConciergeViewModel,
  type DinnerConciergeMeal,
  type DinnerConciergeRefinementState,
  type DinnerConciergeViewModel
} from "@/src/lib/domain/recommendations";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

const moodRefinementIds = new Set(
  dinnerConciergeRefinements.filter((option) => option.group === "mood").map((option) => option.id)
);
const cuisineRefinementIds = new Set(
  dinnerConciergeRefinements
    .filter((option) => option.group === "cuisine")
    .map((option) => option.id)
);
const timeRefinementIds = new Set(
  dinnerConciergeRefinements.filter((option) => option.group === "time").map((option) => option.id)
);
const tonightRefinementIds = new Set(
  dinnerConciergeRefinements.filter((option) => option.group === "tonight").map((option) => option.id)
);

function readListParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Parse refine chips from request query params into a refinement state, keeping
 * only ids known to the refinement catalog. Unknown ids are silently dropped so
 * a stale client cannot poison ranking.
 */
export function parseRefinementParams(
  params: URLSearchParams
): DinnerConciergeRefinementState {
  const cuisine = readListParam(params, "cuisine").filter((id) =>
    cuisineRefinementIds.has(id)
  );
  const mood = readListParam(params, "mood").filter((id) => moodRefinementIds.has(id));
  const tonight = readListParam(params, "tonight").filter((id) =>
    tonightRefinementIds.has(id)
  );
  const timeCandidate = readListParam(params, "time").find((id) =>
    timeRefinementIds.has(id)
  );

  return {
    cuisine: Array.from(new Set(cuisine)),
    mood: Array.from(new Set(mood)),
    time: timeCandidate ?? null,
    tonight: Array.from(new Set(tonight))
  };
}

/**
 * Lightweight tags derived from existing Notion meal metadata, used by the
 * concierge mood/cuisine matching. No new data is invented; we only surface
 * signals the meal already carries.
 */
function deriveTags(summary: MealSummary): string[] {
  const tags: string[] = [];

  if (summary.cuisine) {
    tags.push(summary.cuisine);
  }
  if (summary.comfortMeal) {
    tags.push("comfort");
  }
  if (summary.weeknightFriendly) {
    tags.push("quick", "weeknight");
  }
  if (summary.proteinLevel) {
    tags.push(summary.proteinLevel);
  }
  if (summary.satietyLevel) {
    tags.push(summary.satietyLevel);
  }

  return tags;
}

/**
 * Map a Notion-backed MealSummary to the concierge input shape.
 *
 * Metadata gap decisions:
 * - estimatedMinutes: Notion meals carry no explicit time, so this stays null
 *   (honest); the view model derives a time-band proxy from effortLevel.
 * - imageUrl: sourced from the recipe image pipeline, with UI placeholder fallback.
 * - tags: derived from existing fields (cuisine/effort/protein/satiety signals).
 */
export function mapMealSummaryToConciergeMeal(
  summary: MealSummary
): DinnerConciergeMeal {
  return {
    id: summary.id,
    url: summary.url,
    mealName: summary.mealName,
    createdAt: summary.createdAt,
    cuisine: summary.cuisine,
    mealType: summary.mealType,
    familyApproved: summary.familyApproved,
    weeknightFriendly: summary.weeknightFriendly,
    comfortMeal: summary.comfortMeal,
    calories: summary.calories,
    proteinG: summary.proteinG,
    carbohydratesG: summary.carbohydratesG,
    fatG: summary.fatG,
    fiberG: summary.fiberG,
    qualityScore: summary.qualityScore,
    proteinLevel: summary.proteinLevel,
    satietyLevel: summary.satietyLevel,
    bloodSugarImpact: summary.bloodSugarImpact,
    effortLevel: summary.effortLevel,
    notes: summary.notes,
    ingredientsText: summary.ingredientsText,
    instructionsText: summary.instructionsText,
    metabolicScore: summary.metabolicScore,
    proteinScore: summary.proteinScore,
    fiberScore: summary.fiberScore,
    satietyScoreNumeric: summary.satietyScoreNumeric,
    bloodSugarRiskScore: summary.bloodSugarRiskScore,
    imageUrl: summary.imageUrl ?? null,
    estimatedMinutes: null,
    tags: deriveTags(summary)
  };
}

export interface DinnerConciergeSources {
  meals: MealSummary[];
  feedbackEvents?: FeedbackChipEvent[];
  refinements?: DinnerConciergeRefinementState;
  generatedAt?: string;
}

/**
 * Compose the Dinner Concierge view model from raw sources (Notion meals +
 * Postgres chip feedback events). Pure and side-effect free so route handlers
 * stay thin and this stays unit-testable.
 */
export function buildDinnerConciergeViewModel(
  sources: DinnerConciergeSources
): DinnerConciergeViewModel {
  const feedbackByMealId: MealFeedbackSummaryByMealId = summarizeMealChipFeedback(
    sources.feedbackEvents ?? []
  );

  return getDinnerConciergeViewModel({
    meals: sources.meals.map(mapMealSummaryToConciergeMeal),
    feedbackByMealId,
    refinements: sources.refinements,
    generatedAt: sources.generatedAt
  });
}

export interface DinnerFeedbackRequest {
  mealId: string;
  chips: FeedbackChip[];
  createdBy: string | null;
}

export type DinnerFeedbackValidation =
  | { ok: true; value: DinnerFeedbackRequest }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validate a feedback submission body. Accepts one or more chip keys and an
 * optional createdBy. Duplicate chips in a single submission are de-duplicated.
 */
export function validateDinnerFeedbackRequest(
  body: unknown
): DinnerFeedbackValidation {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  if (typeof body.mealId !== "string" || body.mealId.trim().length === 0) {
    return { ok: false, message: "mealId is required." };
  }

  if (!Array.isArray(body.chips) || body.chips.length === 0) {
    return { ok: false, message: "chips must be a non-empty array." };
  }

  const invalid = body.chips.find((chip) => !isFeedbackChip(chip));
  if (invalid !== undefined) {
    return {
      ok: false,
      message: `Unsupported chip: ${String(invalid)}. Allowed: ${feedbackChipTypes.join(", ")}.`
    };
  }

  if (
    body.createdBy !== undefined &&
    body.createdBy !== null &&
    typeof body.createdBy !== "string"
  ) {
    return { ok: false, message: "createdBy must be a string or null." };
  }

  const chips = Array.from(new Set(body.chips as FeedbackChip[]));
  const createdBy =
    typeof body.createdBy === "string" && body.createdBy.trim().length > 0
      ? body.createdBy.trim()
      : null;

  return {
    ok: true,
    value: { mealId: body.mealId.trim(), chips, createdBy }
  };
}
