import assert from "node:assert/strict";
import test from "node:test";
import { mapMealAnalysisToNotionProperties } from "@/src/lib/notion/mappers";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

const baseMeal: MealAnalysisResult = {
  mealName: "Gobi parantha with butter",
  cuisine: "Indian",
  mealType: "Lunch",
  proteinLevel: "Moderate",
  satietyLevel: "High",
  bloodSugarImpact: "Moderate",
  effortLevel: "Easy",
  familyApproved: true,
  weeknightFriendly: true,
  comfortMeal: true,
  optimizedVersion: "Keep it.",
  notes: "Notes",
  ingredientSuggestions: ["gobi", "paratha", "butter"],
  feedbackPrompt: "Repeat?",
  metabolicScore: 7,
  proteinScore: 6,
  fiberScore: 6,
  satietyScoreNumeric: 8,
  bloodSugarRiskScore: 4,
  quickVerdict: "Works.",
  mainConcerns: [],
  minimalChangeVersion: "Keep portions steady.",
  supportiveVersion: "Add curd if needed.",
  plateStrategy: "Pair with veg.",
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

test("Notion mapping persists estimated fields and leaves blank fields unset", () => {
  const properties = mapMealAnalysisToNotionProperties(
    {
      ...baseMeal,
      nutritionEstimate: {
        totals: {
          calories: 330,
          protein: 8,
          carbs: null,
          fat: null,
          fiber: 6,
          sodium: null,
          sugar: null
        },
        confidence: "medium",
        provenance:
          "Estimated from free-text meal description using conservative component assumptions: 1 paratha/parantha + gobi/cauliflower filling + small butter serving. Serving sizes are assumed typical household portions; review before saving.; edited during meal review",
        source: "user-entered"
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

  assert.deepEqual(properties.Calories, { number: 330 });
  assert.deepEqual(properties["Protein (g)"], { number: 8 });
  assert.deepEqual(properties["Fiber (g)"], { number: 6 });
  assert.equal("Carbs (g)" in properties, false);
  assert.equal("Fat (g)" in properties, false);
  assert.equal("Sodium (mg)" in properties, false);
  assert.equal("Sugar (g)" in properties, false);
  assert.deepEqual(properties["Nutrition Source"], {
    select: { name: "user-entered" }
  });
  const nutritionProvenance = properties["Nutrition Provenance"];
  assert.ok(nutritionProvenance && "rich_text" in nutritionProvenance);
  const provenanceText = nutritionProvenance.rich_text[0];
  assert.ok("text" in provenanceText);
  assert.match(provenanceText.text.content, /edited during meal review/);
});
