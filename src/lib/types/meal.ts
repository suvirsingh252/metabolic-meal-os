export const cuisines = [
  "Indian",
  "Atlantic Canadian",
  "Mediterranean",
  "Korean",
  "Japanese",
  "Chinese",
  "Middle Eastern",
  "North American",
  "Other"
] as const;

export const mealTypes = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Takeout"
] as const;

export const proteinLevels = ["Low", "Moderate", "High"] as const;
export const satietyLevels = ["Low", "Moderate", "High"] as const;
export const bloodSugarImpacts = ["Low", "Moderate", "High"] as const;
export const effortLevels = [
  "Very Easy",
  "Easy",
  "Moderate",
  "Project Meal"
] as const;

export type Cuisine = (typeof cuisines)[number];
export type MealType = (typeof mealTypes)[number];
export type ProteinLevel = (typeof proteinLevels)[number];
export type SatietyLevel = (typeof satietyLevels)[number];
export type BloodSugarImpact = (typeof bloodSugarImpacts)[number];
export type EffortLevel = (typeof effortLevels)[number];

export interface MealGuidanceBasis {
  sourceId: string;
  principleId: string;
  relevance: string;
}

export interface MealAnalysisRequest {
  recipeText: string;
  sourceType?: "manual" | "url" | "ai" | "family";
  sourceUrl?: string | null;
  sourceName?: string | null;
}

export interface MealAnalysisResult {
  mealName: string;
  cuisine: Cuisine;
  mealType: MealType;
  proteinLevel: ProteinLevel;
  satietyLevel: SatietyLevel;
  bloodSugarImpact: BloodSugarImpact;
  effortLevel: EffortLevel;
  familyApproved: boolean;
  weeknightFriendly: boolean;
  comfortMeal: boolean;
  optimizedVersion: string;
  notes: string;
  ingredientSuggestions: string[];
  feedbackPrompt: string;

  // Analysis Framework v2
  metabolicScore: number;
  proteinScore: number;
  fiberScore: number;
  satietyScoreNumeric: number;
  bloodSugarRiskScore: number;

  quickVerdict: string;
  mainConcerns: string[];
  minimalChangeVersion: string;
  supportiveVersion: string;
  plateStrategy: string;
  whyThisHelps: string;
  culturalNotes: string;
  shoppingAdditions: string[];
  prepNotes: string[];
  mealPairings: string[];
  cautions: string[];

  // Evidence-Aware Analysis v3
  evidenceNotes: string[];
  confidenceNotes: string[];
  safetyDisclaimer: string;
  guidanceBasis: MealGuidanceBasis[];

  // Recipe source tracking foundation. Optional for backward compatibility.
  sourceType?: "manual" | "url" | "ai" | "family";
  sourceUrl?: string | null;
  sourceName?: string | null;
  importedAt?: string | null;
  lastParsedAt?: string | null;
  parserVersion?: string | null;
}
