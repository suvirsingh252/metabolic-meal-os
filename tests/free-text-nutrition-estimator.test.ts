import assert from "node:assert/strict";
import test from "node:test";
import { estimateFreeTextNutrition } from "@/src/lib/domain/nutrition";
import { parseRecipeJsonLd } from "@/src/lib/integrations/recipe-parser";

test("free-text nutrition estimator returns null for vague input", () => {
  assert.equal(estimateFreeTextNutrition("something healthy"), null);
});

test("free-text nutrition estimator does not treat butter alone as enough detail", () => {
  assert.equal(estimateFreeTextNutrition("butter"), null);
});

test("recipe JSON-LD structured nutrition remains available ahead of estimates", () => {
  const parsed = parseRecipeJsonLd(
    `<html><head><script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Gobi parantha with butter",
        "recipeIngredient": ["gobi parantha", "butter"],
        "recipeInstructions": ["Cook and serve"],
        "nutrition": {
          "@type": "NutritionInformation",
          "calories": "520 calories",
          "proteinContent": "16 g",
          "fiberContent": "9 g",
          "fatContent": "21 g",
          "sodiumContent": "700 mg"
        }
      }
    </script></head><body></body></html>`,
    new URL("https://example.com/recipes/gobi-parantha"),
    "recipe-page"
  );
  const freeTextEstimate = estimateFreeTextNutrition("gobi parantha with butter");

  assert.equal(parsed?.nutrition?.calories, 520);
  assert.equal(parsed?.nutrition?.protein, 16);
  assert.equal(parsed?.nutrition?.fiber, 9);
  assert.equal(parsed?.nutrition?.fat, 21);
  assert.equal(parsed?.nutrition?.sodium, 700);
  assert.notEqual(parsed?.nutrition?.calories, freeTextEstimate?.totals.calories);
});
