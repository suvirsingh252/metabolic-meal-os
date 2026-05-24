import type { RecipeIngredient } from "@/src/lib/types/recipe";
import type { IntegrationAdapterStatus } from "@/src/lib/integrations/shared";
import type { NutritionEstimate } from "@/src/lib/types/ai-analysis";

export interface NutritionEstimateRequest {
  ingredients: RecipeIngredient[];
  servings?: number | null;
  countryCode?: "CA";
}

export interface NutritionAdapter {
  status(): IntegrationAdapterStatus;
  estimate(request: NutritionEstimateRequest): Promise<NutritionEstimate>;
}

export const nutritionAdapterStatus: IntegrationAdapterStatus = {
  name: "nutrition",
  enabled: false,
  reason: "Stub only. Keep estimates separate from canonical recipe data."
};
