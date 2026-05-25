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

test("free-text nutrition estimator parses gobi parantha with butter", () => {
  const estimate = estimateFreeTextNutrition("gobi parantha with butter");

  assert.equal(estimate?.source, "estimated");
  assert.equal(estimate?.totals.calories, 330);
  assert.equal(estimate?.totals.protein, 8);
  assert.equal(estimate?.totals.fiber, 6);
  assert.equal(estimate?.totals.carbs, null);
  assert.deepEqual(estimate?.assumptions?.matchedComponents, [
    "1 paratha/parantha",
    "gobi/cauliflower filling",
    "small butter serving"
  ]);
  assert.equal(estimate?.assumptions?.butterInferred, true);
  assert.match(estimate?.provenance ?? "", /Review before saving/i);
});

test("free-text nutrition estimator applies quantity to 2 gobi paranthas with butter", () => {
  const estimate = estimateFreeTextNutrition("2 gobi paranthas with butter");

  assert.equal(estimate?.totals.calories, 615);
  assert.equal(estimate?.totals.protein, 16);
  assert.equal(estimate?.totals.fiber, 12);
  assert.match(estimate?.provenance ?? "", /2x for 1 paratha\/parantha/i);
  assert.match(estimate?.provenance ?? "", /2x for gobi\/cauliflower filling/i);
});

test("free-text nutrition estimator respects without butter", () => {
  const estimate = estimateFreeTextNutrition("gobi parantha without butter");

  assert.equal(estimate?.totals.calories, 285);
  assert.equal(estimate?.totals.protein, 8);
  assert.equal(estimate?.totals.fiber, 6);
  assert.equal(estimate?.assumptions?.butterInferred, false);
  assert.equal(
    estimate?.assumptions?.matchedComponents.some((component) =>
      /butter/i.test(component)
    ),
    false
  );
});

test("free-text nutrition estimator applies large serving signal", () => {
  const estimate = estimateFreeTextNutrition("large chicken breast with salad");

  assert.equal(estimate?.totals.calories, 307.5);
  assert.equal(estimate?.totals.protein, 49.5);
  assert.equal(estimate?.totals.fiber, 4.5);
  assert.match(estimate?.provenance ?? "", /large portion parsed as 1.5x/i);
});

test("free-text nutrition estimator handles half bowl dal with rice", () => {
  const estimate = estimateFreeTextNutrition("half bowl dal with rice");

  assert.equal(estimate?.totals.calories, 295);
  assert.equal(estimate?.totals.protein, 10);
  assert.equal(estimate?.totals.fiber, 5);
  assert.match(estimate?.provenance ?? "", /0.5x for dal\/lentils serving/i);
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
