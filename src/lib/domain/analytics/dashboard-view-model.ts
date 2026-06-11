import {
  aggregateNutritionTotals,
  averageNutritionTotals,
  averageMealQuality,
  buildNutritionCompleteness,
  buildNutritionSourceMix,
  buildQualitySampleSummary,
  buildRecentMeals,
  calculateCalorieVariance,
  calculateVarianceLabel,
  getDailyTotalsForMetric,
  getSevenDayWindow,
  findBestMeal,
  findHighestOpportunityMeal,
  isMealInInclusiveDateRange,
  isMealOnDate
} from "@/src/lib/domain/analytics/aggregate-meals";
import { generateDashboardInsights } from "@/src/lib/domain/analytics/insights";
import {
  DEFAULT_NUTRITION_TARGETS,
  type AnalyticsMeal,
  type DashboardViewModel,
  type NutritionTargets
} from "@/src/lib/domain/analytics/types";

export function buildDashboardViewModel(
  meals: AnalyticsMeal[],
  options?: {
    generatedAt?: string;
    targets?: NutritionTargets;
    recentMealLimit?: number;
  }
): DashboardViewModel {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const todayDate = generatedAt.slice(0, 10);
  const targets = options?.targets ?? DEFAULT_NUTRITION_TARGETS;
  const weekWindow = getSevenDayWindow(generatedAt);
  const todayMeals = meals.filter((meal) => isMealOnDate(meal, todayDate));
  const weekMeals = meals.filter((meal) =>
    isMealInInclusiveDateRange(meal, weekWindow.startDate, weekWindow.endDate)
  );
  const todayTotals = aggregateNutritionTotals(todayMeals);
  const weekTotals = aggregateNutritionTotals(weekMeals);
  const todayQualitySample = buildQualitySampleSummary(todayMeals, 1);
  const weekQualitySample = buildQualitySampleSummary(weekMeals, 2);
  const dashboardWithoutInsights = {
    generatedAt,
    today: {
      date: todayDate,
      mealCount: todayMeals.length,
      totals: todayTotals,
      targets,
      progress: {
        caloriesPct: percentOfTarget(todayTotals.calories, targets.calories),
        proteinPct: percentOfTarget(todayTotals.protein, targets.protein),
        fiberPct: percentOfTarget(todayTotals.fiber, targets.fiber)
      },
      averageQualityScore: averageMealQuality(todayMeals, 1),
      nutritionCompleteness: buildNutritionCompleteness(todayMeals),
      qualitySample: todayQualitySample,
      sourceMix: buildNutritionSourceMix(todayMeals)
    },
    week: {
      startDate: weekWindow.startDate,
      endDate: weekWindow.endDate,
      mealCount: weekMeals.length,
      dailyAverages: averageNutritionTotals(weekTotals, 7),
      totals: weekTotals,
      trends: {
        proteinConsistency: calculateVarianceLabel(
          getDailyTotalsForMetric(
            weekMeals,
            weekWindow.startDate,
            weekWindow.endDate,
            "protein"
          )
        ),
        fiberConsistency: calculateVarianceLabel(
          getDailyTotalsForMetric(
            weekMeals,
            weekWindow.startDate,
            weekWindow.endDate,
            "fiber"
          )
        ),
        calorieVariance: calculateCalorieVariance(
          getDailyTotalsForMetric(
            weekMeals,
            weekWindow.startDate,
            weekWindow.endDate,
            "calories"
          )
        )
      },
      averageQualityScore: averageMealQuality(weekMeals, 2),
      nutritionCompleteness: buildNutritionCompleteness(weekMeals),
      qualitySample: weekQualitySample,
      sourceMix: buildNutritionSourceMix(weekMeals)
    },
    recentMeals: buildRecentMeals(meals, options?.recentMealLimit ?? 5),
    quality: {
      bestRecentMeal: findBestMeal(meals),
      highestOpportunityMeal: findHighestOpportunityMeal(meals)
    }
  };

  return {
    ...dashboardWithoutInsights,
    insights: generateDashboardInsights(dashboardWithoutInsights)
  };
}

function percentOfTarget(value: number | null, target: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || target <= 0) {
    return null;
  }

  return Math.round((value / target) * 100);
}
