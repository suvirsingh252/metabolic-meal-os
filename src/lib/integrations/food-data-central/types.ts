import type {
  NutritionConfidence,
  NutritionSnapshot
} from "@/src/lib/domain/nutrition";

export type FoodDataCentralConfidence = NutritionConfidence;

export interface FoodDataCentralSearchRequest {
  query: string;
  apiKey: string;
}

export interface FoodDataCentralFoodNutrient {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

export interface FoodDataCentralSearchFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: FoodDataCentralFoodNutrient[];
}

export interface FoodDataCentralSearchResponse {
  foods?: FoodDataCentralSearchFood[];
}

export interface IngredientNutrientSnapshot {
  ingredient: string;
  source: "usda-food-data-central";
  sourceName: "USDA FoodData Central";
  confidence: FoodDataCentralConfidence;
  matchedDescription: string;
  fdcId: number;
  matching?: {
    dataType?: string;
    genericMatchPreferred: boolean;
    brandedFallback: boolean;
    confidenceReason: string;
  };
  nutrients: {
    proteinG?: number;
    fiberG?: number;
    carbohydrateG?: number;
    totalSugarsG?: number;
    totalFatG?: number;
    saturatedFatG?: number;
    sodiumMg?: number;
    energyKcal?: number;
  };
  nutritionSnapshot: NutritionSnapshot;
  notes: string[];
}
