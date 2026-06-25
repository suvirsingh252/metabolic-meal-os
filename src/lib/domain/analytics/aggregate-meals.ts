import type {
  AnalyticsMeal,
  DashboardMealSummary,
  NutritionCompleteness,
  NutritionMetric,
  NutritionSourceMix,
  NutritionTotals,
  QualitySampleSummary,
  TrendLabel
} from "@/src/lib/domain/analytics/types";
import { scoreMealQuality } from "@/src/lib/domain/analytics/quality";

export const nutritionMetrics: NutritionMetric[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sodium",
  "sugar"
];

export function emptyNutritionTotals(): NutritionTotals {
  return {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sodium: null,
    sugar: null
  };
}

function toDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function getSevenDayWindow(generatedAt: string) {
  const end = startOfUtcDay(new Date(generatedAt));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

export function isMealOnDate(meal: AnalyticsMeal, date: string) {
  return toDateKey(meal.loggedAt) === date;
}

export function isMealInInclusiveDateRange(
  meal: AnalyticsMeal,
  startDate: string,
  endDate: string
) {
  const mealDate = toDateKey(meal.loggedAt);

  return Boolean(mealDate && mealDate >= startDate && mealDate <= endDate);
}

export function aggregateNutritionTotals(meals: AnalyticsMeal[]): NutritionTotals {
  const totals = emptyNutritionTotals();
  const knownCounts = Object.fromEntries(
    nutritionMetrics.map((metric) => [metric, 0])
  ) as Record<NutritionMetric, number>;

  for (const meal of meals) {
    for (const metric of nutritionMetrics) {
      const value = meal.nutrition[metric];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }

      totals[metric] = (totals[metric] ?? 0) + value;
      knownCounts[metric] += 1;
    }
  }

  for (const metric of nutritionMetrics) {
    if (knownCounts[metric] === 0) {
      totals[metric] = null;
    }
  }

  return totals;
}

export function averageNutritionTotals(
  totals: NutritionTotals,
  dayCount: number
): NutritionTotals {
  const averages = emptyNutritionTotals();

  for (const metric of nutritionMetrics) {
    const value = totals[metric];
    averages[metric] =
      typeof value === "number" && dayCount > 0
        ? roundToOne(value / dayCount)
        : null;
  }

  return averages;
}

export function sortMealsByLoggedAtDesc(meals: AnalyticsMeal[]) {
  return [...meals].sort((left, right) => {
    const rightTime = Date.parse(right.loggedAt);
    const leftTime = Date.parse(left.loggedAt);

    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export function buildRecentMeals(
  meals: AnalyticsMeal[],
  limit = 5
): DashboardMealSummary[] {
  return sortMealsByLoggedAtDesc(meals)
    .slice(0, limit)
    .map((meal) => ({
      ...qualityFields(meal),
      id: meal.id,
      name: meal.name,
      loggedAt: meal.loggedAt,
      calories: numericOrNull(meal.nutrition.calories),
      protein: numericOrNull(meal.nutrition.protein),
      confidence: meal.confidence ?? null,
      provenance: meal.provenance ?? meal.source ?? null,
      url: meal.url ?? null,
      imageUrl: meal.imageUrl ?? null
    }));
}

export function averageMealQuality(meals: AnalyticsMeal[], minScoredMeals = 1) {
  const scores = meals
    .map((meal) => scoreMealQuality(meal).score)
    .filter((score): score is number => typeof score === "number");

  if (scores.length < minScoredMeals) {
    return null;
  }

  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length
  );
}

export function findBestMeal(meals: AnalyticsMeal[]) {
  return findMealByQuality(meals, "best");
}

export function findHighestOpportunityMeal(meals: AnalyticsMeal[]) {
  return findMealByQuality(meals, "opportunity");
}

function findMealByQuality(meals: AnalyticsMeal[], mode: "best" | "opportunity") {
  const scoredMeals = meals
    .map((meal) => ({ meal, score: scoreMealQuality(meal).score }))
    .filter((item): item is { meal: AnalyticsMeal; score: number } =>
      typeof item.score === "number"
    );

  if (scoredMeals.length < 2) {
    return null;
  }

  scoredMeals.sort((left, right) =>
    mode === "best" ? right.score - left.score : left.score - right.score
  );

  return buildRecentMeals([scoredMeals[0].meal], 1)[0] ?? null;
}

export function buildNutritionCompleteness(
  meals: AnalyticsMeal[]
): NutritionCompleteness {
  return Object.fromEntries(
    nutritionMetrics.map((metric) => {
      const knownMeals = meals.filter((meal) =>
        isKnownNumber(meal.nutrition[metric])
      ).length;

      return [
        metric,
        {
          knownMeals,
          totalMeals: meals.length,
          label: sampleLabel(knownMeals, meals.length, "meals")
        }
      ];
    })
  ) as NutritionCompleteness;
}

export function buildQualitySampleSummary(
  meals: AnalyticsMeal[],
  minScoredMeals = 2
): QualitySampleSummary {
  const scoredMeals = meals.filter(
    (meal) => typeof scoreMealQuality(meal).score === "number"
  ).length;

  return {
    scoredMeals,
    totalMeals: meals.length,
    isEnoughData: scoredMeals >= minScoredMeals,
    label:
      scoredMeals >= minScoredMeals
        ? `Based on ${scoredMeals} of ${meals.length} meals`
        : scoredMeals === 0
          ? "No scored meals yet"
          : `Based on ${scoredMeals} meal; more data needed`
  };
}

export function buildNutritionSourceMix(meals: AnalyticsMeal[]): NutritionSourceMix {
  const mix: NutritionSourceMix = {
    structured: 0,
    estimated: 0,
    reviewed: 0,
    userEntered: 0,
    backfilled: 0,
    missingNutrition: 0
  };

  for (const meal of meals) {
    if (!hasKnownNutrition(meal)) {
      mix.missingNutrition += 1;
      continue;
    }

    const evidence = [meal.source, meal.confidence, meal.provenance]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      evidence.includes("recipe") ||
      evidence.includes("json-ld") ||
      evidence.includes("structured")
    ) {
      mix.structured += 1;
      if (evidence.includes("notion-backfill")) {
        mix.backfilled += 1;
      }
    } else if (evidence.includes("user-entered")) {
      mix.userEntered += 1;
      if (evidence.includes("notion-backfill")) {
        mix.backfilled += 1;
      }
    } else if (
      evidence.includes("reviewed") ||
      evidence.includes("manual") ||
      evidence.includes("edited during meal review")
    ) {
      mix.reviewed += 1;
      if (evidence.includes("notion-backfill")) {
        mix.backfilled += 1;
      }
    } else if (evidence.includes("estimated") || evidence.includes("free-text")) {
      mix.estimated += 1;
      if (evidence.includes("notion-backfill")) {
        mix.backfilled += 1;
      }
    } else {
      mix.backfilled += 1;
    }
  }

  return mix;
}

function qualityFields(meal: AnalyticsMeal) {
  const quality = scoreMealQuality(meal);

  return {
    qualityScore: quality.score,
    qualityLabel: quality.label
  };
}

export function calculateVarianceLabel(values: Array<number | null>): TrendLabel {
  const numericValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  if (numericValues.length < 2) {
    return "unknown";
  }

  const mean =
    numericValues.reduce((total, value) => total + value, 0) / numericValues.length;

  if (mean === 0) {
    return "low";
  }

  const variance =
    numericValues.reduce((total, value) => total + (value - mean) ** 2, 0) /
    numericValues.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;

  if (coefficientOfVariation < 0.2) {
    return "high";
  }

  if (coefficientOfVariation < 0.45) {
    return "moderate";
  }

  return "low";
}

export function calculateCalorieVariance(values: Array<number | null>): TrendLabel {
  const consistency = calculateVarianceLabel(values);

  if (consistency === "high") {
    return "low";
  }

  if (consistency === "low") {
    return "high";
  }

  return consistency;
}

export function getDailyTotalsForMetric(
  meals: AnalyticsMeal[],
  startDate: string,
  endDate: string,
  metric: NutritionMetric
) {
  const totalsByDate = new Map<string, number | null>();
  const date = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (date <= end) {
    totalsByDate.set(date.toISOString().slice(0, 10), null);
    date.setUTCDate(date.getUTCDate() + 1);
  }

  for (const meal of meals) {
    const dateKey = toDateKey(meal.loggedAt);
    const value = meal.nutrition[metric];

    if (
      !dateKey ||
      !totalsByDate.has(dateKey) ||
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      continue;
    }

    totalsByDate.set(dateKey, (totalsByDate.get(dateKey) ?? 0) + value);
  }

  return Array.from(totalsByDate.values());
}

function numericOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isKnownNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

function hasKnownNutrition(meal: AnalyticsMeal) {
  return nutritionMetrics.some((metric) => isKnownNumber(meal.nutrition[metric]));
}

function sampleLabel(knownMeals: number, totalMeals: number, noun: string) {
  if (totalMeals === 0) {
    return `No ${noun} logged`;
  }

  if (knownMeals === 0) {
    return "No nutrition totals saved yet";
  }

  return `Based on ${knownMeals} of ${totalMeals} ${noun}`;
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}
