import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPlannerContextLabel,
  getDeepLinkPreselection,
  getCurrentPlannerWeek,
  getPlannerSlotKey,
  type PlannerViewModel
} from "@/src/lib/domain/planner";

// Fixed reference week: today = Wednesday 2026-06-10 UTC
// → Mon Jun 8 … Sun Jun 14
const weekDays = getCurrentPlannerWeek(new Date("2026-06-10T00:00:00.000Z"));
const monday = weekDays[0]!;
const wednesday = weekDays[2]!;

const minimalPlanner: PlannerViewModel = {
  weekStart: monday.label,
  weekEnd: weekDays[6]!.label,
  days: weekDays,
  slots: [],
  setup: { ok: true, issues: [] }
};

// ─── getDeepLinkPreselection ──────────────────────────────────────────────────

test("getDeepLinkPreselection preselects Dinner slot for a dinner meal", () => {
  const result = getDeepLinkPreselection(
    "meal-abc",
    [{ id: "meal-abc", mealType: "Dinner" }],
    minimalPlanner,
    2
  );

  assert.deepEqual(result, {
    [getPlannerSlotKey(wednesday.date, "Dinner")]: "meal-abc"
  });
});

test("getDeepLinkPreselection preselects Breakfast slot for a breakfast meal", () => {
  const result = getDeepLinkPreselection(
    "meal-bkf",
    [{ id: "meal-bkf", mealType: "Breakfast" }],
    minimalPlanner,
    2
  );

  assert.deepEqual(result, {
    [getPlannerSlotKey(wednesday.date, "Breakfast")]: "meal-bkf"
  });
});

test("getDeepLinkPreselection preselects Snack slot for a snack meal", () => {
  const result = getDeepLinkPreselection(
    "meal-snk",
    [{ id: "meal-snk", mealType: "Snack" }],
    minimalPlanner,
    2
  );

  assert.deepEqual(result, {
    [getPlannerSlotKey(wednesday.date, "Snack")]: "meal-snk"
  });
});

test("getDeepLinkPreselection falls back to Dinner when mealType is null", () => {
  const result = getDeepLinkPreselection(
    "meal-unk",
    [{ id: "meal-unk", mealType: null }],
    minimalPlanner,
    2
  );

  assert.deepEqual(result, {
    [getPlannerSlotKey(wednesday.date, "Dinner")]: "meal-unk"
  });
});

test("getDeepLinkPreselection returns empty object when meal is not in the list", () => {
  const result = getDeepLinkPreselection(
    "meal-missing",
    [{ id: "meal-abc", mealType: "Dinner" }],
    minimalPlanner,
    2
  );

  assert.deepEqual(result, {});
});

test("getDeepLinkPreselection uses the day at defaultDayIndex", () => {
  const result = getDeepLinkPreselection(
    "meal-abc",
    [{ id: "meal-abc", mealType: "Dinner" }],
    minimalPlanner,
    0 // Monday
  );

  assert.deepEqual(result, {
    [getPlannerSlotKey(monday.date, "Dinner")]: "meal-abc"
  });
});

// ─── formatPlannerContextLabel ────────────────────────────────────────────────

test("formatPlannerContextLabel formats Planned status", () => {
  const label = formatPlannerContextLabel(
    { planDate: wednesday.date, mealSlot: "Dinner", status: "Planned" },
    weekDays
  );

  assert.equal(label, "Planned for Wednesday dinner");
});

test("formatPlannerContextLabel formats Cooked status", () => {
  const label = formatPlannerContextLabel(
    { planDate: wednesday.date, mealSlot: "Dinner", status: "Cooked" },
    weekDays
  );

  assert.equal(label, "Cooked — Wednesday dinner");
});

test("formatPlannerContextLabel formats Skipped status", () => {
  const label = formatPlannerContextLabel(
    { planDate: wednesday.date, mealSlot: "Lunch", status: "Skipped" },
    weekDays
  );

  assert.equal(label, "Skipped — Wednesday lunch");
});

test("formatPlannerContextLabel treats Swapped as Planned", () => {
  const label = formatPlannerContextLabel(
    { planDate: wednesday.date, mealSlot: "Breakfast", status: "Swapped" },
    weekDays
  );

  assert.equal(label, "Planned for Wednesday breakfast");
});

test("formatPlannerContextLabel falls back to raw planDate when day not found", () => {
  const label = formatPlannerContextLabel(
    { planDate: "2026-01-01", mealSlot: "Dinner", status: "Planned" },
    weekDays
  );

  assert.equal(label, "Planned for 2026-01-01 dinner");
});
