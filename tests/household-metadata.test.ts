import assert from "node:assert/strict";
import test from "node:test";
import { validateHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { mapMealAnalysisToNotionProperties } from "@/src/lib/notion/mappers";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

const meal: MealAnalysisResult = {
  mealName: "Dal",
  cuisine: "Indian",
  mealType: "Dinner",
  proteinLevel: "Moderate",
  satietyLevel: "High",
  bloodSugarImpact: "Moderate",
  effortLevel: "Easy",
  familyApproved: true,
  weeknightFriendly: true,
  comfortMeal: true,
  optimizedVersion: "Add dal.",
  notes: "Notes",
  ingredientSuggestions: ["dal"],
  feedbackPrompt: "Repeat?",
  metabolicScore: 7,
  proteinScore: 7,
  fiberScore: 6,
  satietyScoreNumeric: 8,
  bloodSugarRiskScore: 4,
  quickVerdict: "Works.",
  mainConcerns: [],
  minimalChangeVersion: "Add dal.",
  supportiveVersion: "Add yogurt.",
  plateStrategy: "More dal.",
  whyThisHelps: "More filling.",
  culturalNotes: "",
  shoppingAdditions: [],
  prepNotes: [],
  mealPairings: [],
  cautions: [],
  evidenceNotes: ["balanced plate"],
  confidenceNotes: ["portions vary"],
  safetyDisclaimer: "general support",
  guidanceBasis: [],
  householdId: "home",
  createdBy: "private-token",
  visibility: "private",
  schemaVersion: "meal-record-v1"
};

test("validateHouseholdMetadata validates required ownership fields", () => {
  assert.deepEqual(
    validateHouseholdMetadata({
      householdId: " home ",
      createdBy: "private-token",
      visibility: "private",
      schemaVersion: "meal-record-v1"
    }),
    {
      householdId: "home",
      createdBy: "private-token",
      visibility: "private",
      schemaVersion: "meal-record-v1"
    }
  );

  assert.throws(() =>
    validateHouseholdMetadata({
      householdId: "",
      createdBy: "private-token",
      visibility: "private",
      schemaVersion: "meal-record-v1"
    })
  );
});

test("mapMealAnalysisToNotionProperties projects household metadata when schema supports it", () => {
  const properties = mapMealAnalysisToNotionProperties(meal, {
    householdId: { name: "Household ID", type: "rich_text" },
    createdBy: { name: "Created By", type: "rich_text" },
    visibility: { name: "Visibility", type: "select" },
    schemaVersion: { name: "Schema Version", type: "select" }
  });

  assert.equal("Household ID" in properties, true);
  assert.equal("Created By" in properties, true);
  assert.equal("Visibility" in properties, true);
  assert.equal("Schema Version" in properties, true);
});

test("mapMealAnalysisToNotionProperties persists nutrition totals when schema supports it", () => {
  const properties = mapMealAnalysisToNotionProperties(
    {
      ...meal,
      nutritionEstimate: {
        totals: {
          calories: 650,
          protein: 35,
          carbs: 70,
          fat: 18,
          fiber: 12,
          sodium: 900,
          sugar: 8
        },
        confidence: "medium",
        provenance: "Recipe page structured nutrition facts",
        source: "recipe-json-ld"
      }
    },
    {
      calories: { name: "Calories", type: "number" },
      proteinG: { name: "Protein (g)", type: "number" },
      carbohydratesG: { name: "Carbs (g)", type: "number" },
      fatG: { name: "Fat (g)", type: "number" },
      fiberG: { name: "Fiber (g)", type: "number" },
      sodiumMg: { name: "Sodium (mg)", type: "number" },
      sugarG: { name: "Sugar (g)", type: "number" },
      nutritionConfidence: { name: "Nutrition Confidence", type: "select" },
      nutritionProvenance: {
        name: "Nutrition Provenance",
        type: "rich_text"
      },
      nutritionSource: { name: "Nutrition Source", type: "select" }
    }
  );

  assert.deepEqual(properties.Calories, { number: 650 });
  assert.deepEqual(properties["Protein (g)"], { number: 35 });
  assert.deepEqual(properties["Carbs (g)"], { number: 70 });
  assert.deepEqual(properties["Fat (g)"], { number: 18 });
  assert.deepEqual(properties["Fiber (g)"], { number: 12 });
  assert.deepEqual(properties["Sodium (mg)"], { number: 900 });
  assert.deepEqual(properties["Sugar (g)"], { number: 8 });
  assert.deepEqual(properties["Nutrition Confidence"], {
    select: { name: "medium" }
  });
  assert.deepEqual(properties["Nutrition Provenance"], {
    rich_text: [
      {
        text: {
          content: "Recipe page structured nutrition facts"
        }
      }
    ]
  });
  assert.deepEqual(properties["Nutrition Source"], {
    select: { name: "recipe-json-ld" }
  });
});

test("mapMealAnalysisToNotionProperties leaves unavailable nutrition blank", () => {
  const properties = mapMealAnalysisToNotionProperties(
    {
      ...meal,
      nutritionEstimate: null
    },
    {
      calories: { name: "Calories", type: "number" },
      proteinG: { name: "Protein (g)", type: "number" },
      nutritionConfidence: { name: "Nutrition Confidence", type: "select" },
      nutritionProvenance: {
        name: "Nutrition Provenance",
        type: "rich_text"
      },
      nutritionSource: { name: "Nutrition Source", type: "select" }
    }
  );

  assert.equal("Calories" in properties, false);
  assert.equal("Protein (g)" in properties, false);
  assert.equal("Nutrition Confidence" in properties, false);
  assert.equal("Nutrition Provenance" in properties, false);
  assert.equal("Nutrition Source" in properties, false);
});

test("mapMealAnalysisToNotionProperties persists partial manual overrides without zero filling", () => {
  const properties = mapMealAnalysisToNotionProperties(
    {
      ...meal,
      nutritionEstimate: {
        totals: {
          calories: null,
          protein: 35,
          carbs: null,
          fat: null,
          fiber: 5,
          sodium: null,
          sugar: null
        },
        confidence: "low",
        provenance:
          "Estimated from free-text meal description; edited during meal review",
        source: "user-entered"
      }
    },
    {
      calories: { name: "Calories", type: "number" },
      proteinG: { name: "Protein (g)", type: "number" },
      fiberG: { name: "Fiber (g)", type: "number" },
      sodiumMg: { name: "Sodium (mg)", type: "number" },
      nutritionConfidence: { name: "Nutrition Confidence", type: "select" },
      nutritionProvenance: {
        name: "Nutrition Provenance",
        type: "rich_text"
      },
      nutritionSource: { name: "Nutrition Source", type: "select" }
    }
  );

  assert.equal("Calories" in properties, false);
  assert.deepEqual(properties["Protein (g)"], { number: 35 });
  assert.deepEqual(properties["Fiber (g)"], { number: 5 });
  assert.equal("Sodium (mg)" in properties, false);
  assert.deepEqual(properties["Nutrition Source"], {
    select: { name: "user-entered" }
  });
});
