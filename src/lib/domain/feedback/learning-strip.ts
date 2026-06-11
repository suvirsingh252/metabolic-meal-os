import type {
  MealFeedbackSummary,
  MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback/summary";

export interface HouseholdLearningStripItem {
  id: "eaten" | "loved";
  text: string;
}

export interface HouseholdLearningStripViewModel {
  hasRecentFeedback: boolean;
  headline: string;
  items: HouseholdLearningStripItem[];
  emptyText: string;
}

const recentFeedbackWindowDays = 14;

function getDaysSinceDate(value: string | null, generatedAt: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const generatedDate = new Date(generatedAt);

  if (Number.isNaN(date.getTime()) || Number.isNaN(generatedDate.getTime())) {
    return null;
  }

  return Math.floor(
    (generatedDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function isRecent(value: string | null, generatedAt: string) {
  const daysSince = getDaysSinceDate(value, generatedAt);

  return daysSince !== null && daysSince >= 0 && daysSince <= recentFeedbackWindowDays;
}

function pluralizeMeal(count: number) {
  return count === 1 ? "meal" : "meals";
}

function buildItem(id: HouseholdLearningStripItem["id"], count: number) {
  if (id === "loved") {
    return {
      id,
      text: `${count} ${pluralizeMeal(count)} loved recently.`
    };
  }

  return {
    id,
    text: `${count} ${pluralizeMeal(count)} marked Ate This recently.`
  };
}

function hasRecentLovedSignal(summary: MealFeedbackSummary, generatedAt: string) {
  return (
    summary.lovedCount > 0 &&
    (isRecent(summary.lastPositiveAt, generatedAt) ||
      isRecent(summary.lastEatenAt, generatedAt))
  );
}

export function buildHouseholdLearningStrip(
  feedbackByMealId: MealFeedbackSummaryByMealId,
  options: {
    generatedAt?: string;
  } = {}
): HouseholdLearningStripViewModel {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const summaries = Object.values(feedbackByMealId);
  const eatenMealCount = summaries.filter(
    (summary) => summary.eatenCount > 0 && isRecent(summary.lastEatenAt, generatedAt)
  ).length;
  const lovedMealCount = summaries.filter((summary) =>
    hasRecentLovedSignal(summary, generatedAt)
  ).length;
  const items: HouseholdLearningStripItem[] = [];

  if (eatenMealCount > 0) {
    items.push(buildItem("eaten", eatenMealCount));
  }

  if (lovedMealCount > 0) {
    items.push(buildItem("loved", lovedMealCount));
  }

  return {
    hasRecentFeedback: items.length > 0,
    headline:
      items.length > 0
        ? "Recent feedback is helping tune today's recommendations."
        : "No recent household feedback yet.",
    items,
    emptyText: "Tap Ate This or Loved It on a meal to start teaching Today."
  };
}
