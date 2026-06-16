import assert from "node:assert/strict";
import test from "node:test";
import {
  rankRecommendationsForCategory,
  scoreRecommendation,
  type RecommendationMeal
} from "@/src/lib/domain/recommendations";
import {
  summarizeMealChipFeedback,
  type FeedbackChip,
  type MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";

// 2026-06-16 is a Tuesday (getUTCDay 2 -> weeknight); 2026-06-20 is a Saturday
// (getUTCDay 6 -> weekend). These anchor the weeknight-fit behavior.
const weeknightAt = "2026-06-16T12:00:00.000Z";
const weekendAt = "2026-06-20T12:00:00.000Z";

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

function chipSummary(
  mealId: string,
  chips: FeedbackChip[],
  createdAt = "2026-05-01T12:00:00.000Z"
) {
  const events = chips.map((chipType) => ({ mealId, chipType, createdAt }));
  return summarizeMealChipFeedback(events)[mealId] ?? null;
}

function scoreWith(
  dinner: RecommendationMeal,
  chips: FeedbackChip[],
  generatedAt: string
) {
  return scoreRecommendation({
    meal: dinner,
    meals: [dinner],
    category: "Dinner",
    generatedAt,
    feedbackSummary: chipSummary(dinner.id, chips)
  });
}

test("date anchors land on the expected weeknight and weekend", () => {
  assert.equal(new Date(weeknightAt).getUTCDay(), 2);
  assert.equal(new Date(weekendAt).getUTCDay(), 6);
});

test("'too much work' penalizes a weeknight but stays neutral on the weekend", () => {
  const dinner = meal({ id: "laksa", qualityScore: 70 });

  const weeknight = scoreWith(dinner, ["too_much_work"], weeknightAt);
  const weekend = scoreWith(dinner, ["too_much_work"], weekendAt);

  assert.ok(weeknight.feedbackAdjustment < 0);
  assert.equal(weekend.feedbackAdjustment, 0);
});

test("'too much work' demotion is cumulative across repeated chips", () => {
  const dinner = meal({ id: "biryani", qualityScore: 70 });

  const once = scoreWith(dinner, ["too_much_work"], weeknightAt);
  const twice = scoreWith(dinner, ["too_much_work", "too_much_work"], weeknightAt);

  assert.ok(twice.feedbackAdjustment < once.feedbackAdjustment);
});

test("'better for weekends' penalizes weeknights and is neutral-to-positive on weekends", () => {
  const dinner = meal({ id: "lasagna", qualityScore: 70 });

  const weeknight = scoreWith(dinner, ["better_for_weekends"], weeknightAt);
  const weekend = scoreWith(dinner, ["better_for_weekends"], weekendAt);

  assert.ok(weeknight.feedbackAdjustment < 0);
  assert.ok(weekend.feedbackAdjustment > 0);
});

test("'needed too many ingredients' penalizes both days but harder on weeknights", () => {
  const dinner = meal({ id: "curry", qualityScore: 70 });

  const weeknight = scoreWith(dinner, ["needed_too_many_ingredients"], weeknightAt);
  const weekend = scoreWith(dinner, ["needed_too_many_ingredients"], weekendAt);

  assert.ok(weeknight.feedbackAdjustment < 0);
  assert.ok(weekend.feedbackAdjustment < 0);
  assert.ok(weeknight.feedbackAdjustment < weekend.feedbackAdjustment);
});

test("positive chips raise the feedback term without double-counting preference", () => {
  const dinner = meal({ id: "tacos", qualityScore: 70 });
  const score = scoreWith(dinner, ["loved_it", "family_loved_it"], weeknightAt);

  // Chip summaries own the feedback term; the legacy preference path is zeroed
  // out so loved/family signals are not counted twice.
  assert.equal(score.preferenceScore, 0);
  assert.ok(score.feedbackAdjustment > 0);
  assert.ok(score.totalScore > score.schedulingScore);
});

test("legacy (non-chip) feedback summaries leave the feedback term at zero", () => {
  const dinner = meal({ id: "dal", qualityScore: 70 });
  const score = scoreRecommendation({
    meal: dinner,
    meals: [dinner],
    category: "Dinner",
    generatedAt: weeknightAt,
    feedbackSummary: {
      mealId: "dal",
      totalEvents: 3,
      eatenCount: 3,
      lovedCount: 1,
      likedCount: 3,
      dislikedCount: 0,
      wouldRepeatCount: 3,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-05-01T12:00:00.000Z",
      lastPositiveAt: "2026-05-01T12:00:00.000Z",
      netPreferenceScore: 12,
      confidence: "medium",
      recentNotes: []
    }
  });

  assert.equal(score.feedbackAdjustment, 0);
  assert.ok(score.preferenceScore > 0);
});

test("scoring stays deterministic for identical chip input", () => {
  const dinner = meal({ id: "ramen", qualityScore: 70 });
  const first = scoreWith(dinner, ["too_much_work", "felt_healthy"], weeknightAt);
  const second = scoreWith(dinner, ["too_much_work", "felt_healthy"], weeknightAt);

  assert.deepEqual(first, second);
});

test("ranking demotes a too-much-work meal on a weeknight and surfaces a reason", () => {
  const quick = meal({
    id: "quick",
    mealName: "Sheet-pan chicken",
    qualityScore: 70
  });
  const fussy = meal({
    id: "fussy",
    mealName: "Slow ragu",
    qualityScore: 70
  });
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    fussy: chipSummary("fussy", ["too_much_work", "too_much_work"])!
  };

  const ranked = rankRecommendationsForCategory([quick, fussy], "Dinner", {
    generatedAt: weeknightAt,
    feedbackByMealId
  });
  const fussyRecommendation = ranked.find((item) => item.meal.id === "fussy");

  assert.equal(ranked[0]?.meal.id, "quick");
  assert.ok(
    fussyRecommendation?.reasons.some((reason) =>
      reason.includes("weeknight")
    )
  );
});
