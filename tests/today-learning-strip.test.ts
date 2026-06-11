import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyOptimisticFeedbackSummary,
  buildHouseholdLearningStrip,
  emptyMealFeedbackSummary,
  mergeFeedbackSummariesPreservingOptimistic,
  preserveLocalFeedbackOverrides,
  restoreFeedbackSummarySnapshot,
  type MealFeedbackSummary
} from "@/src/lib/domain/feedback";

const generatedAt = "2026-06-11T12:00:00.000Z";

function summary(overrides: Partial<MealFeedbackSummary>): MealFeedbackSummary {
  return {
    ...emptyMealFeedbackSummary("meal-1"),
    totalEvents: 1,
    eatenCount: 1,
    lastEatenAt: "2026-06-10T12:00:00.000Z",
    confidence: "low",
    ...overrides
  };
}

test("buildHouseholdLearningStrip returns compact recent feedback copy", () => {
  const learning = buildHouseholdLearningStrip(
    {
      "meal-1": summary({ mealId: "meal-1" }),
      "meal-2": summary({
        mealId: "meal-2",
        lovedCount: 1,
        likedCount: 1,
        wouldRepeatCount: 1,
        lastPositiveAt: "2026-06-09T12:00:00.000Z"
      }),
      "meal-3": summary({
        mealId: "meal-3",
        lastEatenAt: "2026-05-01T12:00:00.000Z"
      })
    },
    { generatedAt }
  );

  assert.equal(learning.hasRecentFeedback, true);
  assert.equal(
    learning.headline,
    "Recent feedback is helping tune today's recommendations."
  );
  assert.deepEqual(
    learning.items.map((item) => item.text),
    ["2 meals marked Ate This recently.", "1 meal loved recently."]
  );
});

test("buildHouseholdLearningStrip returns an empty state without recent feedback", () => {
  const learning = buildHouseholdLearningStrip(
    {
      "meal-1": summary({
        lastEatenAt: "2026-05-01T12:00:00.000Z",
        lastPositiveAt: "2026-05-01T12:00:00.000Z",
        lovedCount: 1
      })
    },
    { generatedAt }
  );

  assert.equal(learning.hasRecentFeedback, false);
  assert.equal(learning.headline, "No recent household feedback yet.");
  assert.equal(
    learning.emptyText,
    "Tap Ate This or Loved It on a meal to start teaching Today."
  );
  assert.deepEqual(learning.items, []);
});

test("optimistic Today Ate This and Loved It updates affect the learning strip", () => {
  const afterAte = applyOptimisticFeedbackSummary(
    emptyMealFeedbackSummary("meal-1"),
    "ate",
    {
      createdAt: generatedAt,
      note: "Ate This logged from Today on 2026-06-11."
    }
  );
  const afterLoved = applyOptimisticFeedbackSummary(
    emptyMealFeedbackSummary("meal-2"),
    "loved",
    {
      createdAt: generatedAt,
      note: "Loved It logged from Today on 2026-06-11."
    }
  );
  const learning = buildHouseholdLearningStrip(
    {
      "meal-1": afterAte,
      "meal-2": afterLoved
    },
    { generatedAt }
  );

  assert.deepEqual(
    learning.items.map((item) => item.text),
    ["2 meals marked Ate This recently.", "1 meal loved recently."]
  );
});

test("stale refresh data does not erase optimistic learning strip counts", () => {
  const optimistic = applyOptimisticFeedbackSummary(
    emptyMealFeedbackSummary("meal-1"),
    "loved",
    {
      createdAt: generatedAt,
      note: "Loved It logged from Today on 2026-06-11."
    }
  );
  const stale = emptyMealFeedbackSummary("meal-1");
  const merged = mergeFeedbackSummariesPreservingOptimistic(
    { "meal-1": optimistic },
    { "meal-1": stale }
  );
  const learning = buildHouseholdLearningStrip(merged, { generatedAt });

  assert.deepEqual(
    learning.items.map((item) => item.text),
    ["1 meal marked Ate This recently.", "1 meal loved recently."]
  );
});

test("undo restores the previous meal feedback summary", () => {
  const previous = summary({
    mealId: "meal-1",
    totalEvents: 2,
    eatenCount: 2,
    lovedCount: 1,
    likedCount: 2,
    wouldRepeatCount: 2
  });
  const optimistic = applyOptimisticFeedbackSummary(previous, "ate", {
    createdAt: generatedAt,
    note: "Ate This logged from Today on 2026-06-11."
  });
  const restored = restoreFeedbackSummarySnapshot(
    { "meal-1": optimistic },
    "meal-1",
    previous
  );

  assert.deepEqual(restored["meal-1"], previous);
});

test("undo removes a meal with no previous feedback and updates the learning strip", () => {
  const optimistic = applyOptimisticFeedbackSummary(
    emptyMealFeedbackSummary("meal-1"),
    "loved",
    {
      createdAt: generatedAt,
      note: "Loved It logged from Today on 2026-06-11."
    }
  );
  const restored = restoreFeedbackSummarySnapshot(
    { "meal-1": optimistic },
    "meal-1",
    null
  );
  const learning = buildHouseholdLearningStrip(restored, { generatedAt });

  assert.equal(restored["meal-1"], undefined);
  assert.equal(learning.hasRecentFeedback, false);
  assert.deepEqual(learning.items, []);
});

test("local undo override prevents stale server feedback from reappearing immediately", () => {
  const persisted = applyOptimisticFeedbackSummary(
    emptyMealFeedbackSummary("meal-1"),
    "loved",
    {
      createdAt: generatedAt,
      note: "Loved It logged from Today on 2026-06-11."
    }
  );
  const preserved = preserveLocalFeedbackOverrides(
    { "meal-1": persisted },
    {},
    ["meal-1"]
  );
  const learning = buildHouseholdLearningStrip(preserved, { generatedAt });

  assert.equal(preserved["meal-1"], undefined);
  assert.equal(learning.hasRecentFeedback, false);
});

test("Today renders the recent household learning strip", () => {
  const source = readFileSync("src/app/today/today-client.tsx", "utf8");

  assert.match(source, /buildHouseholdLearningStrip/);
  assert.match(source, /<HouseholdLearningStrip learning=\{learningStrip\} \/>/);
  assert.match(source, /Recent household learning/);
  assert.match(source, /aria-label="Recent household learning"/);
  assert.match(source, /learning\.emptyText/);
});

test("Today renders client-only undo copy after feedback saves", () => {
  const source = readFileSync("src/app/today/today-client.tsx", "utf8");

  assert.match(source, /undoByMealId/);
  assert.match(source, /previousSummary: previousSnapshot/);
  assert.match(source, /restoreFeedbackSummarySnapshot/);
  assert.match(source, /preserveLocalFeedbackOverrides/);
  assert.match(source, /locallyUndoneMealIdsRef\.current\.add/);
  assert.match(source, /Saved\. Undo\?/);
  assert.match(source, /Undo local view/);
  assert.match(source, /The saved feedback record was kept/);
});
