import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateNutritionTotals,
  buildNutritionCompleteness,
  buildRecentMeals,
  buildNutritionSourceMix,
  getSevenDayWindow,
  isMealInInclusiveDateRange,
  isMealOnDate
} from "@/src/lib/domain/analytics";
import type { AnalyticsMeal } from "@/src/lib/domain/analytics";

const generatedAt = "2026-05-25T12:00:00.000Z";

function meal(
  overrides: Partial<AnalyticsMeal> & Pick<AnalyticsMeal, "id" | "loggedAt">
): AnalyticsMeal {
  return {
    id: overrides.id,
    name: overrides.name ?? `Meal ${overrides.id}`,
    loggedAt: overrides.loggedAt,
    nutrition: overrides.nutrition ?? {},
    url: overrides.url,
    confidence: overrides.confidence,
    source: overrides.source,
    provenance: overrides.provenance
  };
}

test("aggregateNutritionTotals returns null totals for empty meal list", () => {
  assert.deepEqual(aggregateNutritionTotals([]), {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sodium: null,
    sugar: null
  });
});

test("nutrition completeness counts partial rows without treating null as zero", () => {
  const completeness = buildNutritionCompleteness([
    meal({
      id: "1",
      loggedAt: generatedAt,
      nutrition: { calories: 400, protein: null, fiber: 6 }
    }),
    meal({
      id: "2",
      loggedAt: generatedAt,
      nutrition: { protein: 20 }
    }),
    meal({ id: "3", loggedAt: generatedAt, nutrition: {} })
  ]);

  assert.equal(completeness.calories.knownMeals, 1);
  assert.equal(completeness.protein.knownMeals, 1);
  assert.equal(completeness.fiber.label, "Based on 1 of 3 meals");
  assert.equal(completeness.sodium.label, "No nutrition totals saved yet");
});

test("source mix counts structured, estimated, reviewed, backfilled, and missing meals", () => {
  const mix = buildNutritionSourceMix([
    meal({
      id: "structured",
      loggedAt: generatedAt,
      source: "recipe-json-ld",
      nutrition: { calories: 500 }
    }),
    meal({
      id: "estimated",
      loggedAt: generatedAt,
      source: "estimated",
      nutrition: { calories: 400 }
    }),
    meal({
      id: "reviewed",
      loggedAt: generatedAt,
      provenance: "edited during meal review",
      nutrition: { protein: 25 }
    }),
    meal({
      id: "backfilled",
      loggedAt: generatedAt,
      provenance: "notion-backfill: partial saved nutrition fields",
      nutrition: { fiber: 8 }
    }),
    meal({ id: "missing", loggedAt: generatedAt, nutrition: {} })
  ]);

  assert.deepEqual(mix, {
    structured: 1,
    estimated: 1,
    reviewed: 1,
    userEntered: 0,
    backfilled: 1,
    missingNutrition: 1
  });
});

test("aggregateNutritionTotals distinguishes zero from unknown values", () => {
  const totals = aggregateNutritionTotals([
    meal({
      id: "1",
      loggedAt: generatedAt,
      nutrition: { calories: 0, protein: null, fiber: 5 }
    }),
    meal({
      id: "2",
      loggedAt: generatedAt,
      nutrition: { calories: 500, protein: 20 }
    })
  ]);

  assert.equal(totals.calories, 500);
  assert.equal(totals.protein, 20);
  assert.equal(totals.fiber, 5);
  assert.equal(totals.sodium, null);
});

test("date helpers identify today and 7-day meal windows", () => {
  const todayMeal = meal({ id: "today", loggedAt: generatedAt });
  const weekMeal = meal({ id: "week", loggedAt: "2026-05-19T23:00:00.000Z" });
  const oldMeal = meal({ id: "old", loggedAt: "2026-05-18T23:00:00.000Z" });
  const window = getSevenDayWindow(generatedAt);

  assert.equal(window.startDate, "2026-05-19");
  assert.equal(window.endDate, "2026-05-25");
  assert.equal(isMealOnDate(todayMeal, "2026-05-25"), true);
  assert.equal(
    isMealInInclusiveDateRange(weekMeal, window.startDate, window.endDate),
    true
  );
  assert.equal(
    isMealInInclusiveDateRange(oldMeal, window.startDate, window.endDate),
    false
  );
});

test("buildRecentMeals sorts meals by logged date descending", () => {
  const recentMeals = buildRecentMeals([
    meal({ id: "old", loggedAt: "2026-05-20T12:00:00.000Z" }),
    meal({ id: "new", loggedAt: "2026-05-25T12:00:00.000Z" }),
    meal({ id: "middle", loggedAt: "2026-05-22T12:00:00.000Z" })
  ]);

  assert.deepEqual(
    recentMeals.map((recentMeal) => recentMeal.id),
    ["new", "middle", "old"]
  );
});
