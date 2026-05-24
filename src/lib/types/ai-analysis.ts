import type { MealAnalysisResult } from "@/src/lib/types/meal";
import type { OperationalRecipeTag } from "@/src/lib/types/recipe";

export interface NutritionEstimate {
  proteinLevel?: string;
  fiberLevel?: string;
  satietyLevel?: string;
  bloodSugarImpact?: string;
  confidence?: "low" | "medium" | "high";
  notes?: string;
}

export interface RecipeAiAnalysis {
  recipeId?: string | null;
  summary: string;
  suggestedTags: OperationalRecipeTag[];
  nutritionEstimate?: NutritionEstimate;
  substitutionIdeas: string[];
  canadianGroceryNotes: string[];
  modelVersion: string;
  generatedAt: string;
}

export function buildRecipeAiAnalysisDraft(
  meal: MealAnalysisResult,
  modelVersion: string,
  generatedAt = new Date().toISOString()
): RecipeAiAnalysis {
  return {
    recipeId: null,
    summary: meal.quickVerdict || meal.notes,
    suggestedTags: [
      ...(meal.weeknightFriendly ? (["weeknight"] as const) : []),
      ...(meal.comfortMeal ? (["comfort-food"] as const) : [])
    ],
    nutritionEstimate: {
      proteinLevel: meal.proteinLevel,
      fiberLevel: `${meal.fiberScore}/10`,
      satietyLevel: meal.satietyLevel,
      bloodSugarImpact: meal.bloodSugarImpact,
      confidence: "medium",
      notes: meal.whyThisHelps
    },
    substitutionIdeas: [meal.minimalChangeVersion, meal.supportiveVersion].filter(
      Boolean
    ),
    canadianGroceryNotes: meal.shoppingAdditions,
    modelVersion,
    generatedAt
  };
}
