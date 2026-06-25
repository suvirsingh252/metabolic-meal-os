import assert from "node:assert/strict";
import test from "node:test";
import { buildMealIntelligence } from "@/src/lib/domain/meal-intelligence";

test("meal intelligence derives operational and nutrition fields from saved meal data", () => {
  const intelligence = buildMealIntelligence(
    {
      id: "chana",
      mealName: "Chana masala",
      cuisine: "Indian",
      mealType: "Dinner",
      effortLevel: "Low",
      familyApproved: true,
      weeknightFriendly: true,
      comfortMeal: true,
      ingredientsText: ["chickpeas", "spinach", "tomatoes", "onion", "rice"].join("\n"),
      instructionsText: "Simmer the curry for 25 minutes in one pot.",
      calories: 520,
      proteinG: 26,
      fiberG: 13,
      qualityScore: 86,
      proteinScore: 8,
      fiberScore: 9,
      bloodSugarImpact: "Moderate"
    },
    []
  );

  assert.equal(intelligence.preparationComplexity, "low");
  assert.equal(intelligence.confidence, "high");
  assert.deepEqual(intelligence.evidence.slice(0, 3), [
    "ingredients",
    "instructions",
    "nutrition"
  ]);
  assert.equal(intelligence.cleanupEffort, "low");
  assert.equal(intelligence.weeknightSuitability, "excellent");
  assert.equal(intelligence.primaryProtein, "chickpeas");
  assert.equal(intelligence.spiceLevel, "medium");
  assert.ok(intelligence.nutritionHighlights.includes("26 g protein"));
  assert.ok(intelligence.dietaryTags.includes("high fiber"));
  assert.equal(intelligence.proteinDensity, 5);
});

test("meal intelligence marks sparse meals low confidence without inventing detail", () => {
  const intelligence = buildMealIntelligence({
    id: "sparse",
    mealName: "Mystery dinner",
    cuisine: null,
    mealType: "Dinner"
  });

  assert.equal(intelligence.confidence, "low");
  assert.deepEqual(intelligence.evidence, []);
  assert.equal(intelligence.nutritionHighlights.length, 0);
  assert.equal(intelligence.similarMeals.length, 0);
});

test("meal intelligence finds ingredient overlap and similar saved meals", () => {
  const meal = {
    id: "tofu",
    mealName: "Tofu broccoli bowls",
    cuisine: "Asian",
    mealType: "Dinner",
    ingredientsText: ["tofu", "broccoli", "rice", "soy sauce"].join("\n"),
    instructionsText: "Stir fry tofu and broccoli.",
    proteinG: 30,
    calories: 600
  };
  const intelligence = buildMealIntelligence(meal, [
    meal,
    {
      id: "stir-fry",
      mealName: "Chicken broccoli stir fry",
      cuisine: "Asian",
      mealType: "Dinner",
      ingredientsText: ["chicken", "broccoli", "rice", "soy sauce"].join("\n"),
      instructionsText: "Stir fry chicken and broccoli."
    },
    {
      id: "pasta",
      mealName: "Tomato pasta",
      cuisine: "Italian",
      mealType: "Dinner",
      ingredientsText: ["pasta", "tomato"].join("\n")
    }
  ]);

  assert.deepEqual(intelligence.ingredientOverlap[0]?.sharedIngredients, [
    "broccoli",
    "rice",
    "soy sauce"
  ]);
  assert.equal(intelligence.similarMeals[0]?.mealId, "stir-fry");
  assert.ok(
    intelligence.similarMeals[0]?.reasons.some((reason) =>
      reason.includes("same cuisine")
    )
  );
});
