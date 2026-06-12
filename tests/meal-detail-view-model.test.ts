import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMealDetailViewModel,
  getMealDetailPath
} from "@/src/lib/domain/meals/detail-view-model";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

const generatedAt = "2026-06-10T12:00:00.000Z";

function value<TValue>(
  overrides: Partial<MealSummary>,
  key: keyof MealSummary,
  fallback: TValue
): TValue {
  return Object.prototype.hasOwnProperty.call(overrides, key)
    ? (overrides[key] as TValue)
    : fallback;
}

function meal(overrides: Partial<MealSummary>): MealSummary {
  return {
    id: value(overrides, "id", "meal-1"),
    url: value(overrides, "url", "https://notion.so/meal-1"),
    mealName: value(overrides, "mealName", "Chana masala"),
    createdAt: value(overrides, "createdAt", "2026-05-01T12:00:00.000Z"),
    sourceUrl: value(overrides, "sourceUrl", "https://example.com/chana"),
    sourceName: value(overrides, "sourceName", "Family source"),
    cuisine: value(overrides, "cuisine", "Indian"),
    mealType: value(overrides, "mealType", "Dinner"),
    proteinLevel: value(overrides, "proteinLevel", "High"),
    satietyLevel: value(overrides, "satietyLevel", "High"),
    bloodSugarImpact: value(overrides, "bloodSugarImpact", "Moderate"),
    effortLevel: value(overrides, "effortLevel", "Medium"),
    familyApproved: value(overrides, "familyApproved", false),
    weeknightFriendly: value(overrides, "weeknightFriendly", false),
    comfortMeal: value(overrides, "comfortMeal", false),
    optimizedVersion: value(
      overrides,
      "optimizedVersion",
      "Use less oil and add extra spinach."
    ),
    notes: value(overrides, "notes", "Saved household meal note."),
    ingredientsText: value(overrides, "ingredientsText", null),
    instructionsText: value(overrides, "instructionsText", null),
    calories: value(overrides, "calories", 520),
    proteinG: value(overrides, "proteinG", 28),
    carbohydratesG: value(overrides, "carbohydratesG", 64),
    fatG: value(overrides, "fatG", 16),
    fiberG: value(overrides, "fiberG", 12),
    sodiumMg: value(overrides, "sodiumMg", 640),
    sugarG: value(overrides, "sugarG", 8),
    nutritionConfidence: value(overrides, "nutritionConfidence", "medium"),
    nutritionSource: value(overrides, "nutritionSource", "Meal analysis"),
    nutritionProvenance: value(
      overrides,
      "nutritionProvenance",
      "Estimated by Meal OS"
    ),
    qualityScore: value(overrides, "qualityScore", 84),
    metabolicScore: value(overrides, "metabolicScore", null),
    proteinScore: value(overrides, "proteinScore", null),
    fiberScore: value(overrides, "fiberScore", null),
    energyDensityScore: value(overrides, "energyDensityScore", null),
    processingScore: value(overrides, "processingScore", null),
    satietyScoreNumeric: value(overrides, "satietyScoreNumeric", null),
    bloodSugarRiskScore: value(overrides, "bloodSugarRiskScore", null)
  };
}

test("buildMealDetailViewModel returns a detail model for a saved meal", () => {
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    "meal-1": {
      mealId: "meal-1",
      totalEvents: 2,
      eatenCount: 2,
      lovedCount: 1,
      likedCount: 2,
      dislikedCount: 0,
      wouldRepeatCount: 2,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-06-01T12:00:00.000Z",
      lastPositiveAt: "2026-06-01T12:00:00.000Z",
      netPreferenceScore: 10,
      confidence: "medium",
      recentNotes: ["Great dinner"]
    }
  };

  const detail = buildMealDetailViewModel([meal({})], "meal-1", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(detail?.meal.mealName, "Chana masala");
  assert.equal(detail?.feedbackSummary.eatenCount, 2);
  assert.equal(detail?.dateLabel, "2026-06-01T12:00:00.000Z");
  assert.ok(detail?.whyReasons.includes("Marked family friendly."));
  assert.ok(detail?.feedbackReasons.includes("Household loved this before"));
  assert.equal(detail?.hasNutritionData, true);
  assert.equal(detail?.cookbook.hasOriginalRecipe, true);
  assert.equal(detail?.cookbook.originalRecipeUrl, "https://example.com/chana");
  assert.equal(
    detail?.nutritionItems.find((item) => item.id === "protein")?.value,
    28
  );
});

test("buildMealDetailViewModel returns null when the meal is missing", () => {
  const detail = buildMealDetailViewModel([meal({ id: "known" })], "missing", {
    generatedAt
  });

  assert.equal(detail, null);
});

test("buildMealDetailViewModel supports Notion IDs with or without hyphens", () => {
  const detail = buildMealDetailViewModel(
    [meal({ id: "12345678-1234-1234-1234-123456789abc" })],
    "12345678123412341234123456789abc",
    { generatedAt }
  );

  assert.equal(detail?.meal.id, "12345678-1234-1234-1234-123456789abc");
});

test("buildMealDetailViewModel uses calm empty feedback and nutrition states", () => {
  const detail = buildMealDetailViewModel(
    [
      meal({
        id: "empty",
        calories: null,
        proteinG: null,
        carbohydratesG: null,
        fatG: null,
        fiberG: null,
        sodiumMg: null,
        sugarG: null,
        qualityScore: null,
        nutritionSource: null,
        nutritionProvenance: null,
        nutritionConfidence: null
      })
    ],
    "empty",
    { generatedAt }
  );

  assert.equal(detail?.feedbackSummary.totalEvents, 0);
  assert.equal(detail?.feedbackSummary.confidence, "none");
  assert.equal(detail?.hasNutritionData, false);
  assert.deepEqual(detail?.cookbook.familyAdjustments.map((item) => item.text), [
    "Use less oil and add extra spinach."
  ]);
});

test("meal detail path is used by Today and Meals cards for internal links", () => {
  assert.equal(getMealDetailPath("meal-1"), "/meals/meal-1");
  assert.equal(getMealDetailPath("meal 1"), "/meals/meal%201");
});

test("meal detail cookbook preserves structured ingredients and steps", () => {
  const detail = buildMealDetailViewModel(
    [
      meal({
        notes: [
          "Original Notes:",
          "Ingredients:",
          "- 1 tsp oil",
          "- 2 cups spinach",
          "- paneer",
          "Instructions:",
          "1. Warm the oil.",
          "2. Add spinach and paneer."
        ].join("\n")
      })
    ],
    "meal-1",
    { generatedAt }
  );

  assert.equal(detail?.cookbook.ingredients.length, 3);
  assert.deepEqual(detail?.cookbook.ingredients[0], {
    id: "ingredient-1",
    name: "oil",
    quantity: "1",
    unit: "tsp",
    rawText: "1 tsp oil"
  });
  assert.equal(detail?.cookbook.ingredients[1].quantity, "2");
  assert.equal(detail?.cookbook.ingredients[1].unit, "cups");
  assert.equal(detail?.cookbook.ingredients[2].quantity, null);
  assert.equal(detail?.cookbook.ingredients[2].unit, null);
  assert.deepEqual(
    detail?.cookbook.instructions.map((step) => step.text),
    ["Warm the oil.", "Add spinach and paneer."]
  );
});

test("meal detail cookbook renders persisted and applicable adjustment overlays", () => {
  const detail = buildMealDetailViewModel([meal({})], "meal-1", {
    generatedAt,
    feedbackByMealId: {
      "meal-1": {
        mealId: "meal-1",
        totalEvents: 2,
        eatenCount: 2,
        lovedCount: 0,
        likedCount: 1,
        dislikedCount: 0,
        wouldRepeatCount: 1,
        wouldNotRepeatCount: 0,
        lastEatenAt: "2026-06-01T12:00:00.000Z",
        lastPositiveAt: "2026-06-01T12:00:00.000Z",
        netPreferenceScore: 4,
        confidence: "medium",
        familyAdjustments: ["Use the air fryer"],
        recentNotes: [
          "[Family cookbook adjustment] Cook 5 minutes longer",
          "Kids prefer extra rice"
        ]
      }
    }
  });

  assert.deepEqual(
    detail?.cookbook.familyAdjustments.map((adjustment) => adjustment.text),
    [
      "Use the air fryer",
      "Cook 5 minutes longer",
      "Kids prefer extra rice",
      "Use less oil and add extra spinach."
    ]
  );
});

test("meal detail cookbook gracefully handles missing recipe fields", () => {
  const detail = buildMealDetailViewModel(
    [
      meal({
        notes: null,
        optimizedVersion: null,
        sourceUrl: null
      })
    ],
    "meal-1",
    { generatedAt }
  );

  assert.equal(detail?.cookbook.ingredients.length, 0);
  assert.equal(detail?.cookbook.instructions.length, 0);
  assert.equal(detail?.cookbook.familyAdjustments.length, 0);
  assert.equal(detail?.cookbook.originalRecipeUrl, "https://notion.so/meal-1");
  assert.equal(detail?.cookbook.hasOriginalRecipe, false);
});
