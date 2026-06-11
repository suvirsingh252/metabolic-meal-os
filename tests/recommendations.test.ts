import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTodayViewModel,
  generateRecommendationReasons,
  getAlternativeSuggestion,
  rankRecommendationsForCategory,
  type RecommendationMeal
} from "@/src/lib/domain/recommendations";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";

const generatedAt = "2026-06-10T12:00:00.000Z";

function meal(overrides: Partial<RecommendationMeal>): RecommendationMeal {
  return {
    id: overrides.id ?? "meal",
    url: overrides.url ?? "https://notion.so/meal",
    mealName: overrides.mealName ?? overrides.id ?? "Meal",
    createdAt: overrides.createdAt ?? "2026-05-01T12:00:00.000Z",
    cuisine: overrides.cuisine ?? null,
    mealType: overrides.mealType ?? "Dinner",
    familyApproved: overrides.familyApproved ?? false,
    weeknightFriendly: overrides.weeknightFriendly ?? false,
    comfortMeal: overrides.comfortMeal ?? false,
    calories: overrides.calories ?? null,
    proteinG: overrides.proteinG ?? null,
    carbohydratesG: overrides.carbohydratesG ?? null,
    fatG: overrides.fatG ?? null,
    fiberG: overrides.fiberG ?? null,
    qualityScore: overrides.qualityScore ?? null
  };
}

test("ranking favors liked high-quality meals that have not been eaten recently", () => {
  const meals = [
    meal({
      id: "favorite",
      mealName: "Chana masala",
      familyApproved: true,
      qualityScore: 88,
      proteinG: 28,
      fiberG: 12,
      calories: 620,
      createdAt: "2026-05-01T12:00:00.000Z"
    }),
    meal({
      id: "recent",
      mealName: "Paneer bowls",
      familyApproved: true,
      qualityScore: 92,
      proteinG: 34,
      fiberG: 8,
      calories: 700,
      createdAt: "2026-06-09T12:00:00.000Z"
    })
  ];

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt
  });

  assert.equal(ranked[0]?.meal.id, "favorite");
});

test("recency avoidance keeps a very recent meal below an older candidate", () => {
  const meals = [
    meal({
      id: "old",
      mealName: "Lentil soup",
      qualityScore: 72,
      createdAt: "2026-05-20T12:00:00.000Z"
    }),
    meal({
      id: "yesterday",
      mealName: "Bean tacos",
      qualityScore: 95,
      createdAt: "2026-06-09T12:00:00.000Z"
    })
  ];

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt
  });

  assert.equal(ranked[0]?.meal.id, "old");
});

test("reason generation only uses real saved meal signals", () => {
  const favorite = meal({
    id: "favorite",
    mealName: "Tofu stir fry",
    familyApproved: true,
    qualityScore: 82,
    calories: 550,
    proteinG: 30,
    carbohydratesG: 58,
    fatG: 18,
    fiberG: 9,
    createdAt: "2026-05-01T12:00:00.000Z"
  });
  const meals = [
    favorite,
    meal({
      id: "repeat",
      mealName: "Tofu stir fry",
      createdAt: "2026-04-01T12:00:00.000Z"
    })
  ];

  const reasons = generateRecommendationReasons(
    favorite,
    meals,
    "Dinner",
    generatedAt
  );

  assert.deepEqual(reasons, [
    "Family favorite",
    "Highly rated",
    "Haven't had this recently",
    "Frequently repeated"
  ]);
});

test("today view model gracefully omits categories without explicit saved meal data", () => {
  const today = buildTodayViewModel(
    [
      meal({
        id: "dinner",
        mealType: "Dinner",
        qualityScore: 80
      })
    ],
    { generatedAt }
  );

  assert.ok(today.suggestions.Dinner);
  assert.equal(today.suggestions.Breakfast, undefined);
  assert.equal(today.suggestions.Lunch, undefined);
  assert.equal(today.suggestions.Snack, undefined);
});

test("empty meal archive returns a fallback state instead of invented meals", () => {
  const today = buildTodayViewModel([], { generatedAt });

  assert.equal(Object.keys(today.suggestions).length, 0);
  assert.match(today.emptyState ?? "", /No saved meals found/);
  assert.equal(today.healthSnapshot[0]?.id, "limited-data");
});

test("suggest another returns another valid candidate without repeating current meal", () => {
  const meals = [
    meal({ id: "first", mealName: "First dinner", qualityScore: 90 }),
    meal({ id: "second", mealName: "Second dinner", qualityScore: 80 })
  ];

  const alternative = getAlternativeSuggestion(meals, "Dinner", "first", {
    generatedAt,
    excludedMealIds: ["first"]
  });

  assert.equal(alternative?.meal.id, "second");
});

test("ranking boosts meals loved by household feedback", () => {
  const meals = [
    meal({ id: "loved", mealName: "Loved dinner", qualityScore: 75 }),
    meal({ id: "plain", mealName: "Plain dinner", qualityScore: 86 })
  ];
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    loved: {
      mealId: "loved",
      totalEvents: 2,
      eatenCount: 2,
      lovedCount: 1,
      likedCount: 2,
      dislikedCount: 0,
      wouldRepeatCount: 2,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-05-01T12:00:00.000Z",
      lastPositiveAt: "2026-05-01T12:00:00.000Z",
      netPreferenceScore: 10,
      confidence: "medium"
    }
  };

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(ranked[0]?.meal.id, "loved");
  assert.ok(ranked[0]?.reasons.includes("Family loved this"));
});

test("ranking temporarily de-prioritizes recently eaten feedback", () => {
  const meals = [
    meal({ id: "recent-loved", mealName: "Recent loved", qualityScore: 90 }),
    meal({ id: "older", mealName: "Older dinner", qualityScore: 78 })
  ];
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    "recent-loved": {
      mealId: "recent-loved",
      totalEvents: 3,
      eatenCount: 3,
      lovedCount: 2,
      likedCount: 3,
      dislikedCount: 0,
      wouldRepeatCount: 3,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-06-10T08:00:00.000Z",
      lastPositiveAt: "2026-06-10T08:00:00.000Z",
      netPreferenceScore: 18,
      confidence: "medium"
    }
  };

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(ranked[0]?.meal.id, "older");
  assert.ok(
    ranked.find((recommendation) => recommendation.meal.id === "recent-loved")
      ?.reasons.includes("Recently eaten")
  );
});

test("ranking lowers meals with repeated negative feedback", () => {
  const meals = [
    meal({ id: "mixed", mealName: "Mixed dinner", qualityScore: 90 }),
    meal({ id: "steady", mealName: "Steady dinner", qualityScore: 72 })
  ];
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    mixed: {
      mealId: "mixed",
      totalEvents: 3,
      eatenCount: 3,
      lovedCount: 0,
      likedCount: 1,
      dislikedCount: 2,
      wouldRepeatCount: 1,
      wouldNotRepeatCount: 2,
      lastEatenAt: "2026-05-01T12:00:00.000Z",
      lastPositiveAt: "2026-04-15T12:00:00.000Z",
      netPreferenceScore: -8,
      confidence: "medium"
    }
  };

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(ranked[0]?.meal.id, "steady");
  assert.ok(
    ranked.find((recommendation) => recommendation.meal.id === "mixed")?.reasons
      .includes("Mixed feedback")
  );
});

test("today view model falls back when feedback summaries are absent", () => {
  const today = buildTodayViewModel(
    [meal({ id: "dinner", mealType: "Dinner", qualityScore: 80 })],
    { generatedAt, feedbackByMealId: {} }
  );

  assert.equal(today.suggestions.Dinner?.meal.id, "dinner");
  assert.equal(today.suggestions.Dinner?.feedbackSummary, null);
});
