import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMealFeedback } from "@/src/lib/domain/feedback";
import type { MealFeedbackEvent } from "@/src/lib/domain/feedback";

function event(overrides: Partial<MealFeedbackEvent>): MealFeedbackEvent {
  return {
    mealId: "meal-1",
    createdAt: "2026-06-10T12:00:00.000Z",
    feedbackEntry: "Dinner",
    energyAfter: "Steady",
    hungerLater: "Satisfied",
    cravingsLater: false,
    wouldRepeat: true,
    notes: "",
    ...overrides
  };
}

test("summarizeMealFeedback aggregates linked feedback by meal", () => {
  const summaries = summarizeMealFeedback([
    event({
      feedbackEntry: "Chana masala - loved from Today",
      energyAfter: "Excellent",
      createdAt: "2026-06-09T12:00:00.000Z"
    }),
    event({
      createdAt: "2026-06-10T12:00:00.000Z",
      feedbackEntry: "Chana masala - ate from Today"
    })
  ]);

  assert.equal(summaries["meal-1"]?.totalEvents, 2);
  assert.equal(summaries["meal-1"]?.eatenCount, 2);
  assert.equal(summaries["meal-1"]?.lovedCount, 1);
  assert.equal(summaries["meal-1"]?.wouldRepeatCount, 2);
  assert.equal(summaries["meal-1"]?.lastEatenAt, "2026-06-10T12:00:00.000Z");
  assert.equal(summaries["meal-1"]?.confidence, "medium");
  assert.ok((summaries["meal-1"]?.netPreferenceScore ?? 0) > 0);
});

test("summarizeMealFeedback skips feedback that is not linked to a meal", () => {
  const summaries = summarizeMealFeedback([
    event({ mealId: null }),
    event({ mealId: "", feedbackEntry: "Manual feedback" })
  ]);

  assert.deepEqual(summaries, {});
});

test("summarizeMealFeedback captures disliked and mixed feedback", () => {
  const summaries = summarizeMealFeedback([
    event({ mealId: "meal-2", wouldRepeat: true }),
    event({
      mealId: "meal-2",
      energyAfter: "Crash",
      hungerLater: "Very Hungry",
      cravingsLater: true,
      wouldRepeat: false
    })
  ]);

  assert.equal(summaries["meal-2"]?.likedCount, 1);
  assert.equal(summaries["meal-2"]?.dislikedCount, 1);
  assert.equal(summaries["meal-2"]?.wouldNotRepeatCount, 1);
  assert.equal(summaries["meal-2"]?.confidence, "medium");
});

test("summarizeMealFeedback keeps Meal Detail repeat-only feedback out of eaten count", () => {
  const summaries = summarizeMealFeedback([
    event({
      feedbackEntry: "Chana masala - would make again from Meal Detail",
      energyAfter: "Neutral",
      hungerLater: "Moderate",
      wouldRepeat: true,
      notes: "Would Make Again logged from Meal Detail on 2026-06-11."
    })
  ]);

  assert.equal(summaries["meal-1"]?.totalEvents, 1);
  assert.equal(summaries["meal-1"]?.eatenCount, 0);
  assert.equal(summaries["meal-1"]?.likedCount, 0);
  assert.equal(summaries["meal-1"]?.wouldRepeatCount, 1);
  assert.equal(summaries["meal-1"]?.lastEatenAt, null);
});

test("summarizeMealFeedback exposes recent feedback notes without schema changes", () => {
  const summaries = summarizeMealFeedback([
    event({ notes: "Newest note" }),
    event({ notes: "Older note" }),
    event({ notes: "Oldest kept note" }),
    event({ notes: "Extra old note" })
  ]);

  assert.deepEqual(summaries["meal-1"]?.recentNotes, [
    "Newest note",
    "Older note",
    "Oldest kept note"
  ]);
});

test("summarizeMealFeedback keeps family cookbook adjustments separate from recent note cap", () => {
  const summaries = summarizeMealFeedback([
    event({ notes: "[Family cookbook adjustment] Cook 5 minutes longer" }),
    event({ notes: "Newest note" }),
    event({ notes: "Older note" }),
    event({ notes: "Oldest kept note" }),
    event({ notes: "Extra old note" }),
    event({ notes: "[Family cookbook adjustment] Use the air fryer" })
  ]);

  assert.deepEqual(summaries["meal-1"]?.recentNotes, [
    "[Family cookbook adjustment] Cook 5 minutes longer",
    "Newest note",
    "Older note"
  ]);
  assert.deepEqual(summaries["meal-1"]?.familyAdjustments, [
    "Cook 5 minutes longer",
    "Use the air fryer"
  ]);
});
