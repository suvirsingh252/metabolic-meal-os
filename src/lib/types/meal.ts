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

export interface MealKnownIngredientContext {
  ingredientName: string;
  matchConfidence?: "high" | "medium" | "low";
  matchReason?: string;
  proteinSource?: boolean;
  fiberSource?: boolean;
  staple?: boolean;
  householdFavorite?: boolean;
  nutrientConfidence?: string | null;
  fdcDescription?: string | null;
  proteinG?: number | null;
  fiberG?: number | null;
  carbohydratesG?: number | null;
  energyKcal?: number | null;
}

export interface MealNutritionTotals {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  sugar: number | null;
}

export interface MealNutritionEstimate {
  totals: MealNutritionTotals;
  confidence: "high" | "medium" | "low";
  provenance: string;
  source: "recipe-json-ld" | "user-entered" | "notion-backfill" | "estimated";
}

export type MealSourceClassification =
  | "recipe-page"
  | "social-video"
  | "video-page"
  | "short-link"
  | "unknown-url"
  | "manual-text";

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
  sourceClassification?: MealSourceClassification | null;
  sourceNotes?: string[] | null;
  importedAt?: string | null;
  lastParsedAt?: string | null;
  parserVersion?: string | null;

  // Runtime analysis metadata. Optional and not required for Notion persistence.
  knownIngredientContextUsed?: boolean;
  knownIngredientContextNames?: string[];
  analysisVersion?: string;
  analysisModel?: string;

  nutritionEstimate?: MealNutritionEstimate | null;

  householdId?: string;
  createdBy?: string;
  visibility?: "private" | "household";
  schemaVersion?: string;
}
