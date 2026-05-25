import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeReducer,
  initialAnalyzeState
} from "@/src/app/analyze/reducer";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

const meal: MealAnalysisResult = {
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
  optimizedVersion: "Add dal.",
  notes: "Notes",
  ingredientSuggestions: ["dal", "rice"],
  feedbackPrompt: "Repeat?",
  metabolicScore: 7,
  proteinScore: 7,
  fiberScore: 6,
  satietyScoreNumeric: 8,
  bloodSugarRiskScore: 4,
  quickVerdict: "Works.",
  mainConcerns: [],
  minimalChangeVersion: "Add dal.",
  supportiveVersion: "Add yogurt.",
  plateStrategy: "More dal.",
  whyThisHelps: "More filling.",
  culturalNotes: "",
  shoppingAdditions: ["yogurt"],
  prepNotes: ["batch cook"],
  mealPairings: ["kachumber"],
  cautions: [],
  evidenceNotes: ["balanced plate"],
  confidenceNotes: ["portions vary"],
  safetyDisclaimer: "general support",
  guidanceBasis: []
};

test("analyzeReducer populates editable text fields after analysis success", () => {
  const state = analyzeReducer(initialAnalyzeState, {
    type: "analysisSucceeded",
    analysis: meal
  });

  assert.equal(state.analysis?.mealName, "Dal and rice");
  assert.equal(state.ingredientText, "dal\nrice");
});

test("analyzeReducer updates array fields and clears save state", () => {
  const savedState = {
    ...analyzeReducer(initialAnalyzeState, {
      type: "analysisSucceeded",
      analysis: meal
    }),
    savedMeal: {
      success: true as const,
      notionPageId: "page",
      notionUrl: "https://notion.so/page"
    }
  };

  const state = analyzeReducer(savedState, {
    type: "arrayFieldChanged",
    field: "shoppingAdditions",
    value: "beans\n yogurt "
  });

  assert.deepEqual(state.analysis?.shoppingAdditions, ["beans", "yogurt"]);
  assert.equal(state.savedMeal, null);
});
