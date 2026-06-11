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
    cuisine: value(overrides, "cuisine", "Indian"),
    mealType: value(overrides, "mealType", "Dinner"),
    proteinLevel: value(overrides, "proteinLevel", "High"),
    satietyLevel: value(overrides, "satietyLevel", "High"),
    bloodSugarImpact: value(overrides, "bloodSugarImpact", "Moderate"),
    effortLevel: value(overrides, "effortLevel", "Medium"),
    familyApproved: value(overrides, "familyApproved", false),
    weeknightFriendly: value(overrides, "weeknightFriendly", false),
    comfortMeal: value(overrides, "comfortMeal", false),
    notes: value(overrides, "notes", "Saved household meal note."),
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
  assert.ok(detail?.whyReasons.includes("Family loved this"));
  assert.ok(detail?.feedbackReasons.includes("Household loved this before"));
  assert.equal(detail?.hasNutritionData, true);
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
});

test("meal detail path is used by Today and Meals cards for internal links", () => {
  assert.equal(getMealDetailPath("meal-1"), "/meals/meal-1");
  assert.equal(getMealDetailPath("meal 1"), "/meals/meal%201");
});
