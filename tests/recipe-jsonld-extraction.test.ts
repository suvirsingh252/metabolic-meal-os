import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCanonicalRecipeJsonLd,
  parseRecipeJsonLd
} from "@/src/lib/integrations/recipe-parser";

const sourceUrl = new URL("https://example.com/recipes/chana");

test("JSON-LD Recipe extraction normalizes a canonical recipe", () => {
  const html = `
    <html>
      <head>
        <title>Fallback title</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Chana masala",
            "recipeYield": "4 servings",
            "prepTime": "PT10M",
            "cookTime": "PT25M",
            "recipeIngredient": ["1 can chickpeas", "1 cup tomato"],
            "recipeInstructions": [
              { "@type": "HowToStep", "text": "Simmer the sauce." },
              { "@type": "HowToStep", "text": "Add chickpeas." }
            ]
          }
        </script>
      </head>
    </html>
  `;

  const recipe = parseCanonicalRecipeJsonLd(html, sourceUrl);

  assert.ok(recipe);
  assert.equal(recipe.title, "Chana masala");
  assert.equal(recipe.servings, "4 servings");
  assert.equal(recipe.prepTime, "PT10M");
  assert.equal(recipe.cookTime, "PT25M");
  assert.equal(recipe.extractionMethod, "jsonld");
  assert.equal(recipe.confidence, "full_recipe");
  assert.deepEqual(
    recipe.ingredients.map((ingredient) => ingredient.rawText),
    ["1 can chickpeas", "1 cup tomato"]
  );
  assert.deepEqual(recipe.instructions, [
    "Simmer the sauce.",
    "Add chickpeas."
  ]);
});

test("nested @graph Recipe extraction is supported", () => {
  const html = `
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", "name": "A page" },
          {
            "@type": ["Thing", "Recipe"],
            "name": "Tofu bowl",
            "recipeIngredient": ["tofu", "rice"],
            "recipeInstructions": {
              "@type": "HowToSection",
              "itemListElement": [
                { "@type": "HowToStep", "text": "Crisp tofu." }
              ]
            }
          }
        ]
      }
    </script>
  `;

  const recipe = parseCanonicalRecipeJsonLd(html, sourceUrl);

  assert.ok(recipe);
  assert.equal(recipe.title, "Tofu bowl");
  assert.equal(recipe.confidence, "full_recipe");
  assert.deepEqual(recipe.instructions, ["Crisp tofu."]);
});

test("malformed JSON-LD does not crash extraction", () => {
  const html = `
    <script type="application/ld+json">{ not valid json }</script>
    <script type="application/ld+json">
      {
        "@type": "Recipe",
        "name": "Valid backup",
        "recipeIngredient": ["beans"]
      }
    </script>
  `;

  const recipe = parseCanonicalRecipeJsonLd(html, sourceUrl);

  assert.ok(recipe);
  assert.equal(recipe.title, "Valid backup");
  assert.equal(recipe.confidence, "partial_recipe");
});

test("parsed JSON-LD draft carries canonical metadata for successful analyze prep", () => {
  const html = `
    <meta property="og:site_name" content="Example Kitchen">
    <script type="application/ld+json">
      {
        "@type": "Recipe",
        "name": "Lentil soup",
        "recipeIngredient": ["lentils", "carrots"],
        "recipeInstructions": ["Boil until tender."]
      }
    </script>
  `;

  const draft = parseRecipeJsonLd(html, sourceUrl, "recipe-page");

  assert.ok(draft);
  assert.equal(draft.source.sourceName, "Example Kitchen");
  assert.equal(draft.canonicalRecipe?.extractionMethod, "jsonld");
  assert.equal(draft.canonicalRecipe?.confidence, "full_recipe");
  assert.equal(draft.source.sourceClassification, "recipe-page");
});
