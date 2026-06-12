import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSocialRecipeNormalizationResponse,
  validateSocialRecipeCandidate
} from "@/src/lib/ai/social-recipe-normalization/v1/response-parser";

test("parseSocialRecipeNormalizationResponse accepts a structured candidate", () => {
  const candidate = parseSocialRecipeNormalizationResponse(
    JSON.stringify({
      title: "Crispy tofu bowl",
      ingredients: ["tofu, amount unclear", "rice", "cucumber"],
      steps: ["Crisp tofu.", "Serve over rice with cucumber."],
      servings: null,
      confidence: "medium",
      assumptions: ["The caption does not specify tofu quantity."],
      missingDetails: ["Serving size is not stated."]
    })
  );

  assert.equal(candidate.title, "Crispy tofu bowl");
  assert.equal(candidate.confidence, "medium");
  assert.deepEqual(candidate.missingDetails, ["Serving size is not stated."]);
});

test("validateSocialRecipeCandidate defaults invalid confidence to low", () => {
  const candidate = validateSocialRecipeCandidate({
    title: "Pasta",
    ingredients: ["pasta", "tomato sauce"],
    steps: [],
    servings: "",
    confidence: "certain",
    assumptions: [],
    missingDetails: []
  });

  assert.equal(candidate.confidence, "low");
  assert.equal(candidate.servings, null);
});

test("validateSocialRecipeCandidate rejects responses without recipe content", () => {
  assert.throws(() =>
    validateSocialRecipeCandidate({
      title: "Vibes only",
      ingredients: [],
      steps: [],
      servings: null,
      confidence: "low",
      assumptions: [],
      missingDetails: ["No ingredients or method were provided."]
    })
  );
});

