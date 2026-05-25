import assert from "node:assert/strict";
import test from "node:test";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";
import {
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

test("free-text meal analysis preparation leaves nutrition unavailable", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha with butter"
  });

  assert.equal(prepared.sourceClassification, "manual-text");
  assert.equal(prepared.nutritionEstimate, null);
  assert.equal(
    hasAnyNutritionValue(getNutritionTotalsDisplayState(null).estimate.totals),
    false
  );
});
