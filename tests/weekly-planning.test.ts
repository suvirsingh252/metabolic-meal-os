import assert from "node:assert/strict";
import test from "node:test";
import { generateGroceryList } from "@/src/lib/domain/grocery";
import { mergeGroceryChecklistState } from "@/src/lib/domain/grocery/checklist-state";
import {
  buildWeeklyDinnerPlanViewModel,
  getCurrentDinnerPlanWeek,
  validateWeeklyDinnerSelections
} from "@/src/lib/domain/weekly-planning";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

const chickenMealId = "01234567-89ab-cdef-0123-456789abcdef";
const pastaMealId = "fedcba98-7654-3210-fedc-ba9876543210";

function meal(overrides: Partial<MealSummary>): MealSummary {
  return {
    id: overrides.id ?? chickenMealId,
    url: overrides.url ?? "https://notion.so/meal",
    mealName: overrides.mealName ?? "Meal",
    createdAt: overrides.createdAt ?? "2026-06-24T12:00:00.000Z",
    sourceUrl: overrides.sourceUrl ?? null,
    sourceName: overrides.sourceName ?? null,
    cuisine: overrides.cuisine ?? null,
    mealType: overrides.mealType ?? "Dinner",
    proteinLevel: overrides.proteinLevel ?? null,
    satietyLevel: overrides.satietyLevel ?? null,
    bloodSugarImpact: overrides.bloodSugarImpact ?? null,
    effortLevel: overrides.effortLevel ?? null,
    familyApproved: overrides.familyApproved ?? false,
    weeknightFriendly: overrides.weeknightFriendly ?? false,
    comfortMeal: overrides.comfortMeal ?? false,
    optimizedVersion: overrides.optimizedVersion ?? null,
    notes: overrides.notes ?? null,
    ingredientsText: overrides.ingredientsText ?? null,
    instructionsText: overrides.instructionsText ?? null,
    calories: overrides.calories ?? null,
    proteinG: overrides.proteinG ?? null,
    carbohydratesG: overrides.carbohydratesG ?? null,
    fatG: overrides.fatG ?? null,
    fiberG: overrides.fiberG ?? null,
    sodiumMg: overrides.sodiumMg ?? null,
    sugarG: overrides.sugarG ?? null,
    nutritionConfidence: overrides.nutritionConfidence ?? null,
    nutritionSource: overrides.nutritionSource ?? null,
    nutritionProvenance: overrides.nutritionProvenance ?? null,
    qualityScore: overrides.qualityScore ?? null,
    metabolicScore: overrides.metabolicScore ?? null,
    proteinScore: overrides.proteinScore ?? null,
    fiberScore: overrides.fiberScore ?? null,
    energyDensityScore: overrides.energyDensityScore ?? null,
    processingScore: overrides.processingScore ?? null,
    satietyScoreNumeric: overrides.satietyScoreNumeric ?? null,
    bloodSugarRiskScore: overrides.bloodSugarRiskScore ?? null
  };
}

test("weekly dinner planner builds the current Monday-to-Sunday week", () => {
  const week = getCurrentDinnerPlanWeek(new Date("2026-06-24T12:00:00.000Z"));

  assert.equal(week.weekStartDate, "2026-06-22");
  assert.equal(week.weekEndDate, "2026-06-28");
  assert.deepEqual(
    week.days.map((day) => day.dayOfWeek),
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  );
});

test("weekly dinner selections validate days, clear empty meals, and reject duplicate days", () => {
  assert.deepEqual(
    validateWeeklyDinnerSelections([
      { dayOfWeek: "Monday", mealId: chickenMealId },
      { dayOfWeek: "Tuesday", mealId: "" }
    ]),
    [
      { dayOfWeek: "Monday", mealId: chickenMealId },
      { dayOfWeek: "Tuesday", mealId: null }
    ]
  );
  assert.throws(
    () =>
      validateWeeklyDinnerSelections([
        { dayOfWeek: "Monday", mealId: chickenMealId },
        { dayOfWeek: "Monday", mealId: pastaMealId }
      ]),
    /once/
  );
});

test("weekly plan view model restores persisted selections and active grocery progress", () => {
  const week = getCurrentDinnerPlanWeek(new Date("2026-06-24T12:00:00.000Z"));
  const viewModel = buildWeeklyDinnerPlanViewModel({
    ...week,
    meals: [
      meal({ id: chickenMealId, mealName: "Chicken Bowls" }),
      meal({ id: pastaMealId, mealName: "Pasta" })
    ],
    selections: [
      { dayOfWeek: "Monday", mealId: chickenMealId },
      { dayOfWeek: "Wednesday", mealId: pastaMealId }
    ],
    activeGroceryList: {
      id: "list-1",
      createdAt: "2026-06-24T12:00:00.000Z",
      updatedAt: "2026-06-24T12:00:00.000Z",
      itemCount: 10,
      completedCount: 4,
      completionPercentage: 40
    }
  });

  assert.equal(viewModel.days[0]?.meal?.mealName, "Chicken Bowls");
  assert.equal(viewModel.days[2]?.meal?.mealName, "Pasta");
  assert.deepEqual(viewModel.plannedMealIds, [chickenMealId, pastaMealId]);
  assert.equal(viewModel.activeGroceryList?.completionPercentage, 40);
});

test("weekly grocery generation consolidates planned dinners through the grocery engine", () => {
  const list = generateGroceryList({
    meals: [
      meal({
        id: chickenMealId,
        mealName: "Chicken Bowls",
        ingredientsText: "chicken thighs\nrice\ncucumber"
      }),
      meal({
        id: pastaMealId,
        mealName: "Pasta",
        ingredientsText: "cucumber\nfeta cheese"
      })
    ],
    mealIds: [chickenMealId, pastaMealId]
  });

  assert.equal(list.itemCount, 4);
  assert.deepEqual(
    list.sections.flatMap((section) => section.items.map((item) => item.name)),
    ["cucumber", "chicken thighs", "feta cheese", "rice"]
  );
});

test("regenerated grocery checklist preserves completed items where ingredients still match", () => {
  const previousList = generateGroceryList({
    meals: [
      meal({
        id: chickenMealId,
        mealName: "Chicken Bowls",
        ingredientsText: "chicken thighs\nrice\ncucumber"
      })
    ],
    mealIds: [chickenMealId]
  });
  const regeneratedList = generateGroceryList({
    meals: [
      meal({
        id: chickenMealId,
        mealName: "Chicken Bowls",
        ingredientsText: "chicken thighs\nrice\nbroccoli"
      })
    ],
    mealIds: [chickenMealId]
  });
  const previousItems = previousList.sections.flatMap((section) =>
    section.items.map((item) => ({
      ingredient: item.name,
      completed: item.name === "rice"
    }))
  );
  const merged = mergeGroceryChecklistState({
    generated: regeneratedList,
    previousItems
  });

  assert.equal(
    merged.find((item) => item.ingredient === "rice")?.completed,
    true
  );
  assert.equal(
    merged.find((item) => item.ingredient === "broccoli")?.completed,
    false
  );
  assert.equal(
    merged.some((item) => item.ingredient === "cucumber"),
    false
  );
});
