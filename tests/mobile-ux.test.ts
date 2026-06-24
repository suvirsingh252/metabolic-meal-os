import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("planner uses a mobile day selector while preserving desktop week grid", () => {
  const planner = source("src/app/planner/planner-client.tsx");

  assert.match(planner, /selectedDayIndex/);
  assert.match(planner, /aria-label="Choose planner day"/);
  assert.match(planner, /getDefaultPlannerDayIndex/);
  assert.match(planner, /lg:hidden/);
  assert.match(planner, /hidden gap-3 lg:grid lg:grid-cols-7/);
  assert.match(planner, /PlannerDayCard/);
});

test("mobile meal archive avoids rendering a long flat list by default", () => {
  const meals = source("src/app/meals/page.tsx");

  assert.match(meals, /mobileFilter/);
  assert.match(meals, /showAllMobileMeals/);
  assert.match(meals, /slice\(0, 6\)/);
  assert.match(meals, /Show all \{mobileFilteredMeals\.length\} meals/);
  assert.match(meals, /hidden gap-3 lg:grid lg:grid-cols-2/);
});

test("primary mobile routes use progressive disclosure for secondary content", () => {
  const today = source("src/app/today/today-client.tsx");
  const dashboard = source("src/app/dashboard/dashboard-client.tsx");
  const feedback = source("src/app/feedback/page.tsx");
  const mealDetail = source("src/app/meals/[id]/page.tsx");
  const navigation = source("lib/navigation.ts");

  assert.match(today, /Learning and secondary insights/);
  assert.match(navigation, /label: "Insights"/);
  assert.match(dashboard, /Household intelligence/);
  assert.match(dashboard, /Hearth Insights details/);
  assert.match(dashboard, /CollapsibleDashboardSection/);
  assert.match(feedback, /Optional after-meal details/);
  assert.match(mealDetail, /How we make it/);
  assert.match(mealDetail, /Nutrition/);
  assert.match(mealDetail, /Advanced details/);
  assert.match(mealDetail, /grid-cols-\[2\.75rem_minmax\(0,1fr\)\]/);
});

test("meal detail ingredient rows use parsed amount before As needed fallback", () => {
  const mealDetail = source("src/app/meals/[id]/page.tsx");

  assert.match(mealDetail, /formatCookbookIngredientAmount\(ingredient\)/);
  assert.match(mealDetail, /hasOnlyBareName \? "As needed" : ""/);
  assert.match(mealDetail, /title=\{ingredient\.rawText\}/);
});

test("mobile rendering keeps navigation usable and prevents horizontal overflow", () => {
  const shell = source("components/layout/app-shell.tsx");
  const globals = source("src/app/globals.css");

  assert.match(shell, /fixed inset-x-0 bottom-0/);
  assert.match(shell, /pathname === "\/today"/);
  assert.match(shell, /pb-\[env\(safe-area-inset-bottom\)\]/);
  assert.match(globals, /overflow-x-hidden/);
});
