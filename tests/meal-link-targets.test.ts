import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Today meal cards link to internal meal detail pages", () => {
  const source = readFileSync("src/app/today/today-client.tsx", "utf8");

  assert.match(source, /href=\{getMealDetailPath\(recommendation\.meal\.id\)\}/);
  assert.doesNotMatch(source, /href=\{recommendation\.meal\.url\}/);
});

test("Meals list items link to internal meal detail pages", () => {
  const source = readFileSync("src/app/meals/page.tsx", "utf8");

  assert.match(source, /href=\{getMealDetailPath\(meal\.id\)\}/);
  assert.doesNotMatch(source, /href=\{meal\.url\}/);
});

test("Meal detail only uses a safe original recipe href", () => {
  const source = readFileSync("src/app/meals/[id]/page.tsx", "utf8");

  assert.match(
    source,
    /const safeOriginalRecipeUrl = getSafeHttpUrl\(cookbook\.originalRecipeUrl\);/
  );
  assert.match(source, /href=\{safeOriginalRecipeUrl \?\? meal\.url\}/);
});

test("Analyze save confirmation prioritizes app-native next actions", () => {
  const source = readFileSync(
    "src/app/analyze/components/save-meal-section.tsx",
    "utf8"
  );

  assert.match(source, /See the family version/);
  assert.match(source, /href=\{savedMeal\.mealDetailPath\}/);
  assert.match(source, /Put it on the plan/);
  assert.match(
    source,
    /href=\{`\/planner\?meal=\$\{encodeURIComponent\(savedMeal\.mealId\)\}`\}/
  );
  assert.match(source, /Open in Notion/);
  assert.doesNotMatch(source, /Open saved record/);
});
