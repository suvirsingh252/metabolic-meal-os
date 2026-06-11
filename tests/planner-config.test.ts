import assert from "node:assert/strict";
import test from "node:test";
import { getOptionalNotionMealPlanEnv } from "@/src/lib/env";
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

test("planner env accepts a Meal Plan data source id", () => {
  const previousApiKey = process.env.NOTION_API_KEY;
  const previousDatabaseId = process.env.NOTION_MEAL_PLAN_DATABASE_ID;
  const previousSourceId = process.env.NOTION_MEAL_PLAN_SOURCE_ID;

  process.env.NOTION_API_KEY = "secret_test";
  delete process.env.NOTION_MEAL_PLAN_DATABASE_ID;
  process.env.NOTION_MEAL_PLAN_SOURCE_ID =
    "0be6c674-91e8-4b6b-a68e-1d5df83f6482";

  try {
    assert.deepEqual(getOptionalNotionMealPlanEnv(), {
      NOTION_API_KEY: "secret_test",
      NOTION_MEAL_PLAN_DATABASE_ID: undefined,
      NOTION_MEAL_PLAN_SOURCE_ID: "0be6c674-91e8-4b6b-a68e-1d5df83f6482"
    });
  } finally {
    if (previousApiKey) {
      process.env.NOTION_API_KEY = previousApiKey;
    } else {
      delete process.env.NOTION_API_KEY;
    }

    if (previousDatabaseId) {
      process.env.NOTION_MEAL_PLAN_DATABASE_ID = previousDatabaseId;
    } else {
      delete process.env.NOTION_MEAL_PLAN_DATABASE_ID;
    }

    if (previousSourceId) {
      process.env.NOTION_MEAL_PLAN_SOURCE_ID = previousSourceId;
    } else {
      delete process.env.NOTION_MEAL_PLAN_SOURCE_ID;
    }
  }
});
