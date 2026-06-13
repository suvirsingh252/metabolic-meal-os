import assert from "node:assert/strict";
import test from "node:test";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";
import {
  applyEstimatedButterAdjustment,
  applyEstimatedServingMultiplier,
  applyNutritionReviewEdit,
  getNutritionTotalsDisplayState,
  hasAnyNutritionValue
} from "@/src/app/analyze/components/analysis-result-panel";
import { basicRecipeParserAdapter } from "@/src/lib/integrations/recipe-parser";
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
  assert.deepEqual(prepared.nutritionEstimate?.assumptions?.matchedComponents, [
    "1 paratha/parantha",
    "gobi/cauliflower filling",
    "small butter serving"
  ]);

  const displayState = getNutritionTotalsDisplayState(
    prepared.nutritionEstimate
  );

  assert.equal(displayState.mode, "estimated");
  assert.equal(displayState.sourceLabel, "Estimated");
  assert.equal(hasAnyNutritionValue(displayState.estimate.totals), true);
});

test("free-text estimator handles high-protein simple meals conservatively", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "large chicken breast with salad"
  });

  assert.equal(prepared.nutritionEstimate?.source, "estimated");
  assert.equal(prepared.nutritionEstimate?.totals.calories, 307.5);
  assert.equal(prepared.nutritionEstimate?.totals.protein, 49.5);
  assert.equal(prepared.nutritionEstimate?.totals.fiber, 4.5);
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

test("parsed recipe ingredients get estimated nutrition when structured nutrition is missing", async () => {
  const originalParseFromUrl = basicRecipeParserAdapter.parseFromUrl;

  basicRecipeParserAdapter.parseFromUrl = async (url) => ({
    name: "Chana rice bowl",
    source: {
      sourceType: "url",
      sourceUrl: url,
      sourceName: "Example",
      sourceClassification: "recipe-page",
      parserVersion: "test-parser"
    },
    ingredients: [
      { rawText: "1 can chickpeas, drained" },
      { rawText: "1 cup cooked rice" }
    ],
    instructions: ["Simmer and serve."],
    nutrition: null
  });

  try {
    const prepared = await prepareRecipeForMealAnalysis({
      recipeText: "https://example.com/recipes/chana-rice"
    });

    assert.equal(prepared.nutritionEstimate?.source, "estimated");
    assert.equal(prepared.nutritionEstimate?.totals.calories, 385);
    assert.equal(prepared.nutritionEstimate?.totals.protein, 14);
    assert.equal(prepared.nutritionEstimate?.totals.fiber, 9);
    assert.match(prepared.nutritionEstimate?.provenance ?? "", /recipe ingredients/i);
  } finally {
    basicRecipeParserAdapter.parseFromUrl = originalParseFromUrl;
  }
});

test("parsed recipe structured nutrition still wins over ingredient estimates", async () => {
  const originalParseFromUrl = basicRecipeParserAdapter.parseFromUrl;

  basicRecipeParserAdapter.parseFromUrl = async (url) => ({
    name: "Chana rice bowl",
    source: {
      sourceType: "url",
      sourceUrl: url,
      sourceName: "Example",
      sourceClassification: "recipe-page",
      parserVersion: "test-parser"
    },
    ingredients: [
      { rawText: "1 can chickpeas, drained" },
      { rawText: "1 cup cooked rice" }
    ],
    nutrition: {
      calories: 520,
      protein: 18,
      carbs: 72,
      fat: 14,
      fiber: 12,
      sodium: 680,
      sugar: 6,
      confidence: "medium",
      provenance: "Recipe page structured nutrition facts"
    }
  });

  try {
    const prepared = await prepareRecipeForMealAnalysis({
      recipeText: "https://example.com/recipes/chana-rice"
    });

    assert.equal(prepared.nutritionEstimate?.source, "recipe-json-ld");
    assert.equal(prepared.nutritionEstimate?.totals.calories, 520);
    assert.equal(prepared.nutritionEstimate?.totals.carbs, 72);
    assert.match(
      prepared.nutritionEstimate?.provenance ?? "",
      /structured nutrition facts/i
    );
  } finally {
    basicRecipeParserAdapter.parseFromUrl = originalParseFromUrl;
  }
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

  const displayState = getNutritionTotalsDisplayState(edited);
  assert.equal(displayState.mode, "manual");
  assert.equal(displayState.sourceLabel, "User-edited estimate");
});

test("serving multiplier utility preserves null fields", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha with butter"
  });
  const estimate = prepared.nutritionEstimate;

  assert.ok(estimate);

  const edited = applyEstimatedServingMultiplier(estimate, 1.5);

  assert.equal(edited.source, "user-entered");
  assert.equal(edited.totals.calories, 495);
  assert.equal(edited.totals.protein, 12);
  assert.equal(edited.totals.fiber, 9);
  assert.equal(edited.totals.carbs, null);
  assert.equal(edited.totals.fat, null);
  assert.equal(edited.assumptions?.servingMultiplier, 1.5);
  assert.match(edited.provenance, /reviewed during meal review/i);

  const displayState = getNutritionTotalsDisplayState(edited);
  assert.equal(displayState.mode, "estimated");
  assert.equal(displayState.sourceLabel, "Reviewed estimate");
});

test("repeated serving multiplier changes replace stale provenance notes", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha with butter"
  });
  const estimate = prepared.nutritionEstimate;

  assert.ok(estimate);

  const firstEdit = applyEstimatedServingMultiplier(estimate, 1.5);
  const secondEdit = applyEstimatedServingMultiplier(firstEdit, 2);

  assert.equal(secondEdit.totals.calories, 660);
  assert.equal(secondEdit.assumptions?.servingMultiplier, 2);
  assert.doesNotMatch(secondEdit.provenance, /1.5x/);
  assert.match(secondEdit.provenance, /serving multiplier set to 2x/);
});

test("reviewed butter adjustment updates provenance and estimate base", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha without butter"
  });
  const estimate = prepared.nutritionEstimate;

  assert.ok(estimate);

  const edited = applyEstimatedButterAdjustment(estimate, true);

  assert.equal(edited.source, "user-entered");
  assert.equal(edited.totals.calories, 330);
  assert.equal(edited.totals.protein, 8);
  assert.equal(edited.totals.fiber, 6);
  assert.equal(edited.totals.carbs, null);
  assert.equal(edited.assumptions?.butterInferred, true);
  assert.match(edited.provenance, /butter added/i);
});

test("reviewed butter removal after serving adjustment keeps provenance concise", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "gobi parantha with butter"
  });
  const estimate = prepared.nutritionEstimate;

  assert.ok(estimate);

  const larger = applyEstimatedServingMultiplier(estimate, 1.5);
  const withoutButter = applyEstimatedButterAdjustment(larger, false);

  assert.equal(withoutButter.totals.calories, 427.5);
  assert.equal(withoutButter.assumptions?.butterInferred, false);
  assert.equal(
    withoutButter.assumptions?.matchedComponents.some((component) =>
      /butter/i.test(component)
    ),
    false
  );
  assert.match(withoutButter.provenance, /serving multiplier set to 1.5x/);
  assert.match(withoutButter.provenance, /butter removed/);
  assert.doesNotMatch(withoutButter.provenance, /butter added/);
});

test("clearing estimated values preserves null-safe user-entered nutrition", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "rice and chicken"
  });
  const estimate = prepared.nutritionEstimate;

  assert.ok(estimate);

  const edited = applyNutritionReviewEdit(
    estimate,
    estimate.provenance,
    "calories",
    null
  );

  assert.equal(edited.source, "user-entered");
  assert.equal(edited.totals.calories, null);
  assert.equal(edited.totals.protein, 35);
  assert.equal(hasAnyNutritionValue(edited.totals), true);
});
