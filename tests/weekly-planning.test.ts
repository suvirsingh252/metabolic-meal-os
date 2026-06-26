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
      { dayOfWeek: "Tuesday", mealSlot: "Lunch", mealId: "" }
    ]),
    [
      { dayOfWeek: "Monday", mealSlot: "Dinner", mealId: chickenMealId },
      { dayOfWeek: "Tuesday", mealSlot: "Lunch", mealId: null }
    ]
  );
  assert.throws(
    () =>
      validateWeeklyDinnerSelections([
        { dayOfWeek: "Monday", mealSlot: "Dinner", mealId: chickenMealId },
        { dayOfWeek: "Monday", mealSlot: "Dinner", mealId: pastaMealId }
      ]),
    /once/
  );
  assert.throws(
    () =>
      validateWeeklyDinnerSelections([
        { dayOfWeek: "Monday", mealSlot: "Breakfast", mealId: chickenMealId }
      ]),
    /Lunch or Dinner/
  );
  assert.deepEqual(
    validateWeeklyDinnerSelections([
      { dayOfWeek: "Friday", mealSlot: "", mealId: pastaMealId }
    ]),
    [{ dayOfWeek: "Friday", mealSlot: "Dinner", mealId: pastaMealId }]
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
      { dayOfWeek: "Monday", mealSlot: "Dinner", mealId: chickenMealId },
      { dayOfWeek: "Wednesday", mealSlot: "Lunch", mealId: pastaMealId }
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

  assert.equal(viewModel.days[0]?.slots[1]?.meal?.mealName, "Chicken Bowls");
  assert.equal(viewModel.days[2]?.slots[0]?.meal?.mealName, "Pasta");
  assert.deepEqual(viewModel.plannedMealIds, [chickenMealId, pastaMealId]);
  assert.equal(viewModel.activeGroceryList?.completionPercentage, 40);
  assert.equal(viewModel.days[0]?.slots.length, 2);
  assert.ok(viewModel.weeklyInsights.some((insight) => insight.label === "Cuisines"));
  assert.deepEqual(
    viewModel.shoppingPreview.map((section) => section.category),
    ["Produce", "Protein", "Dairy", "Pantry", "Spices"]
  );
});

test("weekly plan keeps same-day Lunch and Dinner independent", () => {
  const week = getCurrentDinnerPlanWeek(new Date("2026-06-24T12:00:00.000Z"));
  const viewModel = buildWeeklyDinnerPlanViewModel({
    ...week,
    meals: [
      meal({
        id: chickenMealId,
        mealName: "Chicken Bowls",
        mealType: "Lunch"
      }),
      meal({ id: pastaMealId, mealName: "Pasta", mealType: "Dinner" })
    ],
    selections: [
      { dayOfWeek: "Monday", mealSlot: "Lunch", mealId: chickenMealId },
      { dayOfWeek: "Monday", mealSlot: "Dinner", mealId: pastaMealId }
    ]
  });
  const monday = viewModel.days[0];

  assert.equal(monday?.slots[0]?.mealSlot, "Lunch");
  assert.equal(monday?.slots[0]?.meal?.mealName, "Chicken Bowls");
  assert.equal(monday?.slots[1]?.mealSlot, "Dinner");
  assert.equal(monday?.slots[1]?.meal?.mealName, "Pasta");
});

test("shopping preview supports partial weeks without false quantity detail", () => {
  const week = getCurrentDinnerPlanWeek(new Date("2026-06-24T12:00:00.000Z"));
  const viewModel = buildWeeklyDinnerPlanViewModel({
    ...week,
    meals: [
      meal({
        id: chickenMealId,
        mealName: "Chicken Bowls",
        mealType: "Dinner",
        ingredientsText: "2 cups rice\n1 lb chicken thighs\ncucumber"
      })
    ],
    selections: [
      { dayOfWeek: "Thursday", mealSlot: "Dinner", mealId: chickenMealId }
    ]
  });

  assert.deepEqual(
    viewModel.shoppingPreview.map((section) => section.category),
    ["Produce", "Protein", "Dairy", "Pantry", "Spices"]
  );
  assert.deepEqual(
    viewModel.shoppingPreview.find((section) => section.category === "Protein")
      ?.items,
    ["chicken thighs"]
  );
  assert.deepEqual(
    viewModel.shoppingPreview.find((section) => section.category === "Pantry")
      ?.items,
    ["rice"]
  );
});

test("weekly planner suggestions avoid planned meals and explain why", () => {
  const week = getCurrentDinnerPlanWeek(new Date("2026-06-24T12:00:00.000Z"));
  const fishMealId = "11111111-1111-1111-1111-111111111111";
  const viewModel = buildWeeklyDinnerPlanViewModel({
    ...week,
    generatedAt: "2026-06-24T12:00:00.000Z",
    meals: [
      meal({
        id: chickenMealId,
        mealName: "Chicken Bowls",
        mealType: "Dinner",
        familyApproved: true,
        weeknightFriendly: true,
        ingredientsText: "chicken\nrice\nbroccoli",
        proteinG: 32,
        calories: 520
      }),
      meal({
        id: fishMealId,
        mealName: "Fish Tacos",
        mealType: "Dinner",
        cuisine: "Mexican",
        familyApproved: true,
        weeknightFriendly: true,
        ingredientsText: "fish\ncabbage\ntortillas",
        proteinG: 28,
        calories: 480
      })
    ],
    selections: [
      { dayOfWeek: "Monday", mealSlot: "Dinner", mealId: chickenMealId }
    ]
  });
  const tuesdayDinner = viewModel.days[1]?.slots.find(
    (slot) => slot.mealSlot === "Dinner"
  );

  assert.equal(tuesdayDinner?.suggestions[0]?.mealId, fishMealId);
  assert.match(tuesdayDinner?.suggestions[0]?.explanation ?? "", /Chosen/);
  assert.ok(
    viewModel.balanceAlerts.some((alert) =>
      /balance|protein|vegetables|complex|cook/i.test(alert.title)
    )
  );
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
