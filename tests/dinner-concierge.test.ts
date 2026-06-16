import assert from "node:assert/strict";
import test from "node:test";
import {
  getDinnerConciergeViewModel,
  type DinnerConciergeMeal
} from "@/src/lib/domain/recommendations";
import {
  summarizeMealChipFeedback,
  type FeedbackChip,
  type MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";

// 2026-06-16 is a Tuesday (weeknight); 2026-06-20 is a Saturday (weekend).
const weeknightAt = "2026-06-16T12:00:00.000Z";
const weekendAt = "2026-06-20T12:00:00.000Z";

function meal(overrides: Partial<DinnerConciergeMeal>): DinnerConciergeMeal {
  return {
    id: overrides.id ?? "meal",
    url: overrides.url ?? "https://notion.so/meal",
    mealName: overrides.mealName ?? overrides.id ?? "Meal",
    createdAt: overrides.createdAt ?? "2026-04-01T12:00:00.000Z",
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
    qualityScore: overrides.qualityScore ?? null,
    imageUrl: overrides.imageUrl,
    estimatedMinutes: overrides.estimatedMinutes,
    effortLevel: overrides.effortLevel,
    tags: overrides.tags
  };
}

function feedbackFor(
  entries: Record<string, FeedbackChip[]>,
  createdAt = "2026-04-05T12:00:00.000Z"
): MealFeedbackSummaryByMealId {
  const events = Object.entries(entries).flatMap(([mealId, chips]) =>
    chips.map((chipType) => ({ mealId, chipType, createdAt }))
  );
  return summarizeMealChipFeedback(events);
}

test("1. view model returns a lead and two alternates from ranked meals", () => {
  const meals = [
    meal({ id: "a", mealName: "Chana masala", qualityScore: 88 }),
    meal({ id: "b", mealName: "Paneer bowls", qualityScore: 84 }),
    meal({ id: "c", mealName: "Lentil soup", qualityScore: 80 }),
    meal({ id: "d", mealName: "Veg biryani", qualityScore: 76 })
  ];

  const view = getDinnerConciergeViewModel({ meals, generatedAt: weeknightAt });

  assert.ok(view.leadRecommendation);
  assert.equal(view.alternates.length, 2);
  assert.equal(view.emptyState, undefined);
  const ids = [
    view.leadRecommendation!.mealId,
    ...view.alternates.map((item) => item.mealId)
  ];
  assert.equal(new Set(ids).size, 3);
});

test("2. empty meal list returns a useful empty state", () => {
  const view = getDinnerConciergeViewModel({ meals: [], generatedAt: weeknightAt });

  assert.equal(view.leadRecommendation, null);
  assert.equal(view.alternates.length, 0);
  assert.equal(view.freshIdeas.length, 0);
  assert.ok(view.emptyState);
  assert.ok(view.emptyState!.title.length > 0);
  assert.ok(view.emptyState!.message.length > 0);
});

test("2b. meals present but no eligible dinners returns the no-picks empty state", () => {
  const meals = [
    meal({ id: "breakfast", mealName: "Oatmeal", mealType: "Breakfast" })
  ];

  const view = getDinnerConciergeViewModel({ meals, generatedAt: weeknightAt });

  assert.equal(view.leadRecommendation, null);
  assert.ok(view.emptyState);
  assert.equal(view.emptyState!.title, "No dinner picks tonight");
});

test("3. Healthy/Lighter refinement boosts meals with felt-healthy feedback", () => {
  const meals = [
    meal({
      id: "salad",
      mealName: "Grain bowl",
      qualityScore: 70,
      fiberG: 10,
      proteinG: 28,
      calories: 520
    })
  ];
  const feedbackByMealId = feedbackFor({ salad: ["felt_healthy"] });

  const baseline = getDinnerConciergeViewModel({
    meals,
    generatedAt: weeknightAt,
    feedbackByMealId
  });
  const refined = getDinnerConciergeViewModel({
    meals,
    generatedAt: weeknightAt,
    feedbackByMealId,
    refinements: { mood: ["healthy-lighter"] }
  });

  assert.ok(
    refined.leadRecommendation!.scoreBreakdown.feedbackAdjustment >
      baseline.leadRecommendation!.scoreBreakdown.feedbackAdjustment
  );
  assert.ok(refined.leadRecommendation!.score > baseline.leadRecommendation!.score);
});

test("4. Quick refinement penalizes a 'better for weekends' meal", () => {
  const meals = [meal({ id: "ragu", mealName: "Slow ragu", qualityScore: 70 })];
  const feedbackByMealId = feedbackFor({ ragu: ["better_for_weekends"] });

  const baseline = getDinnerConciergeViewModel({
    meals,
    generatedAt: weekendAt,
    feedbackByMealId
  });
  const refined = getDinnerConciergeViewModel({
    meals,
    generatedAt: weekendAt,
    feedbackByMealId,
    refinements: { mood: ["quick"] }
  });

  assert.ok(
    refined.leadRecommendation!.scoreBreakdown.feedbackAdjustment <
      baseline.leadRecommendation!.scoreBreakdown.feedbackAdjustment
  );
  assert.ok(refined.leadRecommendation!.score < baseline.leadRecommendation!.score);
});

test("5. Family dinner refinement prefers family-approved meals", () => {
  const meals = [
    meal({ id: "solo", mealName: "Spicy ramen", qualityScore: 78 }),
    meal({ id: "family", mealName: "Roast chicken", qualityScore: 78, familyApproved: true })
  ];

  const refined = getDinnerConciergeViewModel({
    meals,
    generatedAt: weeknightAt,
    refinements: { tonight: ["family-dinner"] }
  });

  assert.equal(refined.leadRecommendation!.mealId, "family");
});

test("6. Cuisine/mood refinement prefers matching cuisine meals", () => {
  const meals = [
    meal({ id: "thai", mealName: "Thai green curry", cuisine: "Thai", qualityScore: 80 }),
    meal({ id: "med", mealName: "Greek bowls", cuisine: "Mediterranean", qualityScore: 78 })
  ];

  const refined = getDinnerConciergeViewModel({
    meals,
    generatedAt: weeknightAt,
    refinements: { mood: ["mediterranean"] }
  });

  assert.equal(refined.leadRecommendation!.mealId, "med");
});

test("7. fresh ideas avoid duplicating the lead and alternates", () => {
  const meals = [
    meal({ id: "a", mealName: "Chana masala", qualityScore: 90 }),
    meal({ id: "b", mealName: "Paneer bowls", qualityScore: 86 }),
    meal({ id: "c", mealName: "Lentil soup", qualityScore: 82 }),
    meal({ id: "d", mealName: "Veg biryani", qualityScore: 78 }),
    meal({ id: "e", mealName: "Tofu stir fry", qualityScore: 74 })
  ];

  const view = getDinnerConciergeViewModel({ meals, generatedAt: weeknightAt });
  const shownIds = new Set([
    view.leadRecommendation!.mealId,
    ...view.alternates.map((item) => item.mealId)
  ]);

  assert.ok(view.freshIdeas.length > 0);
  for (const idea of view.freshIdeas) {
    assert.ok(!shownIds.has(idea.mealId));
  }
});

test("8. fresh ideas avoid strongly negative meals when alternatives exist", () => {
  const meals = [
    meal({ id: "a", mealName: "Chana masala", qualityScore: 90 }),
    meal({ id: "b", mealName: "Paneer bowls", qualityScore: 86 }),
    meal({ id: "c", mealName: "Lentil soup", qualityScore: 82 }),
    meal({ id: "good", mealName: "Tofu stir fry", qualityScore: 70 }),
    meal({ id: "bad", mealName: "Mushy pasta", qualityScore: 70 })
  ];
  const feedbackByMealId = feedbackFor({
    bad: ["not_worth_it", "not_worth_it"]
  });

  const view = getDinnerConciergeViewModel({
    meals,
    generatedAt: weeknightAt,
    feedbackByMealId
  });
  const freshIds = view.freshIdeas.map((item) => item.mealId);

  assert.ok(freshIds.includes("good"));
  assert.ok(!freshIds.includes("bad"));
});

test("9. missing image/cuisine/time metadata does not crash", () => {
  const meals = [
    meal({ id: "bare", mealName: "Mystery dinner", qualityScore: 72 }),
    meal({ id: "bare2", mealName: "Another dinner", qualityScore: 70 })
  ];

  const view = getDinnerConciergeViewModel({ meals, generatedAt: weeknightAt });

  assert.ok(view.leadRecommendation);
  assert.equal(view.leadRecommendation!.imageUrl, null);
  assert.equal(view.leadRecommendation!.cuisine, null);
  assert.equal(view.leadRecommendation!.estimatedMinutes, null);
  assert.ok(Array.isArray(view.leadRecommendation!.badges));
});

test("10. generated reasons are non-empty human-readable strings", () => {
  const meals = [
    meal({
      id: "a",
      mealName: "Chana masala",
      qualityScore: 88,
      familyApproved: true
    }),
    meal({ id: "b", mealName: "Paneer bowls", qualityScore: 80 })
  ];

  const view = getDinnerConciergeViewModel({ meals, generatedAt: weeknightAt });
  const reasons = view.leadRecommendation!.reasons;

  assert.ok(reasons.length > 0);
  for (const reason of reasons) {
    assert.equal(typeof reason, "string");
    assert.ok(reason.trim().length > 0);
    assert.notEqual(reason, view.leadRecommendation!.mealId);
  }
});
