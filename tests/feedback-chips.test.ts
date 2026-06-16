import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyMealChipFeedbackSummary,
  getFeedbackExplanationReasons,
  getFeedbackScoreAdjustment,
  summarizeMealChipFeedback,
  type FeedbackChip,
  type FeedbackChipEvent,
  type RecommendationContext
} from "@/src/lib/domain/feedback";

const weeknight: RecommendationContext = { dayOfWeek: 2 };
const weekend: RecommendationContext = { dayOfWeek: 6 };

function event(
  chipType: FeedbackChip,
  overrides: Partial<FeedbackChipEvent> = {}
): FeedbackChipEvent {
  return {
    mealId: "meal-1",
    chipType,
    createdAt: "2026-06-10T12:00:00.000Z",
    ...overrides
  };
}

function summaryFor(events: FeedbackChipEvent[]) {
  return summarizeMealChipFeedback(events)["meal-1"];
}

test("Loved it strongly increases score", () => {
  const summary = summaryFor([event("loved_it")]);

  assert.equal(summary.lovedCount, 1);
  assert.ok(getFeedbackScoreAdjustment(summary, weeknight) >= 20);
});

test("Family loved it increases score and creates a family-friendly explanation", () => {
  const summary = summaryFor([event("family_loved_it")]);
  const reasons = getFeedbackExplanationReasons(summary, weeknight);

  assert.equal(summary.lovedCount, 1);
  assert.equal(summary.familyLovedCount, 1);
  assert.ok(getFeedbackScoreAdjustment(summary, weeknight) >= 20);
  assert.ok(reasons.some((reason) => /family-friendly/i.test(reason)));
});

test("Would make again increases score", () => {
  const summary = summaryFor([event("would_make_again")]);

  assert.equal(summary.wouldRepeatCount, 1);
  assert.ok(getFeedbackScoreAdjustment(summary, weeknight) > 0);
});

test("Felt healthy boosts when Healthy or Lighter refine is active", () => {
  const summary = summaryFor([event("felt_healthy")]);
  const neutralScore = getFeedbackScoreAdjustment(summary, weeknight);
  const lighterScore = getFeedbackScoreAdjustment(summary, {
    dayOfWeek: 2,
    selectedMoodChips: ["Lighter"]
  });

  assert.ok(neutralScore > 0);
  assert.ok(lighterScore > neutralScore);
});

test("Too much work penalizes weeknight recommendations", () => {
  const summary = summaryFor([event("too_much_work")]);

  assert.ok(getFeedbackScoreAdjustment(summary, weeknight) < 0);
  assert.ok(
    getFeedbackExplanationReasons(summary, weeknight).some((reason) =>
      /too much work/i.test(reason)
    )
  );
});

test("Needed too many ingredients penalizes convenience", () => {
  const summary = summaryFor([event("needed_too_many_ingredients")]);
  const normalScore = getFeedbackScoreAdjustment(summary, weekend);
  const quickScore = getFeedbackScoreAdjustment(summary, {
    dayOfWeek: 6,
    selectedTimeChip: "Under 20"
  });

  assert.ok(normalScore < 0);
  assert.ok(quickScore < normalScore);
});

test("Better for weekends penalizes Monday through Thursday", () => {
  const summary = summaryFor([event("better_for_weekends")]);

  assert.ok(getFeedbackScoreAdjustment(summary, { dayOfWeek: 1 }) < 0);
  assert.ok(getFeedbackScoreAdjustment(summary, { dayOfWeek: 4 }) < 0);
});

test("Better for weekends is neutral or positive Friday through Sunday unless quick filters are active", () => {
  const summary = summaryFor([event("better_for_weekends")]);

  assert.ok(getFeedbackScoreAdjustment(summary, { dayOfWeek: 5 }) >= 0);
  assert.ok(getFeedbackScoreAdjustment(summary, { dayOfWeek: 6 }) >= 0);
  assert.ok(getFeedbackScoreAdjustment(summary, { dayOfWeek: 0 }) >= 0);
  assert.ok(
    getFeedbackScoreAdjustment(summary, {
      dayOfWeek: 6,
      selectedRealityChips: ["Low effort"]
    }) < 0
  );
});

test("Not worth it strongly decreases score", () => {
  const summary = summaryFor([event("not_worth_it")]);

  assert.equal(summary.dislikedCount, 1);
  assert.equal(summary.wouldNotRepeatCount, 1);
  assert.ok(getFeedbackScoreAdjustment(summary, weeknight) <= -25);
});

test("Multiple chips combine predictably", () => {
  const positive = getFeedbackScoreAdjustment(
    summaryFor([event("loved_it")]),
    weeknight
  );
  const negative = getFeedbackScoreAdjustment(
    summaryFor([event("too_much_work")]),
    weeknight
  );
  const combined = getFeedbackScoreAdjustment(
    summaryFor([event("loved_it"), event("too_much_work")]),
    weeknight
  );

  assert.equal(combined, positive + negative);
});

test("Multiple historical feedback events summarize predictably", () => {
  const summary = summaryFor([
    event("loved_it", { createdAt: "2026-06-01T12:00:00.000Z" }),
    event("family_loved_it", { createdAt: "2026-06-02T12:00:00.000Z" }),
    event("would_make_again", { createdAt: "2026-06-03T12:00:00.000Z" }),
    event("not_worth_it", { createdAt: "2026-06-04T12:00:00.000Z" })
  ]);

  assert.equal(summary.totalEvents, 4);
  assert.equal(summary.lovedCount, 2);
  assert.equal(summary.wouldRepeatCount, 3);
  assert.equal(summary.wouldNotRepeatCount, 1);
  assert.equal(summary.lastEatenAt, "2026-06-04T12:00:00.000Z");
  assert.equal(summary.confidence, "medium");
});

test("Empty feedback returns neutral score and no misleading explanations", () => {
  const summary = emptyMealChipFeedbackSummary("meal-1");

  assert.equal(getFeedbackScoreAdjustment(summary, weeknight), 0);
  assert.deepEqual(getFeedbackExplanationReasons(summary, weeknight), []);
  assert.equal(getFeedbackScoreAdjustment(null, weeknight), 0);
  assert.deepEqual(getFeedbackExplanationReasons(null, weeknight), []);
});
