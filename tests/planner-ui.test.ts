import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("planner client renders the Planner V2 weekly meal workflow", () => {
  const source = readFileSync("src/app/planner/planner-client.tsx", "utf8");

  assert.match(source, /plannerDays\.map/);
  assert.match(source, /Save week/);
  assert.match(source, /Weekly insights/);
  assert.match(source, /Shopping preview/);
  assert.match(source, /randomSuggestion/);
  assert.match(source, /handleDrop/);
  assert.match(source, /availableSuggestionsForSlot/);
  assert.match(source, /Duplicate/);
  assert.match(source, /Replace/);
  assert.match(source, /function clearSelection/);
  assert.match(source, /function duplicateSlot/);
  assert.match(source, /Update Shopping List/);
  assert.match(source, /\/api\/weekly-plan\/grocery/);
  assert.doesNotMatch(source, /mealSlots\.map/);
});

test("planner migration defaults older weekly plan rows to Dinner", () => {
  const migration = readFileSync("drizzle/0005_lucky_ego.sql", "utf8");

  assert.match(
    migration,
    /ADD COLUMN "meal_slot" text DEFAULT 'Dinner' NOT NULL/
  );
  assert.match(
    migration,
    /weekly_dinner_plans_household_week_day_slot_idx/
  );
  assert.match(
    migration,
    /\("household_id","week_start_date","day_of_week","meal_slot"\)/
  );
});
