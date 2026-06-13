export type NutritionSource = "usda-food-data-central";
export type NutritionConfidence = "high" | "medium" | "low";
export type AmountBasis = "per-100g" | "serving" | "unknown";
export type FoodState = "raw" | "cooked" | "prepared" | "branded" | "unknown";

export interface CanonicalNutrients {
  proteinG?: number;
  fiberG?: number;
  carbohydrateG?: number;
  totalSugarsG?: number;
  totalFatG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  energyKcal?: number;
}

export interface NutritionSnapshot {
  amountBasis: AmountBasis;
  basisUnit: "g" | "serving" | "unknown";
  per100g: boolean;
  servingSize: number | null;
  servingUnit: string | null;
  source: NutritionSource;
  sourceId: string;
  confidence: NutritionConfidence;
  matchedFoodState: FoodState;
  rawOrCookedState: "raw" | "cooked" | "unknown";
  ediblePortionNotes: string | null;
  nutrients: CanonicalNutrients;
  lastVerifiedAt: string;
}

export function validateNutritionSnapshot(value: NutritionSnapshot) {
  const errors: string[] = [];

  if (value.amountBasis === "unknown") {
    errors.push("amountBasis must be known before persisting nutrient values.");
  }

  if (!value.basisUnit || value.basisUnit === "unknown") {
    errors.push("basisUnit must be known before persisting nutrient values.");
  }

  if (value.amountBasis === "per-100g" && !value.per100g) {
    errors.push("per100g must be true when amountBasis is per-100g.");
  }

  for (const [key, nutrientValue] of Object.entries(value.nutrients)) {
    if (
      nutrientValue !== undefined &&
      (!Number.isFinite(nutrientValue) || nutrientValue < 0)
    ) {
      errors.push(`${key} must be a non-negative finite number when present.`);
    }
  }

  if (!value.sourceId.trim()) {
    errors.push("sourceId is required.");
  }

  if (!value.lastVerifiedAt || Number.isNaN(Date.parse(value.lastVerifiedAt))) {
    errors.push("lastVerifiedAt must be an ISO date string.");
  }

  return {
    success: errors.length === 0,
    errors
  };
}

export {
  estimateFreeTextNutrition,
  estimateNutritionFromIngredients,
  freeTextNutritionEstimateRuleLabels
} from "@/src/lib/domain/nutrition/free-text-estimator";
