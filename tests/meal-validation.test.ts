import assert from "node:assert/strict";
import test from "node:test";
import { validateMealAnalysisResult } from "@/src/lib/domain/meal/validation";

const validMeal = {
  mealName: "Dal and rice",
  cuisine: "Indian",
  mealType: "Dinner",
  proteinLevel: "Moderate",
  satietyLevel: "High",
  bloodSugarImpact: "Moderate",
  effortLevel: "Easy",
  familyApproved: true,
  weeknightFriendly: true,
  comfortMeal: true,
  optimizedVersion: "Add extra dal and cucumber.",
  notes: "Balanced household meal.",
  ingredientSuggestions: ["dal", "rice"],
  feedbackPrompt: "Did this feel filling?",
  metabolicScore: 7,
  proteinScore: 7,
  fiberScore: 6,
  satietyScoreNumeric: 8,
  bloodSugarRiskScore: 4,
  quickVerdict: "Good base with one small nudge.",
  mainConcerns: [],
  minimalChangeVersion: "Keep the dish and add more dal.",
  supportiveVersion: "Add cucumber and yogurt on the side.",
  plateStrategy: "Use a smaller rice mound and more dal.",
  whyThisHelps: "More protein and fiber can make it more filling.",
  culturalNotes: "",
  shoppingAdditions: ["cucumber", "yogurt"],
  prepNotes: ["Batch cook dal"],
  mealPairings: ["kachumber"],
  cautions: [],
  evidenceNotes: ["Balanced plates can support steadier energy."],
  confidenceNotes: ["Portions vary."],
  safetyDisclaimer: "General food-pattern support only.",
  guidanceBasis: [
    {
      sourceId: "canadas-food-guide",
      principleId: "balanced-plate",
      relevance: "Vegetable and protein pairing applies."
    }
  ]
};

test("validateMealAnalysisResult rejects missing v2/v3 fields", () => {
  const result = validateMealAnalysisResult({
    ...validMeal,
    metabolicScore: undefined,
    evidenceNotes: undefined
  });

  assert.equal(result.success, false);
  assert.ok(result.errors.includes("metabolicScore must be a number from 1 to 10."));
  assert.ok(result.errors.includes("evidenceNotes must be an array of strings."));
});

test("validateMealAnalysisResult accepts complete meal payload", () => {
  const result = validateMealAnalysisResult(validMeal);

  assert.equal(result.success, true);
  assert.equal(result.data?.mealName, "Dal and rice");
});

test("validateMealAnalysisResult derives missing ingredient structure from raw text", () => {
  const result = validateMealAnalysisResult({
    ...validMeal,
    ingredients: [
      "4-5 no. Cashew Nuts",
      {
        rawText: "¾ cup fresh Coconut",
        name: null,
        quantity: null,
        unit: null
      },
      "Salt to taste"
    ]
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data?.ingredients, [
    {
      rawText: "4-5 no. Cashew Nuts",
      name: "Cashew Nuts",
      quantity: "4-5",
      unit: "no."
    },
    {
      rawText: "¾ cup fresh Coconut",
      name: "fresh Coconut",
      quantity: "¾",
      unit: "cup"
    },
    {
      rawText: "Salt to taste",
      name: "Salt",
      quantity: "to taste",
      unit: null
    }
  ]);
});

test("validateMealAnalysisResult normalizes unsafe source URLs to null", () => {
  const result = validateMealAnalysisResult({
    ...validMeal,
    sourceUrl: "javascript:alert(1)"
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.sourceUrl, null);
});

test("validateMealAnalysisResult preserves http and https source URLs", () => {
  const httpsResult = validateMealAnalysisResult({
    ...validMeal,
    sourceUrl: "https://example.com/recipe"
  });
  const httpResult = validateMealAnalysisResult({
    ...validMeal,
    sourceUrl: "http://example.com/recipe"
  });

  assert.equal(httpsResult.success, true);
  assert.equal(httpsResult.data?.sourceUrl, "https://example.com/recipe");
  assert.equal(httpResult.success, true);
  assert.equal(httpResult.data?.sourceUrl, "http://example.com/recipe");
});

test("validateMealAnalysisResult accepts estimated nutrition without zero-filling blanks", () => {
  const result = validateMealAnalysisResult({
    ...validMeal,
    nutritionEstimate: {
      totals: {
        calories: 330,
        protein: 8,
        carbs: null,
        fat: null,
        fiber: 6,
        sodium: null,
        sugar: null
      },
      confidence: "medium",
      provenance:
        "Estimated from free-text meal description using conservative component assumptions: 1 paratha/parantha + small butter serving.",
      source: "estimated"
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.nutritionEstimate?.source, "estimated");
  assert.equal(result.data?.nutritionEstimate?.totals.carbs, null);
  assert.equal(result.data?.nutritionEstimate?.totals.fat, null);
  assert.equal(result.data?.nutritionEstimate?.totals.sodium, null);
  assert.equal(result.data?.nutritionEstimate?.totals.sugar, null);
});
