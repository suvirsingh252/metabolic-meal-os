import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardViewModel } from "@/src/lib/domain/analytics";
import type { AnalyticsMeal } from "@/src/lib/domain/analytics";

const generatedAt = "2026-05-25T12:00:00.000Z";

function meal(
  id: string,
  loggedAt: string,
  nutrition: AnalyticsMeal["nutrition"],
  overrides: Partial<AnalyticsMeal> = {}
): AnalyticsMeal {
  return {
    id,
    name: id,
    loggedAt,
    nutrition,
    ...overrides
  };
}

test("buildDashboardViewModel handles empty meal list", () => {
  const dashboard = buildDashboardViewModel([], { generatedAt });

  assert.equal(dashboard.today.date, "2026-05-25");
  assert.equal(dashboard.today.mealCount, 0);
  assert.equal(dashboard.week.mealCount, 0);
  assert.equal(dashboard.today.totals.calories, null);
  assert.ok(
    dashboard.insights.some((insight) => insight.id === "no-meals-today")
  );
});

test("buildDashboardViewModel aggregates today and 7-day nutrition", () => {
  const dashboard = buildDashboardViewModel(
    [
      meal("today-breakfast", "2026-05-25T08:00:00.000Z", {
        calories: 500,
        protein: 30,
        fiber: 8
      }),
      meal("today-lunch", "2026-05-25T12:00:00.000Z", {
        calories: 700,
        protein: 40,
        fiber: 10
      }),
      meal("week", "2026-05-20T12:00:00.000Z", {
        calories: 600,
        protein: 20,
        fiber: 4
      }),
      meal("old", "2026-05-10T12:00:00.000Z", {
        calories: 900,
        protein: 50,
        fiber: 12
      })
    ],
    { generatedAt }
  );

  assert.equal(dashboard.today.mealCount, 2);
  assert.equal(dashboard.today.totals.calories, 1200);
  assert.equal(dashboard.today.totals.protein, 70);
  assert.equal(dashboard.week.mealCount, 3);
  assert.equal(dashboard.week.totals.calories, 1800);
  assert.equal(dashboard.week.dailyAverages.calories, 257.1);
  assert.equal(dashboard.week.nutritionCompleteness.calories.label, "Based on 3 of 3 meals");
});

test("buildDashboardViewModel preserves missing nutrition as null", () => {
  const dashboard = buildDashboardViewModel(
    [meal("missing", generatedAt, { protein: 0 })],
    { generatedAt }
  );

  assert.equal(dashboard.today.totals.protein, 0);
  assert.equal(dashboard.today.totals.calories, null);
  assert.equal(dashboard.today.progress.caloriesPct, null);
});

test("weekly quality needs enough scored meals before showing an average", () => {
  const dashboard = buildDashboardViewModel(
    [
      meal("one-scored", generatedAt, {}, { qualityScore: 80 }),
      meal("unscored", "2026-05-24T12:00:00.000Z", {})
    ],
    { generatedAt }
  );

  assert.equal(dashboard.week.averageQualityScore, null);
  assert.equal(dashboard.week.qualitySample.scoredMeals, 1);
  assert.equal(dashboard.week.qualitySample.isEnoughData, false);
  assert.equal(dashboard.week.qualitySample.label, "Based on 1 meal; more data needed");
  assert.equal(dashboard.quality.bestRecentMeal, null);
});

test("dashboard view model exposes source mix counts", () => {
  const dashboard = buildDashboardViewModel(
    [
      meal("recipe", generatedAt, { calories: 500 }, { source: "recipe" }),
      meal("manual", generatedAt, { calories: 300 }, { source: "user-entered" }),
      meal("missing", generatedAt, {})
    ],
    { generatedAt }
  );

  assert.equal(dashboard.today.sourceMix.structured, 1);
  assert.equal(dashboard.today.sourceMix.userEntered, 1);
  assert.equal(dashboard.today.sourceMix.missingNutrition, 1);
});
