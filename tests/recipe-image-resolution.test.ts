import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecipeImageContextFromMeal,
  shouldResolveMealImage
} from "@/src/lib/images/meal-image-resolver";
import { mergeImageMetadataIntoNotes } from "@/src/lib/images/meal-image-persistence";
import { buildRecipeImagePrompt } from "@/src/lib/images/recipe-image-pipeline";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

function meal(overrides: Partial<MealSummary> = {}): MealSummary {
  return {
    id: "meal-1",
    url: "https://example.com/notion-page",
    mealName: "Paneer Lababdar Dhaba Style",
    createdAt: "2026-06-25T12:00:00.000Z",
    cuisine: "Indian",
    mealType: "Dinner",
    notes: "Serve with roti and salad.",
    sourceUrl:
      "https://ranveerbrar.com/recipes/10-mins-%E0%A4%AE%E0%A5%87%E0%A4%82-paneer-lababdar/",
    sourceName: "Ranveer Brar",
    ingredientsText: "2 tbsp Oil\nPaneer\nTomato puree",
    instructionsText: "Cook onion and spices.\nAdd paneer and simmer.",
    metabolicScore: null,
    proteinScore: null,
    fiberScore: null,
    proteinLevel: "High",
    bloodSugarImpact: null,
    effortLevel: null,
    satietyLevel: null,
    weeknightFriendly: true,
    comfortMeal: true,
    familyApproved: false,
    optimizedVersion: null,
    calories: null,
    proteinG: null,
    carbohydratesG: null,
    fatG: null,
    fiberG: null,
    sodiumMg: null,
    sugarG: null,
    nutritionSource: null,
    nutritionConfidence: null,
    nutritionProvenance: null,
    qualityScore: null,
    energyDensityScore: null,
    processingScore: null,
    satietyScoreNumeric: null,
    bloodSugarRiskScore: null,
    ...overrides
  };
}

test("pending non-manual meal images are eligible for resolution", () => {
  assert.equal(
    shouldResolveMealImage(
      meal({
        imageUrl: null,
        imageSource: "original",
        imageOriginalUrl: "https://example.com/paneer.jpg",
        imageStatus: "pending"
      })
    ),
    true
  );
});

test("manual or ready meal images are not auto-resolved", () => {
  assert.equal(
    shouldResolveMealImage(
      meal({
        imageUrl: "https://blob.example/manual.jpg",
        imageSource: "manual",
        imageStatus: "ready"
      })
    ),
    false
  );
  assert.equal(
    shouldResolveMealImage(
      meal({
        imageUrl: "https://blob.example/original.jpg",
        imageSource: "original",
        imageStatus: "ready"
      })
    ),
    false
  );
});

test("resolution context builds a cookbook-style AI fallback prompt", () => {
  const context = buildRecipeImageContextFromMeal(
    meal({
      imageOriginalUrl: null
    }),
    null
  );
  const prompt = buildRecipeImagePrompt(context);

  assert.match(prompt, /Paneer Lababdar Dhaba Style/);
  assert.match(prompt, /Cuisine\/style: Indian/);
  assert.match(
    prompt,
    /Visible ingredients to suggest: 2 tbsp Oil, Paneer, Tomato puree/
  );
  assert.match(prompt, /Cooking method clues: Cook onion and spices/);
  assert.match(prompt, /No text, no labels, no hands, no people, no watermarks, no logos/);
});

test("image resolution replaces pending Notes metadata with ready metadata", () => {
  const updated = mergeImageMetadataIntoNotes(
    [
      "Original Notes:\nRecipe notes.",
      [
        "Image Metadata:",
        "Image Source: original",
        "Original Image URL: https://example.com/source.jpg",
        "Image Status: pending"
      ].join("\n"),
      "Analysis Framework v2 Summary:\nQuick Verdict:\nGood."
    ].join("\n\n"),
    {
      imageUrl: "/uploads/recipe-images/original-test.jpg",
      imageSource: "original",
      imageOriginalUrl: "https://example.com/source.jpg",
      imagePrompt: null,
      imageAttribution: "Example",
      imageStatus: "ready",
      imageLastUpdated: "2026-06-25T15:00:00.000Z"
    }
  );

  assert.match(updated, /Image URL: \/uploads\/recipe-images\/original-test\.jpg/);
  assert.match(updated, /Image Status: ready/);
  assert.doesNotMatch(updated, /Image Status: pending/);
  assert.match(updated, /Analysis Framework v2 Summary/);
});
