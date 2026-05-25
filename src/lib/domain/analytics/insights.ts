import type {
  DashboardInsight,
  DashboardViewModel
} from "@/src/lib/domain/analytics/types";

export function generateDashboardInsights(
  dashboard: Omit<DashboardViewModel, "insights">
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  const proteinAverage = dashboard.week.dailyAverages.protein;
  const fiberAverage = dashboard.week.dailyAverages.fiber;
  const sodiumToday = dashboard.today.totals.sodium;

  if (dashboard.today.mealCount === 0) {
    insights.push({
      id: "no-meals-today",
      severity: "info",
      title: "No meals logged yet today.",
      message: "Today has no saved meals in the dashboard.",
      action: "Analyze or save your first meal.",
      metric: "mealCount"
    });
  }

  if (
    typeof proteinAverage === "number" &&
    proteinAverage < dashboard.today.targets.protein * 0.8
  ) {
    insights.push({
      id: "protein-low-week",
      severity: "warning",
      title: "Protein has been below target this week.",
      message: "The 7-day average is under 80% of the current protein target.",
      action: "Prioritize a protein-forward meal next.",
      metric: "protein"
    });
  }

  if (
    typeof fiberAverage === "number" &&
    fiberAverage < dashboard.today.targets.fiber * 0.7
  ) {
    insights.push({
      id: "fiber-low-week",
      severity: "warning",
      title: "Fiber intake is trending low.",
      message: "The 7-day average is under 70% of the current fiber target.",
      action: "Add legumes, berries, oats, or vegetables to your next meal.",
      metric: "fiber"
    });
  }

  if (
    typeof sodiumToday === "number" &&
    sodiumToday > dashboard.today.targets.sodium
  ) {
    insights.push({
      id: "sodium-high-today",
      severity: "warning",
      title: "Sodium is high today.",
      message: "Today has exceeded the current sodium target.",
      action: "Choose a lower-sodium dinner or balance with whole foods.",
      metric: "sodium"
    });
  }

  if (dashboard.today.progress.proteinPct !== null && dashboard.today.progress.proteinPct >= 100) {
    insights.push({
      id: "protein-target-met",
      severity: "positive",
      title: "Protein target reached today.",
      message: "Today has reached the current protein target.",
      metric: "protein"
    });
  }

  if (dashboard.today.progress.fiberPct !== null && dashboard.today.progress.fiberPct >= 100) {
    insights.push({
      id: "fiber-target-met",
      severity: "positive",
      title: "Fiber target reached today.",
      message: "Today has reached the current fiber target.",
      metric: "fiber"
    });
  }

  return insights.slice(0, 5);
}
