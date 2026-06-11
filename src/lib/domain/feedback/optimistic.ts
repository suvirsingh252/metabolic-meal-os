import type {
  MealFeedbackSummary,
  MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback/summary";

export type OptimisticFeedbackAction = "ate" | "loved" | "disliked" | "repeat";
export type MealDetailFeedbackAction = OptimisticFeedbackAction;

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

export function applyOptimisticMealDetailFeedback(
  summary: MealFeedbackSummary,
  action: OptimisticFeedbackAction,
  options: {
    createdAt: string;
    note: string;
  }
): MealFeedbackSummary {
  const next: MealFeedbackSummary = {
    ...summary,
    totalEvents: summary.totalEvents + 1,
    eatenCount: summary.eatenCount + 1,
    lastEatenAt: latestDate(summary.lastEatenAt, options.createdAt),
    recentNotes: [
      options.note,
      ...summary.recentNotes.filter((note) => note !== options.note)
    ].slice(0, 3)
  };

  if (action === "loved") {
    next.lovedCount += 1;
    next.likedCount += 1;
    next.wouldRepeatCount += 1;
    next.lastPositiveAt = latestDate(next.lastPositiveAt, options.createdAt);
    next.netPreferenceScore += 8;
  } else if (action === "disliked") {
    next.dislikedCount += 1;
    next.wouldNotRepeatCount += 1;
    next.netPreferenceScore -= 5;
  } else {
    next.likedCount += 1;
    next.wouldRepeatCount += 1;
    next.lastPositiveAt = latestDate(next.lastPositiveAt, options.createdAt);
    next.netPreferenceScore += 4;
  }

  next.confidence = getConfidence(next.totalEvents);

  return next;
}

export const applyOptimisticFeedbackSummary = applyOptimisticMealDetailFeedback;

export function mergeFeedbackSummariesPreservingOptimistic(
  current: Record<string, MealFeedbackSummary>,
  incoming: Record<string, MealFeedbackSummary>
): Record<string, MealFeedbackSummary> {
  const merged = { ...incoming };

  for (const [mealId, currentSummary] of Object.entries(current)) {
    const incomingSummary = incoming[mealId];

    if (
      !incomingSummary ||
      currentSummary.totalEvents > incomingSummary.totalEvents
    ) {
      merged[mealId] = currentSummary;
    }
  }

  return merged;
}

export function restoreFeedbackSummarySnapshot(
  current: MealFeedbackSummaryByMealId,
  mealId: string,
  snapshot: MealFeedbackSummary | null
): MealFeedbackSummaryByMealId {
  const next = { ...current };

  if (snapshot) {
    next[mealId] = snapshot;
  } else {
    delete next[mealId];
  }

  return next;
}

export function preserveLocalFeedbackOverrides(
  incoming: MealFeedbackSummaryByMealId,
  current: MealFeedbackSummaryByMealId,
  mealIds: string[]
): MealFeedbackSummaryByMealId {
  const next = { ...incoming };

  for (const mealId of mealIds) {
    const localSummary = current[mealId];

    if (localSummary) {
      next[mealId] = localSummary;
    } else {
      delete next[mealId];
    }
  }

  return next;
}
