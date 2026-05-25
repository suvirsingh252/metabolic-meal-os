import assert from "node:assert/strict";
import test from "node:test";
import { mealAnalysisModelConfig } from "@/src/lib/ai/meal-analysis/v1/config";
import { mealAnalysisErrorResponse } from "@/src/lib/ai/meal-analysis/v1/fallback";
import { parseMealAnalysisResponse } from "@/src/lib/ai/meal-analysis/v1/response-parser";
import { mealAnalysisJsonSchema } from "@/src/lib/ai/meal-analysis/v1/schema";
import { RecipeParserError } from "@/src/lib/integrations/recipe-parser";

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

test("AI v1 schema and config are versioned", () => {
  assert.equal(mealAnalysisModelConfig.analysisVersion, "meal-analysis-v1");
  assert.equal(mealAnalysisJsonSchema.required.includes("guidanceBasis"), true);
});

test("parseMealAnalysisResponse validates model JSON", () => {
  const parsed = parseMealAnalysisResponse(JSON.stringify(validMeal));

  assert.equal(parsed.mealName, "Dal and rice");
});

test("parseMealAnalysisResponse rejects malformed model JSON", () => {
  assert.throws(() =>
    parseMealAnalysisResponse(JSON.stringify({ ...validMeal, metabolicScore: 0 }))
  );
});

test("mealAnalysisErrorResponse keeps parser failures as safe 400s", () => {
  const response = mealAnalysisErrorResponse(new RecipeParserError("Blocked"));

  assert.equal(response.status, 400);
});
