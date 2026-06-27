import assert from "node:assert/strict";
import test from "node:test";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import {
  buildDinnerConciergeViewModel,
  mapMealSummaryToConciergeMeal,
  parseRefinementParams,
  validateDinnerFeedbackRequest
} from "@/src/lib/server/dinner-concierge";
import { submitDinnerFeedback } from "@/src/lib/server/dinner-feedback";
import type { FeedbackChipEvent } from "@/src/lib/domain/feedback";

const generatedAt = "2026-06-16T12:00:00.000Z";

function value<T>(overrides: Partial<MealSummary>, key: keyof MealSummary, fallback: T) {
  return Object.prototype.hasOwnProperty.call(overrides, key)
    ? (overrides[key] as T)
    : fallback;
}

function mealSummary(overrides: Partial<MealSummary>): MealSummary {
  return {
    id: overrides.id ?? "meal",
    url: overrides.url ?? "https://notion.so/meal",
    mealName: overrides.mealName ?? overrides.id ?? "Meal",
    createdAt: overrides.createdAt ?? "2026-04-01T12:00:00.000Z",
    sourceUrl: overrides.sourceUrl ?? null,
    sourceName: overrides.sourceName ?? null,
    cuisine: value(overrides, "cuisine", "Indian"),
    mealType: value(overrides, "mealType", "Dinner"),
    proteinLevel: overrides.proteinLevel ?? null,
    satietyLevel: overrides.satietyLevel ?? null,
    bloodSugarImpact: overrides.bloodSugarImpact ?? null,
    effortLevel: overrides.effortLevel ?? null,
    familyApproved: overrides.familyApproved ?? false,
    weeknightFriendly: overrides.weeknightFriendly ?? false,
    comfortMeal: overrides.comfortMeal ?? false,
    optimizedVersion: overrides.optimizedVersion ?? null,
    notes: overrides.notes ?? null,
    ingredientsText: value(
      overrides,
      "ingredientsText",
      "1 cup chickpeas\n1 cup tomatoes\n1 tbsp olive oil"
    ),
    instructionsText: overrides.instructionsText ?? null,
    calories: value(overrides, "calories", 520),
    proteinG: value(overrides, "proteinG", 28),
    carbohydratesG: value(overrides, "carbohydratesG", 58),
    fatG: value(overrides, "fatG", 18),
    fiberG: value(overrides, "fiberG", 10),
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
    bloodSugarRiskScore: overrides.bloodSugarRiskScore ?? null,
    imageUrl: value(overrides, "imageUrl", "https://example.com/meal.jpg")
  };
}

test("recommendation: builds a lead and alternates from meal summaries", () => {
  const meals = [
    mealSummary({ id: "a", mealName: "Chana masala", qualityScore: 88 }),
    mealSummary({ id: "b", mealName: "Paneer bowls", qualityScore: 82 }),
    mealSummary({ id: "c", mealName: "Lentil soup", qualityScore: 78 })
  ];

  const view = buildDinnerConciergeViewModel({ meals, generatedAt });

  assert.ok(view.leadRecommendation);
  assert.equal(view.alternates.length, 2);
  assert.equal(view.emptyState, undefined);
});

test("recommendation: empty meal list returns an empty state", () => {
  const view = buildDinnerConciergeViewModel({ meals: [], generatedAt });

  assert.equal(view.leadRecommendation, null);
  assert.ok(view.emptyState);
  assert.ok(view.emptyState!.message.length > 0);
});

test("meal mapping: fills metadata gaps null-safely and derives tags", () => {
  const mapped = mapMealSummaryToConciergeMeal(
    mealSummary({
      id: "a",
      cuisine: "Mediterranean",
      effortLevel: "Low",
      comfortMeal: true,
      imageUrl: null
    })
  );

  assert.equal(mapped.imageUrl, null);
  assert.equal(mapped.estimatedMinutes, null);
  assert.equal(mapped.effortLevel, "Low");
  assert.ok(mapped.tags?.includes("Mediterranean"));
  assert.ok(mapped.tags?.includes("comfort"));
});

test("refinement parsing: keeps known ids per group and drops unknown ones", () => {
  const params = new URLSearchParams();
  params.append("cuisine", "mediterranean,thai,bogus");
  params.append("mood", "comfort,bogus");
  params.append("tonight", "family-dinner");
  params.append("time", "under-20");
  params.append("time", "40-60");

  const state = parseRefinementParams(params);

  assert.deepEqual(state.cuisine, ["mediterranean", "thai"]);
  assert.deepEqual(state.mood, ["comfort"]);
  assert.deepEqual(state.tonight, ["family-dinner"]);
  assert.equal(state.time, "under-20");
});

test("refinement behavior: family dinner refinement promotes family-approved meal", () => {
  const meals = [
    mealSummary({ id: "solo", mealName: "Spicy ramen", qualityScore: 80 }),
    mealSummary({
      id: "family",
      mealName: "Roast chicken",
      qualityScore: 80,
      familyApproved: true
    })
  ];
  const params = new URLSearchParams("tonight=family-dinner");

  const view = buildDinnerConciergeViewModel({
    meals,
    refinements: parseRefinementParams(params),
    generatedAt
  });

  assert.equal(view.leadRecommendation!.mealId, "family");
});

test("refinement behavior: cuisine query changes API recommendations", () => {
  const meals = [
    mealSummary({
      id: "indian",
      mealName: "Chana masala",
      cuisine: "Indian",
      qualityScore: 80
    }),
    mealSummary({
      id: "thai",
      mealName: "Thai green curry",
      cuisine: "Thai",
      qualityScore: 80
    })
  ];

  const indian = buildDinnerConciergeViewModel({
    meals,
    refinements: parseRefinementParams(new URLSearchParams("cuisine=indian")),
    generatedAt
  });
  const thai = buildDinnerConciergeViewModel({
    meals,
    refinements: parseRefinementParams(new URLSearchParams("cuisine=thai")),
    generatedAt
  });

  assert.equal(indian.activeRefinements.cuisine[0], "indian");
  assert.equal(thai.activeRefinements.cuisine[0], "thai");
  assert.equal(indian.leadRecommendation!.mealId, "indian");
  assert.equal(thai.leadRecommendation!.mealId, "thai");
});

test("feedback influence: not-worth-it chips demote a meal in recommendations", () => {
  const meals = [
    mealSummary({ id: "good", mealName: "Chana masala", qualityScore: 80 }),
    mealSummary({ id: "bad", mealName: "Mushy pasta", qualityScore: 80 })
  ];
  const feedbackEvents: FeedbackChipEvent[] = [
    { mealId: "bad", chipType: "not_worth_it", createdAt: "2026-04-10T12:00:00.000Z" },
    { mealId: "bad", chipType: "not_worth_it", createdAt: "2026-04-11T12:00:00.000Z" }
  ];

  const view = buildDinnerConciergeViewModel({ meals, feedbackEvents, generatedAt });

  assert.equal(view.leadRecommendation!.mealId, "good");
});

test("feedback validation: accepts a multi-chip submission and de-dupes", () => {
  const result = validateDinnerFeedbackRequest({
    mealId: "notion-page-123",
    chips: ["loved_it", "would_make_again", "loved_it"],
    createdBy: "  parent  "
  });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.value.mealId, "notion-page-123");
    assert.deepEqual(result.value.chips, ["loved_it", "would_make_again"]);
    assert.equal(result.value.createdBy, "parent");
  }
});

test("feedback validation: rejects missing mealId", () => {
  const result = validateDinnerFeedbackRequest({ chips: ["loved_it"] });
  assert.equal(result.ok, false);
});

test("feedback validation: rejects an empty chip list", () => {
  const result = validateDinnerFeedbackRequest({ mealId: "x", chips: [] });
  assert.equal(result.ok, false);
});

test("feedback validation: rejects an unsupported chip", () => {
  const result = validateDinnerFeedbackRequest({
    mealId: "x",
    chips: ["loved_it", "five_stars"]
  });
  assert.equal(result.ok, false);
});

test("feedback validation: rejects a non-object body", () => {
  assert.equal(validateDinnerFeedbackRequest("nope").ok, false);
  assert.equal(validateDinnerFeedbackRequest(null).ok, false);
});

function feedbackDeps(options: {
  existingMirrorId?: string | null;
  meals?: MealSummary[];
}) {
  const calls = {
    queriedMeals: 0,
    upsertedMealIds: [] as string[],
    savedMealIds: [] as string[]
  };

  return {
    calls,
    deps: {
      getHouseholdMetadata: () => ({
        householdId: "household-1",
        createdBy: "default-user",
        visibility: "private" as const,
        schemaVersion: "meal-record-v1"
      }),
      queryAllMealSummaries: async () => {
        calls.queriedMeals += 1;
        return { meals: options.meals ?? [] };
      },
      resolveMirrorMealId: async () => options.existingMirrorId ?? null,
      upsertMirrorMealFromSummary: async (input: {
        householdId: string;
        createdBy?: string | null;
        meal: MealSummary;
      }) => {
        assert.equal(input.householdId, "household-1");
        calls.upsertedMealIds.push(input.meal.id);
        return `mirror-${input.meal.id}`;
      },
      saveDinnerFeedbackChip: async (input: {
        householdId: string;
        mealId: string;
        chipType: string;
        createdBy?: string | null;
      }) => {
        assert.equal(input.householdId, "household-1");
        calls.savedMealIds.push(input.mealId);
        return {
          id: `feedback-${calls.savedMealIds.length}`,
          householdId: input.householdId,
          mealId: input.mealId,
          chipType: input.chipType,
          createdBy: input.createdBy ?? null,
          createdAt: new Date("2026-06-16T12:00:00.000Z")
        };
      }
    }
  };
}

test("feedback submission: saves against an existing Postgres mirror row", async () => {
  const { deps, calls } = feedbackDeps({ existingMirrorId: "mirror-existing" });

  const result = await submitDinnerFeedback(
    { mealId: "notion-page-123", chips: ["loved_it"] },
    deps
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true, savedCount: 1 });
  assert.equal(calls.queriedMeals, 0);
  assert.deepEqual(calls.upsertedMealIds, []);
  assert.deepEqual(calls.savedMealIds, ["mirror-existing"]);
});

test("feedback submission: upserts a missing mirror row for a Notion-backed meal", async () => {
  const { deps, calls } = feedbackDeps({
    meals: [
      mealSummary({
        id: "notion-page-456",
        mealName: "Chana masala",
        qualityScore: 88
      })
    ]
  });

  const result = await submitDinnerFeedback(
    {
      mealId: "notion-page-456",
      chips: ["loved_it", "would_make_again"],
      createdBy: "parent"
    },
    deps
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true, savedCount: 2 });
  assert.equal(calls.queriedMeals, 1);
  assert.deepEqual(calls.upsertedMealIds, ["notion-page-456"]);
  assert.deepEqual(calls.savedMealIds, [
    "mirror-notion-page-456",
    "mirror-notion-page-456"
  ]);
});

test("feedback submission: rejects an unknown meal without saving feedback", async () => {
  const { deps, calls } = feedbackDeps({
    meals: [mealSummary({ id: "known-meal" })]
  });

  const result = await submitDinnerFeedback(
    { mealId: "missing-meal", chips: ["loved_it"] },
    deps
  );

  assert.equal(result.status, 422);
  assert.equal(result.body.error, "unknown meal");
  assert.equal(calls.queriedMeals, 1);
  assert.deepEqual(calls.upsertedMealIds, []);
  assert.deepEqual(calls.savedMealIds, []);
});
