import assert from "node:assert/strict";
import test from "node:test";
import {
  getMealQualityState,
  getTargetProgressState
} from "@/src/app/dashboard/dashboard-display";

test("getTargetProgressState marks missing values as unavailable", () => {
  const state = getTargetProgressState({
    intent: "gain",
    target: 100,
    unit: "g",
    value: null
  });

  assert.equal(state.percent, null);
  assert.equal(state.cappedPercent, 0);
  assert.equal(state.tone, "unavailable");
});

test("getTargetProgressState treats protein and fiber as higher-is-better", () => {
  const state = getTargetProgressState({
    intent: "gain",
    target: 100,
    unit: "g",
    value: 105
  });

  assert.equal(state.percent, 105);
  assert.equal(state.cappedPercent, 100);
  assert.equal(state.tone, "positive");
});

test("getTargetProgressState warns near and over sodium limit", () => {
  const nearLimit = getTargetProgressState({
    intent: "limit",
    target: 2300,
    unit: "mg",
    value: 2000
  });
  const overLimit = getTargetProgressState({
    intent: "limit",
    target: 2300,
    unit: "mg",
    value: 2400
  });

  assert.equal(nearLimit.tone, "warning");
  assert.equal(overLimit.tone, "danger");
});

test("getTargetProgressState keeps calories contextual", () => {
  const underTarget = getTargetProgressState({
    intent: "range",
    target: 2200,
    unit: "kcal",
    value: 1000
  });
  const overRange = getTargetProgressState({
    intent: "range",
    target: 2200,
    unit: "kcal",
    value: 2600
  });

  assert.equal(underTarget.tone, "steady");
  assert.equal(overRange.tone, "warning");
});

test("getMealQualityState maps dashboard labels to display states", () => {
  assert.equal(getMealQualityState(82, "high"), "strong");
  assert.equal(getMealQualityState(62, "moderate"), "solid");
  assert.equal(getMealQualityState(40, "low"), "attention");
  assert.equal(getMealQualityState(null, "unknown"), "unavailable");
});
