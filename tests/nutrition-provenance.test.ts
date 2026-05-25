import assert from "node:assert/strict";
import test from "node:test";
import { validateNutritionSnapshot } from "@/src/lib/domain/nutrition";
import { mapFoodDataCentralSearchResult } from "@/src/lib/integrations/food-data-central/mappers";

test("FoodData Central mapper emits explicit per-100g nutrition basis", () => {
  const snapshot = mapFoodDataCentralSearchResult("rice", [
    {
      fdcId: 123,
      description: "Rice, white, long-grain, cooked",
      dataType: "SR Legacy",
      foodNutrients: [
        { nutrientName: "Protein", unitName: "G", value: 2.7 },
        { nutrientName: "Energy", unitName: "KCAL", value: 130 }
      ]
    }
  ]);

  assert.ok(snapshot);
  assert.equal(snapshot.nutritionSnapshot.amountBasis, "per-100g");
  assert.equal(snapshot.nutritionSnapshot.basisUnit, "g");
  assert.equal(snapshot.nutritionSnapshot.per100g, true);
  assert.equal(snapshot.nutritionSnapshot.rawOrCookedState, "cooked");
});

test("validateNutritionSnapshot rejects nutrient values without basis", () => {
  const result = validateNutritionSnapshot({
    amountBasis: "unknown",
    basisUnit: "unknown",
    per100g: false,
    servingSize: null,
    servingUnit: null,
    source: "usda-food-data-central",
    sourceId: "123",
    confidence: "medium",
    matchedFoodState: "unknown",
    rawOrCookedState: "unknown",
    ediblePortionNotes: null,
    nutrients: { proteinG: 2 },
    lastVerifiedAt: new Date().toISOString()
  });

  assert.equal(result.success, false);
  assert.ok(result.errors.includes("amountBasis must be known before persisting nutrient values."));
});
