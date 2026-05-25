import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIngredientKey } from "@/src/lib/ingredients";
import { matchKnownIngredient } from "@/src/lib/notion/ingredient-context";

test("normalizeIngredientKey singularizes common ingredient plurals", () => {
  assert.equal(normalizeIngredientKey("  Chickpeas  "), "chickpea");
  assert.equal(normalizeIngredientKey("- tomatoes"), "tomato");
});

test("matchKnownIngredient does not match substrings inside unrelated words", () => {
  assert.equal(matchKnownIngredient("rice", "compare the price before buying"), null);
});

test("matchKnownIngredient matches normalized ingredient tokens", () => {
  assert.deepEqual(matchKnownIngredient("brown rice", "serve with brown rice"), {
    matchConfidence: "high",
    matchReason: "all normalized ingredient tokens appear in recipe text"
  });
});
