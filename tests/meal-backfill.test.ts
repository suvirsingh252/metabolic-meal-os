import assert from "node:assert/strict";
import test from "node:test";
import { backfillMealMetadata } from "@/src/lib/notion/meal-backfill";

test("legacy Notes scorecard backfills quality metadata without nutrients", () => {
  const result = backfillMealMetadata({
    notes: [
      "Scorecard:",
      "- Metabolic: 7/10",
      "- Protein: 6/10",
      "- Fiber: 8/10",
      "- Satiety: 7/10",
      "- Blood Sugar Risk: 3/10"
    ].join("\n"),
    nutrition: {},
    nutritionConfidence: null,
    nutritionSource: null,
    nutritionProvenance: null,
    qualityScore: null,
    metabolicScore: null,
    proteinScore: null,
    fiberScore: null,
    energyDensityScore: null,
    processingScore: null,
    satietyScoreNumeric: null,
    bloodSugarRiskScore: null
  });

  assert.equal(result.metabolicScore, 7);
  assert.equal(result.proteinScore, 6);
  assert.equal(result.fiberScore, 8);
  assert.equal(result.qualityScore, 72);
  assert.equal(result.nutritionConfidence, null);
  assert.equal(result.nutritionSource, null);
  assert.match(result.nutritionProvenance ?? "", /notion-backfill/);
});

test("partial saved nutrition backfills source confidence but not missing totals", () => {
  const result = backfillMealMetadata({
    notes: null,
    nutrition: { calories: 500, protein: 20, fiber: null },
    nutritionConfidence: null,
    nutritionSource: null,
    nutritionProvenance: null,
    qualityScore: null,
    metabolicScore: null,
    proteinScore: null,
    fiberScore: null,
    energyDensityScore: null,
    processingScore: null,
    satietyScoreNumeric: null,
    bloodSugarRiskScore: null
  });

  assert.equal(result.nutritionConfidence, "low");
  assert.equal(result.nutritionSource, "notion-backfill");
  assert.match(result.nutritionProvenance ?? "", /partial saved nutrition/);
  assert.equal(result.energyDensityScore, 6);
});

test("explicit values are not overwritten by backfill", () => {
  const result = backfillMealMetadata({
    notes: "- Protein: 2/10\n- Fiber: 2/10",
    nutrition: { calories: 800, protein: 5, fiber: 1 },
    nutritionConfidence: "high",
    nutritionSource: "user-entered",
    nutritionProvenance: "manual review",
    qualityScore: 91,
    metabolicScore: null,
    proteinScore: 9,
    fiberScore: null,
    energyDensityScore: 10,
    processingScore: null,
    satietyScoreNumeric: null,
    bloodSugarRiskScore: null
  });

  assert.equal(result.nutritionConfidence, "high");
  assert.equal(result.nutritionSource, "user-entered");
  assert.equal(result.nutritionProvenance, "manual review");
  assert.equal(result.qualityScore, 91);
  assert.equal(result.proteinScore, 9);
  assert.equal(result.energyDensityScore, 10);
});
