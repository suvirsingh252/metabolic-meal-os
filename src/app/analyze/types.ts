import type { MealAnalysisResult } from "@/src/lib/types/meal";
import type {
  MealOptimizationResult,
  OptimizationType
} from "@/src/lib/ai/meal-optimization/v1/types";
import type { SourceClassification } from "@/src/lib/intake/source-classifier";

export type { MealOptimizationResult, OptimizationType };

export type EditableTextField =
  | "mealName"
  | "optimizedVersion"
  | "notes"
  | "feedbackPrompt"
  | "quickVerdict"
  | "minimalChangeVersion"
  | "supportiveVersion"
  | "plateStrategy"
  | "whyThisHelps"
  | "culturalNotes"
  | "safetyDisclaimer";

export type EditableScoreField =
  | "metabolicScore"
  | "proteinScore"
  | "fiberScore"
  | "satietyScoreNumeric"
  | "bloodSugarRiskScore";

export type EditableBooleanField =
  | "familyApproved"
  | "weeknightFriendly"
  | "comfortMeal";

export type EditableArrayField =
  | "mainConcerns"
  | "shoppingAdditions"
  | "prepNotes"
  | "mealPairings"
  | "cautions"
  | "evidenceNotes"
  | "confidenceNotes";

export interface SaveMealResponse {
  success: true;
  mealId: string;
  mealDetailPath: string;
  notionPageId: string;
  notionUrl: string;
}

export interface SaveIngredientsResponse {
  success: true;
  createdCount: number;
  skippedCount: number;
  duplicateCount?: number;
  relatedCount?: number;
  malformedCount: number;
  relationWarning?: string;
}

export type IngredientPersistenceStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "empty" }
  | {
      state: "success";
      createdCount: number;
      skippedCount: number;
      duplicateCount?: number;
      relatedCount?: number;
      malformedCount: number;
      relationWarning?: string;
    }
  | { state: "skipped" }
  | { state: "failed"; message: string };

export type OptimizationState =
  | { status: "loading" }
  | { status: "success"; result: MealOptimizationResult }
  | { status: "error" };

export interface AnalyzeState {
  recipeText: string;
  socialFallback:
    | {
        sourceUrl: string;
        sourceType: SourceClassification;
      }
    | null;
  analysis: MealAnalysisResult | null;
  ingredientText: string;
  mainConcernsText: string;
  shoppingAdditionsText: string;
  prepNotesText: string;
  mealPairingsText: string;
  cautionsText: string;
  evidenceNotesText: string;
  confidenceNotesText: string;
  guidanceBasisText: string;
  error: string | null;
  saveError: string | null;
  savedMeal: SaveMealResponse | null;
  ingredientPersistence: IngredientPersistenceStatus;
  isLoading: boolean;
  isSaving: boolean;
  optimizations: Partial<Record<OptimizationType, OptimizationState>>;
}
