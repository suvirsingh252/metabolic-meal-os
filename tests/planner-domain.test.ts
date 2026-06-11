import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentPlannerWeek,
  validateMealId,
  validatePlanDate,
  validatePlannerMutation
} from "@/src/lib/domain/planner";

test("planner week renders Monday through Sunday", () => {
  const days = getCurrentPlannerWeek(new Date("2026-06-11T12:00:00.000Z"));

  assert.equal(days[0].date, "2026-06-08");
  assert.equal(days[0].weekday, "Monday");
  assert.equal(days[6].date, "2026-06-14");
  assert.equal(days[6].weekday, "Sunday");
});

test("planner validates YYYY-MM-DD real dates", () => {
  assert.equal(validatePlanDate("2026-06-11"), "2026-06-11");
  assert.throws(() => validatePlanDate("2026-6-11"), /YYYY-MM-DD/);
  assert.throws(() => validatePlanDate("2026-02-31"), /real calendar/);
});

test("planner validates assign mutation meal IDs", () => {
  const mutation = validatePlannerMutation({
    planDate: "2026-06-11",
    slot: "Dinner",
    action: "assign",
    mealId: "01234567-89ab-cdef-0123-456789abcdef"
  });

  assert.deepEqual(mutation, {
    planDate: "2026-06-11",
    slot: "Dinner",
    action: "assign",
    mealId: "01234567-89ab-cdef-0123-456789abcdef"
  });
  assert.throws(
    () =>
      validatePlannerMutation({
        planDate: "2026-06-11",
        slot: "Dinner",
        action: "assign",
        mealId: "not-a-page"
      }),
    /Meal ID/
  );
});

test("planner validates status and slot enums", () => {
  assert.deepEqual(
    validatePlannerMutation({
      planDate: "2026-06-11",
      slot: "Dinner",
      action: "status",
      status: "Cooked"
    }),
    {
      planDate: "2026-06-11",
      slot: "Dinner",
      action: "status",
      status: "Cooked"
    }
  );
  assert.throws(
    () =>
      validatePlannerMutation({
        planDate: "2026-06-11",
        slot: "Brunch",
        action: "clear"
      }),
    /Meal slot/
  );
  assert.throws(
    () =>
      validatePlannerMutation({
        planDate: "2026-06-11",
        slot: "Dinner",
        action: "status",
        status: "Done"
      }),
    /Status/
  );
});

test("planner accepts compact Notion page IDs", () => {
  assert.equal(
    validateMealId("0123456789abcdef0123456789abcdef"),
    "0123456789abcdef0123456789abcdef"
  );
});
