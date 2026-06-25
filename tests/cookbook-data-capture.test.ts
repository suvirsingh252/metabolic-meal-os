import assert from "node:assert/strict";
import test from "node:test";
import {
  basicRecipeParserAdapter,
  parseRecipeJsonLd
} from "@/src/lib/integrations/recipe-parser";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";
import {
  mealAnalysisJsonSchema,
  mealAnalysisRequiredFields
} from "@/src/lib/ai/meal-analysis/v1/schema";
import { validateMealAnalysisResult } from "@/src/lib/domain/meal/validation";
import {
  buildMealCookbook,
  formatCookbookIngredientAmount
} from "@/src/lib/domain/meals/cookbook";
import { emptyMealFeedbackSummary } from "@/src/lib/domain/feedback";
import { buildMealNotesSummary } from "@/src/lib/notion/meal-notes";
import {
  mapMealAnalysisToNotionProperties
} from "@/src/lib/notion/mappers";
import {
  mapNotionPageToMealSummary,
  type MealSummary
} from "@/src/lib/notion/meal-summary";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

const baseAnalysis: MealAnalysisResult = {
  mealName: "Chana masala",
  cuisine: "Indian",
  mealType: "Dinner",
  proteinLevel: "High",
  satietyLevel: "High",
  bloodSugarImpact: "Moderate",
  effortLevel: "Easy",
  familyApproved: true,
  weeknightFriendly: true,
  comfortMeal: false,
  optimizedVersion: "Add extra spinach.",
  notes: "Hearty chickpea curry the family already loves.",
  ingredientSuggestions: ["chickpeas", "spinach"],
  feedbackPrompt: "Repeat?",
  metabolicScore: 8,
  proteinScore: 7,
  fiberScore: 8,
  satietyScoreNumeric: 8,
  bloodSugarRiskScore: 3,
  quickVerdict: "Solid weeknight pick.",
  mainConcerns: [],
  minimalChangeVersion: "Keep as is.",
  supportiveVersion: "Serve with salad first.",
  plateStrategy: "Half veg, quarter chana, quarter rice.",
  whyThisHelps: "More filling.",
  culturalNotes: "",
  shoppingAdditions: [],
  prepNotes: [],
  mealPairings: [],
  cautions: [],
  evidenceNotes: ["balanced plate"],
  confidenceNotes: ["portions vary"],
  safetyDisclaimer: "general support",
  guidanceBasis: []
};

const sampleIngredients = [
  { rawText: "2 cups basmati rice", name: "basmati rice", quantity: "2", unit: "cups" },
  { rawText: "1 tbsp ghee", name: "ghee", quantity: "1", unit: "tbsp" },
  { rawText: "1 can chickpeas, drained", name: "chickpeas", quantity: "1", unit: "can" }
];

const sampleInstructions = [
  "Rinse the rice until the water runs clear.",
  "Saute onions in ghee until golden.",
  "Add chickpeas and simmer for 15 minutes."
];

function analysisBody(overrides: Record<string, unknown> = {}) {
  return { ...baseAnalysis, ...overrides } as Record<string, unknown>;
}

function makeMealSummary(overrides: Partial<MealSummary>): MealSummary {
  return {
    id: "meal-1",
    url: "https://notion.so/meal-1",
    mealName: "Chana masala",
    createdAt: "2026-06-01T12:00:00.000Z",
    sourceUrl: null,
    sourceName: null,
    cuisine: "Indian",
    mealType: "Dinner",
    proteinLevel: "High",
    satietyLevel: "High",
    bloodSugarImpact: "Moderate",
    effortLevel: "Easy",
    familyApproved: true,
    weeknightFriendly: true,
    comfortMeal: false,
    optimizedVersion: null,
    notes: null,
    ingredientsText: null,
    instructionsText: null,
    calories: null,
    proteinG: null,
    carbohydratesG: null,
    fatG: null,
    fiberG: null,
    sodiumMg: null,
    sugarG: null,
    nutritionConfidence: null,
    nutritionSource: null,
    nutritionProvenance: null,
    qualityScore: null,
    metabolicScore: null,
    proteinScore: null,
    fiberScore: null,
    energyDensityScore: null,
    processingScore: null,
    satietyScoreNumeric: null,
    bloodSugarRiskScore: null,
    ...overrides
  };
}

// --- Analyze: extraction ---

test("recipe JSON-LD parsing preserves verbatim ingredients and ordered instructions", () => {
  const html = `<html><head><script type="application/ld+json">{
    "@type": "Recipe",
    "name": "Family chana masala",
    "recipeIngredient": ["2 cups basmati rice", "1 tbsp ghee"],
    "recipeInstructions": [
      { "@type": "HowToStep", "text": "Rinse the rice." },
      { "@type": "HowToStep", "text": "Simmer the chana." }
    ]
  }</script></head><body></body></html>`;

  const parsed = parseRecipeJsonLd(
    html,
    new URL("https://example.com/recipes/chana"),
    "recipe-page"
  );

  assert.ok(parsed);
  assert.deepEqual(
    parsed.ingredients.map((ingredient) => ingredient.rawText),
    ["2 cups basmati rice", "1 tbsp ghee"]
  );
  assert.deepEqual(parsed.instructions, ["Rinse the rice.", "Simmer the chana."]);
});

test("recipe JSON-LD parsing decodes astral numeric HTML entities", () => {
  const hexHtml = `<html><head><script type="application/ld+json">{
    "@type": "Recipe",
    "name": "Noodle soup &#x1F35C;",
    "recipeIngredient": ["noodles"],
    "recipeInstructions": ["Simmer."]
  }</script></head><body></body></html>`;
  const decimalHtml = `<html><head><script type="application/ld+json">{
    "@type": "Recipe",
    "name": "Noodle soup &#127836;",
    "recipeIngredient": ["noodles"],
    "recipeInstructions": ["Simmer."]
  }</script></head><body></body></html>`;

  const hexParsed = parseRecipeJsonLd(
    hexHtml,
    new URL("https://example.com/recipes/noodles"),
    "recipe-page"
  );
  const decimalParsed = parseRecipeJsonLd(
    decimalHtml,
    new URL("https://example.com/recipes/noodles"),
    "recipe-page"
  );

  assert.equal(hexParsed?.name, "Noodle soup 🍜");
  assert.equal(decimalParsed?.name, "Noodle soup 🍜");
});

test("recipe JSON-LD parsing leaves invalid numeric entities unchanged", () => {
  const html = `<html><head><script type="application/ld+json">{
    "@type": "Recipe",
    "name": "Soup &#x110000; &#xzz;",
    "recipeIngredient": ["stock"],
    "recipeInstructions": ["Warm."]
  }</script></head><body></body></html>`;

  const parsed = parseRecipeJsonLd(
    html,
    new URL("https://example.com/recipes/soup"),
    "recipe-page"
  );

  assert.equal(parsed?.name, "Soup &#x110000; &#xzz;");
});

test("recipe JSON-LD parsing keeps named entity behavior", () => {
  const html = `<html><head><script type="application/ld+json">{
    "@type": "Recipe",
    "name": "Rice &amp; dal",
    "recipeIngredient": ["rice"],
    "recipeInstructions": ["Serve."]
  }</script></head><body></body></html>`;

  const parsed = parseRecipeJsonLd(
    html,
    new URL("https://example.com/recipes/rice-dal"),
    "recipe-page"
  );

  assert.equal(parsed?.name, "Rice & dal");
});

test("manual text analysis prep leaves extraction to the AI fallback", async () => {
  const prepared = await prepareRecipeForMealAnalysis({
    recipeText: "Chana masala with rice. 2 cups rice, 1 can chickpeas. Simmer."
  });

  assert.deepEqual(prepared.ingredients, []);
  assert.deepEqual(prepared.instructions, []);
});

test("regular recipe URL analysis prep still uses the recipe parser path", async () => {
  const originalParseFromUrl = basicRecipeParserAdapter.parseFromUrl;
  const calls: string[] = [];

  basicRecipeParserAdapter.parseFromUrl = async (url) => {
    calls.push(url);
    return {
      name: "Parser chana",
      source: {
        sourceType: "url",
        sourceUrl: url,
        sourceName: "Example",
        sourceClassification: "recipe-page",
        parserVersion: "test-parser"
      },
      ingredients: [{ rawText: "1 cup chickpeas" }],
      instructions: ["Simmer chickpeas."]
    };
  };

  try {
    const prepared = await prepareRecipeForMealAnalysis({
      recipeText: "https://example.com/recipes/chana"
    });

    assert.deepEqual(calls, ["https://example.com/recipes/chana"]);
    assert.equal(prepared.sourceClassification, "recipe-page");
    assert.equal(prepared.ingredients[0]?.rawText, "1 cup chickpeas");
  } finally {
    basicRecipeParserAdapter.parseFromUrl = originalParseFromUrl;
  }
});

test("AI response schema requires verbatim cookbook extraction fields", () => {
  assert.ok(mealAnalysisRequiredFields.includes("extractedIngredients"));
  assert.ok(mealAnalysisRequiredFields.includes("extractedInstructions"));
  assert.ok("extractedIngredients" in mealAnalysisJsonSchema.properties);
  assert.ok("extractedInstructions" in mealAnalysisJsonSchema.properties);
});

// --- Validation: carrying cookbook fields into the result ---

test("validation maps AI extracted fields into cookbook ingredients and instructions", () => {
  const result = validateMealAnalysisResult(
    analysisBody({
      extractedIngredients: sampleIngredients,
      extractedInstructions: sampleInstructions
    })
  );

  assert.ok(result.success && result.data);
  assert.deepEqual(result.data.ingredients, sampleIngredients);
  assert.deepEqual(result.data.instructions, sampleInstructions);
});

test("validation prefers explicit ingredients over AI extracted fallback", () => {
  const result = validateMealAnalysisResult(
    analysisBody({
      ingredients: [{ rawText: "1 cup parser ingredient" }],
      extractedIngredients: [
        { rawText: "AI ingredient", name: null, quantity: null, unit: null }
      ]
    })
  );

  assert.ok(result.success && result.data);
  assert.equal(result.data.ingredients?.length, 1);
  assert.equal(result.data.ingredients?.[0]?.rawText, "1 cup parser ingredient");
});

test("validation accepts plain-string ingredients and caps oversized lists", () => {
  const result = validateMealAnalysisResult(
    analysisBody({
      ingredients: [
        "2 cups rice",
        "",
        ...Array.from({ length: 150 }, (_, index) => `ingredient ${index}`)
      ],
      instructions: Array.from({ length: 80 }, (_, index) => `Step ${index}`)
    })
  );

  assert.ok(result.success && result.data);
  assert.equal(result.data.ingredients?.[0]?.rawText, "2 cups rice");
  assert.equal(result.data.ingredients?.length, 100);
  assert.equal(result.data.instructions?.length, 60);
});

test("validation tolerates missing cookbook fields for backward compatibility", () => {
  const result = validateMealAnalysisResult(analysisBody());

  assert.ok(result.success && result.data);
  assert.equal(result.data.ingredients, null);
  assert.equal(result.data.instructions, null);
});

// --- Persistence: save to Notion ---

test("Notes summary embeds cookbook sections the reader parses back out", () => {
  const summary = buildMealNotesSummary({
    ...baseAnalysis,
    ingredients: sampleIngredients,
    instructions: sampleInstructions
  });

  assert.match(summary, /Ingredients:\n- 2 cups basmati rice\n- 1 tbsp ghee/);
  assert.match(summary, /Instructions:\n1\. Rinse the rice until the water runs clear\./);
  assert.match(summary, /2\. Saute onions in ghee until golden\./);
});

test("Notes summary embeds image metadata when image fields are present", () => {
  const summary = buildMealNotesSummary({
    ...baseAnalysis,
    imageUrl: "https://blob.example/recipe-images/chana.png",
    imageSource: "ai",
    imagePrompt: "Professional cookbook photograph of chana masala.",
    imageStatus: "ready",
    imageLastUpdated: "2026-06-25T12:00:00.000Z"
  });

  assert.match(summary, /Image Metadata:/);
  assert.match(summary, /Image URL: https:\/\/blob\.example\/recipe-images\/chana\.png/);
  assert.match(summary, /Image Source: ai/);
  assert.match(summary, /Image Status: ready/);
});

test("save mapping persists cookbook fields to dedicated properties when available", () => {
  const properties = mapMealAnalysisToNotionProperties(
    {
      ...baseAnalysis,
      ingredients: sampleIngredients,
      instructions: sampleInstructions
    },
    {
      ingredients: { name: "Ingredients", type: "rich_text" },
      instructions: { name: "Instructions", type: "rich_text" }
    }
  );

  const ingredients = properties.Ingredients;
  assert.ok(ingredients && "rich_text" in ingredients);
  const ingredientsText = ingredients.rich_text
    .map((part) => ("text" in part ? part.text.content : ""))
    .join("");
  assert.equal(
    ingredientsText,
    "2 cups basmati rice\n1 tbsp ghee\n1 can chickpeas, drained"
  );

  const instructions = properties.Instructions;
  assert.ok(instructions && "rich_text" in instructions);
  const instructionsText = instructions.rich_text
    .map((part) => ("text" in part ? part.text.content : ""))
    .join("");
  assert.match(instructionsText, /^1\. Rinse the rice until the water runs clear\./);
  assert.match(instructionsText, /\n3\. Add chickpeas and simmer for 15 minutes\.$/);
});

test("save mapping still embeds cookbook sections in Notes without dedicated properties", () => {
  const properties = mapMealAnalysisToNotionProperties({
    ...baseAnalysis,
    ingredients: sampleIngredients,
    instructions: sampleInstructions
  });

  const notes = properties.Notes;
  assert.ok(notes && "rich_text" in notes);
  const notesText = notes.rich_text
    .map((part) => ("text" in part ? part.text.content : ""))
    .join("");
  assert.match(notesText, /Ingredients:\n- 2 cups basmati rice/);
  assert.match(notesText, /Instructions:\n1\. Rinse the rice/);
});

test("long Notes content is chunked across rich_text blocks instead of truncated", () => {
  const longInstructions = Array.from(
    { length: 60 },
    (_, index) =>
      `Step ${index + 1}: stir gently and watch the pot so nothing sticks to the bottom while it simmers.`
  );
  const meal: MealAnalysisResult = {
    ...baseAnalysis,
    ingredients: sampleIngredients,
    instructions: longInstructions
  };
  const summary = buildMealNotesSummary(meal);
  assert.ok(summary.length > 2000, "fixture should exceed a single block");
  assert.doesNotMatch(summary, /\[Truncated/);

  const properties = mapMealAnalysisToNotionProperties(meal);
  const notes = properties.Notes;
  assert.ok(notes && "rich_text" in notes);
  assert.ok(notes.rich_text.length > 1, "expected multiple chunks");

  for (const part of notes.rich_text) {
    assert.ok("text" in part && part.text.content.length <= 2000);
  }

  const rejoined = notes.rich_text
    .map((part) => ("text" in part ? part.text.content : ""))
    .join("");
  assert.equal(rejoined, summary);
});

// --- Reload: Notion page back into the app ---

test("meal summary reload reads dedicated cookbook properties across chunks", () => {
  const meal = mapNotionPageToMealSummary({
    id: "meal-9",
    url: "https://notion.so/meal-9",
    created_time: "2026-06-01T10:00:00.000Z",
    properties: {
      "Meal Name": {
        type: "title",
        title: [{ plain_text: "Chana masala" }]
      },
      Ingredients: {
        type: "rich_text",
        rich_text: [
          { plain_text: "2 cups basmati rice\n1 tbsp" },
          { plain_text: " ghee" }
        ]
      },
      Instructions: {
        type: "rich_text",
        rich_text: [{ plain_text: "1. Rinse the rice.\n2. Simmer the chana." }]
      },
      "Source URL": {
        type: "url",
        url: "https://example.com/recipes/chana"
      }
    }
  });

  assert.equal(meal?.ingredientsText, "2 cups basmati rice\n1 tbsp ghee");
  assert.equal(meal?.instructionsText, "1. Rinse the rice.\n2. Simmer the chana.");
  assert.equal(meal?.sourceUrl, "https://example.com/recipes/chana");
});

test("meal summary reload accepts the household 'Original Source' URL property name", () => {
  const meal = mapNotionPageToMealSummary({
    id: "meal-10",
    url: "https://notion.so/meal-10",
    created_time: "2026-06-01T10:00:00.000Z",
    properties: {
      "Meal Name": {
        type: "title",
        title: [{ plain_text: "Chana masala" }]
      },
      "Original Source": {
        type: "url",
        url: "https://example.com/recipes/chana"
      }
    }
  });

  assert.equal(meal?.sourceUrl, "https://example.com/recipes/chana");
});

// --- Cookbook: end-to-end round trip ---

test("saved Notes round-trip into structured cookbook ingredients and steps", () => {
  const notes = buildMealNotesSummary({
    ...baseAnalysis,
    ingredients: sampleIngredients,
    instructions: sampleInstructions
  });
  const cookbook = buildMealCookbook(
    makeMealSummary({ notes, sourceUrl: "https://example.com/recipes/chana" }),
    emptyMealFeedbackSummary("meal-1")
  );

  assert.equal(cookbook.ingredients.length, 3);
  assert.deepEqual(
    cookbook.ingredients.map((ingredient) => ingredient.rawText),
    ["2 cups basmati rice", "1 tbsp ghee", "1 can chickpeas, drained"]
  );
  assert.equal(cookbook.ingredients[0]?.quantity, "2");
  assert.equal(cookbook.ingredients[0]?.unit, "cups");
  assert.equal(cookbook.ingredients[0]?.name, "basmati rice");
  assert.deepEqual(
    cookbook.instructions.map((step) => step.text),
    sampleInstructions
  );
  assert.equal(cookbook.hasOriginalRecipe, true);
  assert.equal(cookbook.originalRecipeUrl, "https://example.com/recipes/chana");
});

test("saved Ranveer Brar ingredient lines keep quantities, units, and English names", () => {
  const cookbook = buildMealCookbook(
    makeMealSummary({
      sourceUrl: "https://ranveerbrar.com/recipes/chettinad-chicken-curry/",
      ingredientsText: [
        "1 tbsp Black peppercorns, काली मिर्च के दाने",
        "6-7 no. Cloves, लौंग",
        "4-5 no. Cashew Nuts, काजू",
        "¾ cup fresh Coconut, scraped, ताजा कसा हुआ नारियल",
        "1 kg Chicken legs, चिकन",
        "Salt to taste, नमक स्वादअनुसार",
        "2-3 sprig Curry leaves, कडी पत्ते",
        "½ cup Shallots (peeled & roughly chopped) सांबर अनियन"
      ].join("\n")
    }),
    emptyMealFeedbackSummary("meal-1")
  );

  assert.deepEqual(cookbook.ingredients.slice(0, 5), [
    {
      id: "ingredient-1",
      rawText: "1 tbsp Black peppercorns, काली मिर्च के दाने",
      name: "Black peppercorns",
      quantity: "1",
      unit: "tbsp"
    },
    {
      id: "ingredient-2",
      rawText: "6-7 no. Cloves, लौंग",
      name: "Cloves",
      quantity: "6-7",
      unit: "no."
    },
    {
      id: "ingredient-3",
      rawText: "4-5 no. Cashew Nuts, काजू",
      name: "Cashew Nuts",
      quantity: "4-5",
      unit: "no."
    },
    {
      id: "ingredient-4",
      rawText: "¾ cup fresh Coconut, scraped, ताजा कसा हुआ नारियल",
      name: "fresh Coconut, scraped",
      quantity: "¾",
      unit: "cup"
    },
    {
      id: "ingredient-5",
      rawText: "1 kg Chicken legs, चिकन",
      name: "Chicken legs",
      quantity: "1",
      unit: "kg"
    }
  ]);
  assert.equal(cookbook.ingredients[5]?.quantity, "to taste");
  assert.equal(cookbook.ingredients[5]?.name, "Salt");
  assert.equal(cookbook.ingredients[6]?.quantity, "2-3");
  assert.equal(cookbook.ingredients[6]?.unit, "sprig");
  assert.equal(cookbook.ingredients[6]?.name, "Curry leaves");
  assert.equal(cookbook.ingredients[7]?.quantity, "½");
  assert.equal(cookbook.ingredients[7]?.unit, "cup");
  assert.equal(cookbook.ingredients[7]?.name, "Shallots (peeled & roughly chopped)");
  assert.equal(formatCookbookIngredientAmount(cookbook.ingredients[2]), "4-5 no.");
  assert.equal(formatCookbookIngredientAmount(cookbook.ingredients[3]), "¾ cup");
  assert.equal(formatCookbookIngredientAmount(cookbook.ingredients[5]), "to taste");
});

test("cookbook prefers dedicated properties over Notes sections", () => {
  const cookbook = buildMealCookbook(
    makeMealSummary({
      notes: "Ingredients:\n- stale notes ingredient",
      ingredientsText: "2 cups basmati rice\n1 tbsp ghee",
      instructionsText: "1. Rinse the rice.\n2. Simmer the chana."
    }),
    emptyMealFeedbackSummary("meal-1")
  );

  assert.deepEqual(
    cookbook.ingredients.map((ingredient) => ingredient.rawText),
    ["2 cups basmati rice", "1 tbsp ghee"]
  );
  assert.deepEqual(
    cookbook.instructions.map((step) => step.text),
    ["Rinse the rice.", "Simmer the chana."]
  );
});

test("older meals without cookbook data still build graceful empty states", () => {
  const cookbook = buildMealCookbook(
    makeMealSummary({ notes: "Saved household meal note from Beta 2." }),
    emptyMealFeedbackSummary("meal-1")
  );

  assert.deepEqual(cookbook.ingredients, []);
  assert.deepEqual(cookbook.instructions, []);
  assert.equal(cookbook.hasOriginalRecipe, false);
  assert.equal(cookbook.originalRecipeLabel, "Open saved record");
});

// --- Family adjustments stay overlays ---

test("family adjustments never alter source ingredients or instructions", () => {
  const summary = makeMealSummary({
    notes: buildMealNotesSummary({
      ...baseAnalysis,
      ingredients: sampleIngredients,
      instructions: sampleInstructions
    })
  });
  const withoutAdjustments = buildMealCookbook(
    summary,
    emptyMealFeedbackSummary("meal-1")
  );
  const withAdjustments = buildMealCookbook(summary, {
    ...emptyMealFeedbackSummary("meal-1"),
    familyAdjustments: ["Less salt", "Double the spinach"],
    recentNotes: ["[Family cookbook adjustment] Use the air fryer instead"]
  });

  assert.equal(withAdjustments.familyAdjustments.length, 3);
  assert.deepEqual(withAdjustments.ingredients, withoutAdjustments.ingredients);
  assert.deepEqual(withAdjustments.instructions, withoutAdjustments.instructions);
});
