import assert from "node:assert/strict";
import test from "node:test";
import { getWeeklyDinnerPlanner } from "@/src/lib/notion/meal-plan";

test("planner returns setup diagnostics when meal plan env is missing", async () => {
  const previousDatabaseId = process.env.NOTION_MEAL_PLAN_DATABASE_ID;
  const previousSourceId = process.env.NOTION_MEAL_PLAN_SOURCE_ID;

  delete process.env.NOTION_MEAL_PLAN_DATABASE_ID;
  delete process.env.NOTION_MEAL_PLAN_SOURCE_ID;

  try {
    const planner = await getWeeklyDinnerPlanner();

    assert.equal(planner.setup.ok, false);
    assert.equal(planner.days.length, 7);
    assert.equal(planner.slots.length, 0);
    assert.equal(planner.setup.issues[0].code, "missing-config");
  } finally {
    if (previousDatabaseId) {
      process.env.NOTION_MEAL_PLAN_DATABASE_ID = previousDatabaseId;
    }

    if (previousSourceId) {
      process.env.NOTION_MEAL_PLAN_SOURCE_ID = previousSourceId;
    }
  }
});
