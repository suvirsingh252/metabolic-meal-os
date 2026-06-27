import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyOptimisticMealDetailFeedback,
  emptyMealFeedbackSummary,
  mergeFeedbackSummariesPreservingOptimistic
} from "@/src/lib/domain/feedback";

test("applyOptimisticMealDetailFeedback updates loved summary immediately", () => {
  const summary = applyOptimisticMealDetailFeedback(
    emptyMealFeedbackSummary("meal-1"),
    "loved",
    {
      createdAt: "2026-06-11T12:00:00.000Z",
      note: "Loved It logged from Meal Detail on 2026-06-11."
    }
  );

  assert.equal(summary.totalEvents, 1);
  assert.equal(summary.eatenCount, 1);
  assert.equal(summary.lovedCount, 1);
  assert.equal(summary.likedCount, 1);
  assert.equal(summary.wouldRepeatCount, 1);
  assert.equal(summary.confidence, "low");
  assert.equal(summary.lastEatenAt, "2026-06-11T12:00:00.000Z");
  assert.deepEqual(summary.recentNotes, [
    "Loved It logged from Meal Detail on 2026-06-11."
  ]);
});

test("applyOptimisticMealDetailFeedback updates disliked summary immediately", () => {
  const summary = applyOptimisticMealDetailFeedback(
    emptyMealFeedbackSummary("meal-1"),
    "disliked",
    {
      createdAt: "2026-06-11T12:00:00.000Z",
      note: "Did Not Like logged from Meal Detail on 2026-06-11."
    }
  );

  assert.equal(summary.totalEvents, 1);
  assert.equal(summary.eatenCount, 1);
  assert.equal(summary.dislikedCount, 1);
  assert.equal(summary.wouldNotRepeatCount, 1);
  assert.equal(summary.likedCount, 0);
  assert.ok(summary.netPreferenceScore < 0);
});

test("shared optimistic feedback helper supports Today ate actions", () => {
  const summary = applyOptimisticMealDetailFeedback(
    emptyMealFeedbackSummary("meal-1"),
    "ate",
    {
      createdAt: "2026-06-11T12:00:00.000Z",
      note: "Ate This logged from Today on 2026-06-11."
    }
  );

  assert.equal(summary.totalEvents, 1);
  assert.equal(summary.eatenCount, 1);
  assert.equal(summary.likedCount, 0);
  assert.equal(summary.wouldRepeatCount, 0);
  assert.equal(summary.lovedCount, 0);
  assert.deepEqual(summary.recentNotes, [
    "Ate This logged from Today on 2026-06-11."
  ]);
});

test("shared optimistic feedback helper keeps repeat-only actions out of eaten count", () => {
  const summary = applyOptimisticMealDetailFeedback(
    emptyMealFeedbackSummary("meal-1"),
    "repeat",
    {
      createdAt: "2026-06-11T12:00:00.000Z",
      note: "Would Make Again logged from Meal Detail on 2026-06-11."
    }
  );

  assert.equal(summary.totalEvents, 1);
  assert.equal(summary.eatenCount, 0);
  assert.equal(summary.wouldRepeatCount, 1);
  assert.equal(summary.likedCount, 0);
});

test("mergeFeedbackSummariesPreservingOptimistic keeps local counts until server catches up", () => {
  const optimistic = applyOptimisticMealDetailFeedback(
    emptyMealFeedbackSummary("meal-1"),
    "loved",
    {
      createdAt: "2026-06-11T12:00:00.000Z",
      note: "Loved It logged from Today on 2026-06-11."
    }
  );
  const staleServer = emptyMealFeedbackSummary("meal-1");
  const caughtUpServer = {
    ...optimistic,
    recentNotes: ["Server-confirmed note"]
  };

  assert.equal(
    mergeFeedbackSummariesPreservingOptimistic(
      { "meal-1": optimistic },
      { "meal-1": staleServer }
    )["meal-1"]?.totalEvents,
    1
  );
  assert.deepEqual(
    mergeFeedbackSummariesPreservingOptimistic(
      { "meal-1": optimistic },
      { "meal-1": caughtUpServer }
    )["meal-1"]?.recentNotes,
    ["Server-confirmed note"]
  );
});

test("meal detail actions expose pending, success, refresh, and duplicate guards", () => {
  const source = readFileSync(
    "src/app/meals/[id]/meal-detail-actions.tsx",
    "utf8"
  );

  assert.match(source, /router\.refresh\(\)/);
  assert.match(source, /disabled=\{Boolean\(pendingAction\)\}/);
  assert.match(source, /if \(pendingAction\)/);
  assert.match(source, /Saving\.\.\./);
  assert.match(source, /Dinner noted\./);
  assert.match(source, /Saved as a favorite\./);
  assert.match(source, /Added to repeat soon\./);
});

test("Today feedback actions expose optimistic refresh, pending labels, duplicate guards, and rollback behavior", () => {
  const source = readFileSync("src/app/today/today-client.tsx", "utf8");

  assert.match(source, /applyOptimisticFeedbackSummary/);
  assert.match(source, /applyOptimisticTodayRecommendation/);
  assert.match(source, /router\.refresh\(\)/);
  assert.match(source, /pendingMealIdsRef\.current\.has/);
  assert.match(source, /pendingMealIdsRef\.current\.delete/);
  assert.match(source, /disabled=\{pendingAction !== null\}/);
  assert.match(source, /Saving\.\.\./);
  assert.match(source, /Eaten \{feedbackSummary\.eatenCount\}/);
  assert.match(source, /Loved \{feedbackSummary\.lovedCount\}/);
  assert.match(source, /Would repeat \{feedbackSummary\.wouldRepeatCount\}/);
  assert.match(source, /Ate This records: logged as eaten\./);
  assert.match(source, /Loved It records: eaten, loved, and worth repeating\./);
});
