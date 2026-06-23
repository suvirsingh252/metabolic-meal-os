import assert from "node:assert/strict";
import test from "node:test";
import {
  getClassifiedUrlRecoveryCopy,
  getUrlRecoveryCopy
} from "@/src/app/analyze/components/status-banner";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";

test("URL parser failures produce guided recovery copy", () => {
  const copy = getUrlRecoveryCopy(
    true,
    "That link returned 403. Paste the caption, transcript, ingredient list, or recipe text instead."
  );

  assert.ok(copy);
  assert.match(copy.title, /could not read/i);
  assert.match(copy.body, /publishers block automated recipe reading/i);
  assert.match(copy.nextStep, /ingredients, recipe text, caption, transcript/i);
  assert.match(copy.nextStep, /rough summary/i);
});

test("non-url analysis errors keep the normal error path", () => {
  assert.equal(
    getUrlRecoveryCopy(false, "Unable to analyze meal right now."),
    null
  );
});

test("blocked URL failures produce classified recoverable copy", () => {
  const copy = getClassifiedUrlRecoveryCopy(
    {
      sourceUrl: "https://example.com/blocked-recipe",
      failureReason: "blocked_url"
    },
    "That link returned 403."
  );

  assert.ok(copy);
  assert.match(copy.title, /needs recipe details/i);
  assert.match(copy.body, /blocked automated reading/i);
  assert.match(copy.nextStep, /original link will stay attached/i);
});

test("URL recovery text bypasses refetch and preserves original source URL", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: [
      "https://example.com/blocked-recipe",
      "",
      "Ingredients: chickpeas, tomato, onion, spices.",
      "Instructions: simmer everything until thick. Serves 4."
    ].join("\n")
  });

  assert.equal(prepared.sourceType, "url");
  assert.equal(prepared.sourceUrl, "https://example.com/blocked-recipe");
  assert.equal(prepared.parserVersion, "url-recovery-manual-v1");
  assert.equal(prepared.canonicalRecipe?.sourceUrl, "https://example.com/blocked-recipe");
  assert.equal(prepared.canonicalRecipe?.extractionMethod, "manual");
  assert.equal(prepared.canonicalRecipe?.confidence, "estimated_description");
  assert.match(prepared.analysisText, /Recipe recovery text/i);
  assert.match(prepared.analysisText, /chickpeas/i);
  assert.ok(
    prepared.sourceNotes?.some((note) => /less precise/i.test(note)),
    "estimated recovery should surface safe confidence language"
  );
});
