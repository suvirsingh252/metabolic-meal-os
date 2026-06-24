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

test("JSON-LD extraction prefers visible ingredient quantities over bare tag lists", () => {
  const html = `
    <html>
      <head>
        <title>Chettinad Chicken Curry - Ranveer Brar</title>
        <meta property="og:site_name" content="Ranveer Brar">
        <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "Chettinad Chicken Curry",
            "recipeIngredient": [
              "cashew nuts",
              "Chicken legs",
              "curry leaves",
              "Dry kashmiri red chilies",
              "fresh coconut",
              "shallots"
            ],
            "recipeInstructions": ["Cook the curry."]
          }
        </script>
      </head>
      <body>
        <div class="ingredients_wrap">
          <h3>Ingredients</h3>
          <div class="ingredients_cont_wrap">
            <p><strong>For Paste</strong></p>
            <p>1 tbsp Black peppercorns, काली मिर्च के दाने</p>
            <p>6-7 no. Cloves, लौंग</p>
            <p>1 tbsp Coriander seeds, धनिये के बीज</p>
            <p>1 tsp Cumin seeds, जीरा</p>
            <p>4-5 no. Cashew Nuts, काजू</p>
            <p>¾ cup fresh Coconut, scraped, ताजा कसा हुआ नारियल</p>
            <p>1 kg Chicken legs, चिकन</p>
            <p>Salt to taste, नमक स्वादअनुसार</p>
            <p>2-3 sprig Curry leaves, कडी पत्ते</p>
            <p>½ cup Shallots (peeled &amp; roughly chopped) सांबर अनियन</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const parsed = parseRecipeJsonLd(
    html,
    new URL("https://ranveerbrar.com/recipes/chettinad-chicken-curry/"),
    "recipe-page"
  );

  assert.ok(parsed);
  assert.equal(parsed.source.sourceName, "Ranveer Brar");
  assert.deepEqual(parsed.ingredients.slice(0, 6), [
    {
      rawText: "1 tbsp Black peppercorns, काली मिर्च के दाने",
      name: "Black peppercorns",
      quantity: "1",
      unit: "tbsp"
    },
    {
      rawText: "6-7 no. Cloves, लौंग",
      name: "Cloves",
      quantity: "6-7",
      unit: "no."
    },
    {
      rawText: "1 tbsp Coriander seeds, धनिये के बीज",
      name: "Coriander seeds",
      quantity: "1",
      unit: "tbsp"
    },
    {
      rawText: "1 tsp Cumin seeds, जीरा",
      name: "Cumin seeds",
      quantity: "1",
      unit: "tsp"
    },
    {
      rawText: "4-5 no. Cashew Nuts, काजू",
      name: "Cashew Nuts",
      quantity: "4-5",
      unit: "no."
    },
    {
      rawText: "¾ cup fresh Coconut, scraped, ताजा कसा हुआ नारियल",
      name: "fresh Coconut, scraped",
      quantity: "¾",
      unit: "cup"
    }
  ]);
  assert.deepEqual(parsed.ingredients[7], {
    rawText: "Salt to taste, नमक स्वादअनुसार",
    name: "Salt",
    quantity: "to taste",
    unit: null
  });
});
