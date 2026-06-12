import assert from "node:assert/strict";
import test from "node:test";
import { mealOptimizationModelConfig } from "@/src/lib/ai/meal-optimization/v1/config";
import { formatOptimizationUserPrompt } from "@/src/lib/ai/meal-optimization/v1/prompt";
import { parseOptimizationResponse } from "@/src/lib/ai/meal-optimization/v1/response-parser";
import { mealOptimizationJsonSchema } from "@/src/lib/ai/meal-optimization/v1/schema";
import {
  optimizationTypes,
  type OptimizationType
} from "@/src/lib/ai/meal-optimization/v1/types";
import { analyzeReducer, initialAnalyzeState } from "@/src/app/analyze/reducer";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

const validOptimization = {
  optimizationType: "higher-protein",
  headline: "Two easy protein additions for this dal.",
  changes: [
    "Stir in half a cup of cooked lentils or canned chickpeas.",
    "Serve with a small bowl of Greek yogurt on the side.",
    "Top with a spoon of roasted peanuts for crunch and protein."
  ],
  whyItHelps: "Each change adds protein without touching the dish identity.",
  note: "Keeps the flavours you already have — no new spices needed."
};

const baseMeal: MealAnalysisResult = {
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
  optimizedVersion: "Add extra dal.",
  notes: "Notes",
  ingredientSuggestions: ["dal", "rice"],
  feedbackPrompt: "Repeat?",
  metabolicScore: 7,
  proteinScore: 5,
  fiberScore: 6,
  satietyScoreNumeric: 8,
  bloodSugarRiskScore: 4,
  quickVerdict: "Good base — protein could be nudged up.",
  mainConcerns: ["Low protein density"],
  minimalChangeVersion: "Add a small side of yogurt.",
  supportiveVersion: "Add lentils and yogurt.",
  plateStrategy: "More dal, less rice.",
  whyThisHelps: "More filling.",
  culturalNotes: "Keep the basmati — it belongs here.",
  shoppingAdditions: ["yogurt"],
  prepNotes: ["batch cook dal"],
  mealPairings: ["kachumber"],
  cautions: [],
  evidenceNotes: ["balanced plate"],
  confidenceNotes: ["portions vary"],
  safetyDisclaimer: "general support",
  guidanceBasis: []
};

// Config

test("meal optimization config is versioned", () => {
  assert.equal(mealOptimizationModelConfig.optimizationVersion, "meal-optimization-v1");
  assert.equal(mealOptimizationModelConfig.model, "gpt-4.1-mini");
  assert.equal(mealOptimizationModelConfig.schemaName, "meal_optimization");
});

// Schema

test("optimization schema requires all expected fields", () => {
  const required = mealOptimizationJsonSchema.required;

  assert.ok(required.includes("optimizationType"));
  assert.ok(required.includes("headline"));
  assert.ok(required.includes("changes"));
  assert.ok(required.includes("whyItHelps"));
  assert.ok(required.includes("note"));
});

test("optimization types array is complete", () => {
  assert.deepEqual(optimizationTypes, [
    "higher-protein",
    "healthier",
    "kid-friendly",
    "budget-friendly"
  ]);
});

// Response parser

test("parseOptimizationResponse accepts a valid result", () => {
  const result = parseOptimizationResponse(JSON.stringify(validOptimization));

  assert.equal(result.optimizationType, "higher-protein");
  assert.equal(result.headline, "Two easy protein additions for this dal.");
  assert.equal(result.changes.length, 3);
  assert.ok(result.whyItHelps.length > 0);
  assert.ok(typeof result.note === "string");
});

test("parseOptimizationResponse accepts an empty note string", () => {
  const input = { ...validOptimization, note: "" };
  const result = parseOptimizationResponse(JSON.stringify(input));

  assert.equal(result.note, "");
});

test("parseOptimizationResponse rejects malformed JSON", () => {
  assert.throws(
    () => parseOptimizationResponse("not json"),
    (err) => err instanceof SyntaxError
  );
});

test("parseOptimizationResponse rejects missing headline", () => {
  const input = { ...validOptimization, headline: "" };

  assert.throws(
    () => parseOptimizationResponse(JSON.stringify(input)),
    /headline/
  );
});

test("parseOptimizationResponse rejects empty changes array", () => {
  const input = { ...validOptimization, changes: [] };

  assert.throws(
    () => parseOptimizationResponse(JSON.stringify(input)),
    /changes/
  );
});

test("parseOptimizationResponse rejects invalid optimizationType", () => {
  const input = { ...validOptimization, optimizationType: "make-spicier" };

  assert.throws(
    () => parseOptimizationResponse(JSON.stringify(input)),
    /optimizationType/
  );
});

test("parseOptimizationResponse rejects non-object input", () => {
  assert.throws(
    () => parseOptimizationResponse(JSON.stringify(["array"])),
    /not an object/
  );
});

// Prompt

test("formatOptimizationUserPrompt includes meal name and optimization goal", () => {
  const prompt = formatOptimizationUserPrompt(baseMeal, "higher-protein");

  assert.ok(prompt.includes("Dal and rice"));
  assert.ok(prompt.includes("higher-protein") || prompt.includes("higher protein"));
  assert.ok(prompt.includes("Indian"));
  assert.ok(prompt.includes("5/10"));
});

test("formatOptimizationUserPrompt includes cultural notes when present", () => {
  const prompt = formatOptimizationUserPrompt(baseMeal, "healthier");

  assert.ok(prompt.includes("Keep the basmati"));
});

test("formatOptimizationUserPrompt includes existing suggestion to avoid repetition", () => {
  const prompt = formatOptimizationUserPrompt(baseMeal, "budget-friendly");

  assert.ok(prompt.includes("Add a small side of yogurt"));
});

// Reducer

test("analyzeReducer sets optimization to loading state on optimizationStarted", () => {
  const state = analyzeReducer(initialAnalyzeState, {
    type: "optimizationStarted",
    optimizationType: "higher-protein"
  });

  assert.deepEqual(state.optimizations["higher-protein"], { status: "loading" });
});

test("analyzeReducer stores result on optimizationSucceeded", () => {
  const startedState = analyzeReducer(initialAnalyzeState, {
    type: "optimizationStarted",
    optimizationType: "healthier"
  });

  const succeededState = analyzeReducer(startedState, {
    type: "optimizationSucceeded",
    optimizationType: "healthier",
    result: {
      optimizationType: "healthier",
      headline: "One small nudge for a healthier meal.",
      changes: ["Add a vegetable side."],
      whyItHelps: "More fiber.",
      note: ""
    }
  });

  const opt = succeededState.optimizations["healthier"];

  assert.ok(opt?.status === "success");
  if (opt?.status === "success") {
    assert.equal(opt.result.headline, "One small nudge for a healthier meal.");
  }
});

test("analyzeReducer sets error state on optimizationFailed", () => {
  const state = analyzeReducer(initialAnalyzeState, {
    type: "optimizationFailed",
    optimizationType: "kid-friendly"
  });

  assert.deepEqual(state.optimizations["kid-friendly"], { status: "error" });
});

test("analyzeReducer clears optimizations when a new analysis starts", () => {
  const withOptimization = analyzeReducer(initialAnalyzeState, {
    type: "optimizationSucceeded",
    optimizationType: "healthier",
    result: {
      optimizationType: "healthier",
      headline: "One small nudge.",
      changes: ["Add a vegetable side."],
      whyItHelps: "More fiber.",
      note: ""
    }
  });

  assert.ok(withOptimization.optimizations["healthier"] !== undefined);

  const afterNewAnalysis = analyzeReducer(withOptimization, {
    type: "analysisStarted"
  });

  assert.deepEqual(afterNewAnalysis.optimizations, {});
});

test("analyzeReducer preserves other optimizations when one succeeds", () => {
  const withLoading = analyzeReducer(initialAnalyzeState, {
    type: "optimizationStarted",
    optimizationType: "higher-protein"
  });

  const withBoth = analyzeReducer(withLoading, {
    type: "optimizationStarted",
    optimizationType: "budget-friendly"
  });

  assert.deepEqual(withBoth.optimizations["higher-protein"], { status: "loading" });
  assert.deepEqual(withBoth.optimizations["budget-friendly"], { status: "loading" });

  const afterOneSucceeds = analyzeReducer(withBoth, {
    type: "optimizationSucceeded",
    optimizationType: "higher-protein",
    result: {
      optimizationType: "higher-protein",
      headline: "Done.",
      changes: ["Add yogurt."],
      whyItHelps: "More protein.",
      note: ""
    }
  });

  assert.equal(afterOneSucceeds.optimizations["higher-protein"]?.status, "success");
  assert.equal(afterOneSucceeds.optimizations["budget-friendly"]?.status, "loading");
});

test("optimizationTypes covers all four expected types", () => {
  const expected: OptimizationType[] = [
    "higher-protein",
    "healthier",
    "kid-friendly",
    "budget-friendly"
  ];

  for (const type of expected) {
    assert.ok(optimizationTypes.includes(type), `Missing type: ${type}`);
  }

  assert.equal(optimizationTypes.length, expected.length);
});
