import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeIngredientKey,
  parseRecipeIngredientText
} from "@/src/lib/ingredients";
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

test("parseRecipeIngredientText preserves ranges, unicode fractions, and English names", () => {
  assert.deepEqual(parseRecipeIngredientText("6-7 no. Cloves, लौंग"), {
    rawText: "6-7 no. Cloves, लौंग",
    name: "Cloves",
    quantity: "6-7",
    unit: "no."
  });
  assert.deepEqual(
    parseRecipeIngredientText("½ cup Shallots (peeled & roughly chopped) सांबर अनियन"),
    {
      rawText: "½ cup Shallots (peeled & roughly chopped) सांबर अनियन",
      name: "Shallots (peeled & roughly chopped)",
      quantity: "½",
      unit: "cup"
    }
  );
  assert.deepEqual(parseRecipeIngredientText("Salt to taste, नमक स्वादअनुसार"), {
    rawText: "Salt to taste, नमक स्वादअनुसार",
    name: "Salt",
    quantity: "to taste",
    unit: null
  });
  assert.deepEqual(parseRecipeIngredientText("1 ½ tsp Sugar, चीनी"), {
    rawText: "1 ½ tsp Sugar, चीनी",
    name: "Sugar",
    quantity: "1 ½",
    unit: "tsp"
  });
  assert.deepEqual(parseRecipeIngredientText("1tbsp garlic paste"), {
    rawText: "1tbsp garlic paste",
    name: "garlic paste",
    quantity: "1",
    unit: "tbsp"
  });
  assert.deepEqual(parseRecipeIngredientText(".5 tsp jeera powder"), {
    rawText: ".5 tsp jeera powder",
    name: "jeera powder",
    quantity: ".5",
    unit: "tsp"
  });
});
