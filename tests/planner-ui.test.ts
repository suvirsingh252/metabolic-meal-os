import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("planner client renders all configured meal slots", () => {
  const source = readFileSync("src/app/planner/planner-client.tsx", "utf8");

  assert.match(source, /mealSlots\.map/);
  assert.match(source, /mutatePlanner\(day\.date, mealSlot/);
  assert.doesNotMatch(source, /slot: "Dinner"/);
});
