import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateFreeTextNutrition,
  estimateNutritionFromIngredients
} from "@/src/lib/domain/nutrition";
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

test("free-text nutrition estimator handles common household shorthand fixtures", () => {
  const fixtures: {
    text: string;
    calories: number;
    protein: number;
    fiber: number;
    components: RegExp[];
    confidence: "low" | "medium";
  }[] = [
    {
      text: "2 rotis and dal",
      calories: 420,
      protein: 20,
      fiber: 14,
      components: [/2 x 1 roti\/chapati/i, /dal\/lentils serving/i],
      confidence: "medium"
    },
    {
      text: "paneer wrap",
      calories: 430,
      protein: 19,
      fiber: 3,
      components: [/paneer serving/i, /wrap\/roti roll serving/i],
      confidence: "medium"
    },
    {
      text: "rice and chicken",
      calories: 370,
      protein: 35,
      fiber: 1,
      components: [/cooked chicken serving/i, /cooked rice serving/i],
      confidence: "medium"
    },
    {
      text: "egg bhurji and toast",
      calories: 150,
      protein: 9,
      fiber: 2,
      components: [/1 egg/i, /toast serving/i],
      confidence: "medium"
    },
    {
      text: "oats with yogurt",
      calories: 250,
      protein: 13,
      fiber: 4,
      components: [/oats serving/i, /plain yogurt\/curd serving/i],
      confidence: "medium"
    },
    {
      text: "salad with chicken",
      calories: 205,
      protein: 33,
      fiber: 3,
      components: [/salad\/vegetables serving/i, /cooked chicken serving/i],
      confidence: "medium"
    },
    {
      text: "leftover curry and rice",
      calories: 385,
      protein: 10,
      fiber: 5,
      components: [/leftover curry serving/i, /cooked rice serving/i],
      confidence: "medium"
    },
    {
      text: "small paneer bowl",
      calories: 195,
      protein: 10.5,
      fiber: 0,
      components: [/0.8 x paneer serving/i],
      confidence: "low"
    },
    {
      text: "large chicken salad",
      calories: 307.5,
      protein: 49.5,
      fiber: 4.5,
      components: [/1.5 x cooked chicken serving/i, /1.5 x salad\/vegetables serving/i],
      confidence: "medium"
    },
    {
      text: "2 eggs and toast with butter",
      calories: 265,
      protein: 15,
      fiber: 2,
      components: [/2 x 1 egg/i, /toast serving/i, /small butter serving/i],
      confidence: "medium"
    }
  ];

  for (const fixture of fixtures) {
    const estimate = estimateFreeTextNutrition(fixture.text);

    assert.equal(estimate?.totals.calories, fixture.calories, fixture.text);
    assert.equal(estimate?.totals.protein, fixture.protein, fixture.text);
    assert.equal(estimate?.totals.fiber, fixture.fiber, fixture.text);
    assert.equal(estimate?.confidence, fixture.confidence, fixture.text);
    assert.equal(estimate?.totals.carbs, null, fixture.text);
    assert.equal(estimate?.totals.fat, null, fixture.text);
    assert.equal(estimate?.totals.sodium, null, fixture.text);

    for (const component of fixture.components) {
      assert.match(
        estimate?.assumptions?.matchedComponents.join(" | ") ?? "",
        component,
        fixture.text
      );
    }
  }
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

test("ingredient nutrition estimator covers common parsed recipe ingredients", () => {
  const estimate = estimateNutritionFromIngredients({
    recipeName: "Chana rice bowl",
    ingredients: [
      { rawText: "1 can chickpeas, drained" },
      { rawText: "1 cup cooked rice" },
      { rawText: "2 cups spinach" }
    ]
  });

  assert.equal(estimate?.source, "estimated");
  assert.equal(estimate?.totals.calories, 385);
  assert.equal(estimate?.totals.protein, 14);
  assert.equal(estimate?.totals.fiber, 9);
  assert.equal(estimate?.totals.carbs, null);
  assert.match(estimate?.provenance ?? "", /recipe ingredients/i);
  assert.match(
    estimate?.assumptions?.matchedComponents.join(" | ") ?? "",
    /chickpeas\/chana serving/i
  );
});

test("ingredient nutrition estimator stays unavailable for unknown ingredient lists", () => {
  const estimate = estimateNutritionFromIngredients({
    recipeName: "Mystery dish",
    ingredients: [{ rawText: "1 packet seasoning" }, { rawText: "water" }]
  });

  assert.equal(estimate, null);
});
