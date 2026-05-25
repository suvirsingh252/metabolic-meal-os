import assert from "node:assert/strict";
import test from "node:test";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";
import {
  applyNutritionReviewEdit,
  getNutritionTotalsDisplayState,
  hasAnyNutritionValue
} from "@/src/app/analyze/components/analysis-result-panel";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

test("nutrition display uses unavailable state when no nutrition source exists", () => {
  const state = getNutritionTotalsDisplayState(null);

  assert.equal(state.mode, "unavailable");
  assert.equal(state.hasSourceNutrition, false);
  assert.equal(state.hasAnyNutritionValue, false);
  assert.equal(state.sourceLabel, "none detected");
});

test("nutrition display distinguishes structured and manual estimates", () => {
  const structured: NonNullable<MealAnalysisResult["nutritionEstimate"]> = {
    totals: {
      calories: 650,
      protein: 30,
      carbs: 70,
      fat: 22,
      fiber: 10,
      sodium: 900,
      sugar: 8
    },
    confidence: "medium",
    provenance: "Recipe page structured nutrition facts",
    source: "recipe-json-ld"
  };
  const manual: NonNullable<MealAnalysisResult["nutritionEstimate"]> = {
    ...structured,
    source: "user-entered",
    provenance: "Entered during meal review"
  };

  assert.equal(getNutritionTotalsDisplayState(structured).mode, "structured");
  assert.equal(getNutritionTotalsDisplayState(structured).sourceLabel, "Recipe page");
  assert.equal(getNutritionTotalsDisplayState(manual).mode, "manual");
  assert.equal(getNutritionTotalsDisplayState(manual).sourceLabel, "Manual");
});

test("free-text meal analysis preparation estimates dashboard-critical nutrition", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha with butter"
  });

  assert.equal(prepared.sourceClassification, "manual-text");
  assert.equal(prepared.nutritionEstimate?.source, "estimated");
  assert.equal(prepared.nutritionEstimate?.totals.calories, 330);
  assert.equal(prepared.nutritionEstimate?.totals.protein, 8);
  assert.equal(prepared.nutritionEstimate?.totals.fiber, 6);
  assert.equal(prepared.nutritionEstimate?.totals.carbs, null);
  assert.equal(prepared.nutritionEstimate?.totals.fat, null);
  assert.equal(prepared.nutritionEstimate?.totals.sodium, null);
  assert.equal(prepared.nutritionEstimate?.totals.sugar, null);
  assert.match(prepared.nutritionEstimate?.provenance ?? "", /free-text/i);
  assert.match(prepared.nutritionEstimate?.provenance ?? "", /paratha/i);

  const displayState = getNutritionTotalsDisplayState(
    prepared.nutritionEstimate
  );

  assert.equal(displayState.mode, "estimated");
  assert.equal(displayState.sourceLabel, "Estimated");
  assert.equal(hasAnyNutritionValue(displayState.estimate.totals), true);
});

test("free-text estimator handles high-protein simple meals conservatively", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "grilled chicken breast with salad"
  });

  assert.equal(prepared.nutritionEstimate?.source, "estimated");
  assert.equal(prepared.nutritionEstimate?.totals.calories, 205);
  assert.equal(prepared.nutritionEstimate?.totals.protein, 33);
  assert.equal(prepared.nutritionEstimate?.totals.fiber, 3);
  assert.equal(prepared.nutritionEstimate?.totals.fat, null);
});

test("vague free-text meal analysis keeps nutrition unavailable", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "something healthy"
  });

  assert.equal(prepared.sourceClassification, "manual-text");
  assert.equal(prepared.nutritionEstimate, null);
  assert.equal(
    hasAnyNutritionValue(getNutritionTotalsDisplayState(null).estimate.totals),
    false
  );
});

test("manual edits convert estimated nutrition to user-entered provenance", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha with butter"
  });
  const estimate = prepared.nutritionEstimate;

  assert.ok(estimate);

  const edited = applyNutritionReviewEdit(
    estimate,
    estimate.provenance,
    "protein",
    10
  );

  assert.equal(edited.source, "user-entered");
  assert.equal(edited.totals.protein, 10);
  assert.equal(edited.totals.carbs, null);
  assert.match(edited.provenance, /free-text/i);
  assert.match(edited.provenance, /edited during meal review/i);
});
