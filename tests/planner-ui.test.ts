import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("planner client renders the Phase 8B weekly dinner workflow", () => {
  const source = readFileSync("src/app/planner/planner-client.tsx", "utf8");

  assert.match(source, /plannerDays\.map/);
  assert.match(source, /Save Plan/);
  assert.match(source, /Regenerate Grocery List/);
  assert.match(source, /\/api\/weekly-plan\/grocery/);
  assert.doesNotMatch(source, /mealSlots\.map/);
});
