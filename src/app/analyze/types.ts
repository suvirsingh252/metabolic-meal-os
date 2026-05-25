import type { MealAnalysisResult } from "@/src/lib/types/meal";

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

export interface AnalyzeState {
  recipeText: string;
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
}
