import {
  resolveMirrorMealId,
  saveDinnerFeedbackChip,
  upsertMirrorMealFromSummary
} from "@/src/lib/db/dinner-feedback";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import { validateDinnerFeedbackRequest } from "@/src/lib/server/dinner-concierge";

export interface DinnerFeedbackSubmissionResult {
  status: number;
  body: {
    success?: true;
    savedCount?: number;
    error?: string;
    detail?: string;
  };
}

interface DinnerFeedbackSubmissionDeps {
  getHouseholdMetadata: typeof getConfiguredHouseholdMetadata;
  queryAllMealSummaries: typeof queryAllMealSummaries;
  resolveMirrorMealId: typeof resolveMirrorMealId;
  upsertMirrorMealFromSummary: typeof upsertMirrorMealFromSummary;
  saveDinnerFeedbackChip: typeof saveDinnerFeedbackChip;
}

const defaultDeps: DinnerFeedbackSubmissionDeps = {
  getHouseholdMetadata: getConfiguredHouseholdMetadata,
  queryAllMealSummaries,
  resolveMirrorMealId,
  upsertMirrorMealFromSummary,
  saveDinnerFeedbackChip
};

export async function submitDinnerFeedback(
  body: unknown,
  deps: DinnerFeedbackSubmissionDeps = defaultDeps
): Promise<DinnerFeedbackSubmissionResult> {
  const validation = validateDinnerFeedbackRequest(body);

  if (!validation.ok) {
    return { status: 400, body: { error: validation.message } };
  }

  const { mealId, chips, createdBy } = validation.value;
  const { householdId, createdBy: defaultCreatedBy } =
    deps.getHouseholdMetadata();
  const feedbackCreatedBy = createdBy ?? defaultCreatedBy;

  let mirrorMealId = await deps.resolveMirrorMealId(mealId);

  if (!mirrorMealId) {
    const { meals } = await deps.queryAllMealSummaries();
    const meal = meals.find((candidate) => candidate.id === mealId);

    if (!meal) {
      return {
        status: 422,
        body: {
          error: "unknown meal",
          detail:
            "This meal is not available in the current dinner recommendation set."
        }
      };
    }

    mirrorMealId = await deps.upsertMirrorMealFromSummary({
      householdId,
      meal,
      createdBy: feedbackCreatedBy
    });
  }

  for (const chipType of chips) {
    await deps.saveDinnerFeedbackChip({
      householdId,
      mealId: mirrorMealId,
      chipType,
      createdBy: feedbackCreatedBy
    });
  }

  return { status: 200, body: { success: true, savedCount: chips.length } };
}
