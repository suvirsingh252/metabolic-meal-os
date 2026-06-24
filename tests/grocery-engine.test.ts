import assert from "node:assert/strict";
import test from "node:test";
import {
  extractGroceryIngredientCandidates,
  generateGroceryList,
  normalizeGroceryIngredient,
  resolveGroceryCategory,
  validateGroceryMealIds
} from "@/src/lib/domain/grocery";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

function meal(overrides: Partial<MealSummary>): MealSummary {
  return {
    id: overrides.id ?? "meal-1",
    url: overrides.url ?? "https://notion.so/meal-1",
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

function sectionItems(list: ReturnType<typeof generateGroceryList>, category: string) {
  return list.sections.find((section) => section.category === category)?.items ?? [];
}

test("grocery normalization removes quantities and applies aliases", () => {
  assert.deepEqual(normalizeGroceryIngredient("1 red onion"), {
    canonicalName: "red onion",
    key: "red onion",
    rawName: "1 red onion"
  });
  assert.equal(
    normalizeGroceryIngredient("Boneless Skinless Chicken Thighs")?.canonicalName,
    "chicken thighs"
  );
  assert.equal(
    normalizeGroceryIngredient("Chicken Thigh")?.canonicalName,
    "chicken thighs"
  );
  assert.equal(normalizeGroceryIngredient("2 cloves garlic")?.canonicalName, "garlic");
  assert.equal(normalizeGroceryIngredient("fresh garlic")?.canonicalName, "garlic");
  assert.equal(normalizeGroceryIngredient("garlic cloves")?.canonicalName, "garlic");
  assert.equal(
    normalizeGroceryIngredient("Lean ground beef or lamb")?.canonicalName,
    "lean beef or lamb"
  );
});

test("grocery category mapping resolves known groups and falls back to Other", () => {
  assert.equal(resolveGroceryCategory("cucumber"), "Produce");
  assert.equal(resolveGroceryCategory("chicken thighs"), "Protein");
  assert.equal(resolveGroceryCategory("feta cheese"), "Dairy");
  assert.equal(resolveGroceryCategory("corn tortilla"), "Bakery");
  assert.equal(resolveGroceryCategory("mystery ingredient"), "Other");
});

test("single-meal grocery generation groups ingredients by category", () => {
  const list = generateGroceryList({
    createdAt: "2026-06-24T12:00:00.000Z",
    meals: [
      meal({
        id: "meal-a",
        mealName: "Chicken bowls",
        ingredientsText: [
          "1 cucumber",
          "1 red onion",
          "1 lb boneless skinless chicken thighs",
          "2 cups rice",
          "1 tbsp olive oil"
        ].join("\n")
      })
    ],
    mealIds: ["meal-a"]
  });

  assert.equal(list.itemCount, 5);
  assert.deepEqual(
    sectionItems(list, "Produce").map((item) => item.name),
    ["cucumber", "red onion"]
  );
  assert.deepEqual(
    sectionItems(list, "Protein").map((item) => item.name),
    ["chicken thighs"]
  );
  assert.deepEqual(
    sectionItems(list, "Pantry").map((item) => item.name),
    ["olive oil", "rice"]
  );
});

test("multi-meal grocery generation deduplicates normalized ingredients", () => {
  const list = generateGroceryList({
    meals: [
      meal({
        id: "meal-a",
        mealName: "Chicken cucumber bowls",
        ingredientsText: ["cucumber", "Chicken Thighs"].join("\n")
      }),
      meal({
        id: "meal-b",
        mealName: "Greek salad",
        ingredientsText: ["1 cucumber", "feta"].join("\n")
      })
    ],
    mealIds: ["meal-a", "meal-b"]
  });

  assert.equal(list.itemCount, 3);
  assert.deepEqual(
    sectionItems(list, "Produce").map((item) => item.name),
    ["cucumber"]
  );
  assert.equal(sectionItems(list, "Produce")[0]?.sourceMealIds.length, 2);
  assert.deepEqual(
    sectionItems(list, "Protein").map((item) => item.name),
    ["chicken thighs"]
  );
  assert.deepEqual(
    sectionItems(list, "Dairy").map((item) => item.name),
    ["feta cheese"]
  );
});

test("grocery meal id validation requires a non-empty bounded array", () => {
  assert.deepEqual(validateGroceryMealIds(["a", "a", " b "]), ["a", "b"]);
  assert.throws(() => validateGroceryMealIds([]), /Select at least one meal/);
  assert.throws(() => validateGroceryMealIds("a"), /mealIds must be an array/);
});

test("grocery extraction splits beef and broccoli ingredient blobs", () => {
  const candidates = extractGroceryIngredientCandidates(
    "lean beef broccoli soy sauce oyster sauce garlic ginger cornstarch sesame oil rice optional"
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.name),
    [
      "lean beef",
      "broccoli",
      "soy sauce",
      "oyster sauce",
      "garlic",
      "ginger",
      "cornstarch",
      "sesame oil",
      "rice"
    ]
  );
});

test("beef and broccoli grocery generation separates purchasable items", () => {
  const list = generateGroceryList({
    meals: [
      meal({
        id: "beef-broccoli",
        mealName: "Beef and Broccoli",
        ingredientsText:
          "lean beef broccoli soy sauce oyster sauce garlic ginger cornstarch sesame oil rice optional"
      })
    ],
    mealIds: ["beef-broccoli"]
  });

  assert.equal(list.itemCount, 9);
  assert.deepEqual(
    sectionItems(list, "Protein").map((item) => item.name),
    ["lean beef"]
  );
  assert.deepEqual(
    sectionItems(list, "Produce").map((item) => item.name),
    ["broccoli", "garlic", "ginger"]
  );
  assert.deepEqual(
    sectionItems(list, "Pantry").map((item) => item.name),
    ["cornstarch", "oyster sauce", "rice", "sesame oil", "soy sauce"]
  );
  assert.equal(
    list.sections.some((section) =>
      section.items.some((item) => item.name.includes("optional"))
    ),
    false
  );
});

test("kafta grocery generation separates protein, produce, spices, and pantry", () => {
  const list = generateGroceryList({
    meals: [
      meal({
        id: "kafta",
        mealName: "Beef Kafta with Tahini Salad",
        ingredientsText:
          "lean beef or lamb parsley onion garlic allspice cumin cinnamon tahini lemon cucumber tomato lettuce"
      })
    ],
    mealIds: ["kafta"]
  });

  assert.equal(list.itemCount, 12);
  assert.deepEqual(
    sectionItems(list, "Protein").map((item) => item.name),
    ["lean beef or lamb"]
  );
  assert.deepEqual(
    sectionItems(list, "Produce").map((item) => item.name),
    ["cucumber", "garlic", "lemon", "lettuce", "onion", "parsley", "tomato"]
  );
  assert.deepEqual(
    sectionItems(list, "Spices").map((item) => item.name),
    ["allspice", "cinnamon", "cumin"]
  );
  assert.deepEqual(
    sectionItems(list, "Pantry").map((item) => item.name),
    ["tahini"]
  );
});

test("grocery generation strips shopping-irrelevant notes", () => {
  const list = generateGroceryList({
    meals: [
      meal({
        id: "notes",
        mealName: "Buffalo Chicken Wraps",
        ingredientsText: [
          "lettuce as needed",
          "cheese as needed",
          "buffalo chicken breast from costco"
        ].join("\n")
      })
    ],
    mealIds: ["notes"]
  });

  assert.deepEqual(
    sectionItems(list, "Produce").map((item) => item.name),
    ["lettuce"]
  );
  assert.deepEqual(
    sectionItems(list, "Protein").map((item) => item.name),
    ["buffalo chicken breast"]
  );
  assert.deepEqual(
    sectionItems(list, "Dairy").map((item) => item.name),
    ["cheese"]
  );
});

test("grocery generation deduplicates after note stripping and normalization", () => {
  const list = generateGroceryList({
    meals: [
      meal({
        id: "garlic",
        ingredientsText: ["garlic", "2 cloves garlic", "fresh garlic"].join("\n")
      })
    ],
    mealIds: ["garlic"]
  });

  assert.equal(list.itemCount, 1);
  assert.deepEqual(
    sectionItems(list, "Produce").map((item) => item.name),
    ["garlic"]
  );
});
