import type {
  CanonicalRecipe,
  RecipeExtractionConfidence,
  RecipeExtractionMethod,
  RecipeIngredient
} from "@/src/lib/types/recipe";
import type { SocialRecipeCandidate } from "@/src/lib/ai/social-recipe-normalization/v1/types";

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
  assumptions?: {
    matchedComponents: string[];
    servingSizeAssumptions: string[];
    quantityMultipliers: {
      component: string;
      multiplier: number;
      reason: string;
    }[];
    baseTotals: MealNutritionTotals;
    servingMultiplier: number;
    butterInferred: boolean;
    confidence: "high" | "medium" | "low";
    reviewBeforeSave: string;
  };
}

export const mealImageSources = [
  "manual",
  "original",
  "ai",
  "placeholder"
] as const;

export const mealImageStatuses = [
  "pending",
  "ready",
  "needs_ai",
  "generating",
  "failed",
  "placeholder"
] as const;

export type MealImageSource = (typeof mealImageSources)[number];
export type MealImageStatus = (typeof mealImageStatuses)[number];

export interface MealImageMetadata {
  imageUrl: string | null;
  imageSource: MealImageSource;
  imageOriginalUrl: string | null;
  imagePrompt: string | null;
  imageAttribution: string | null;
  imageStatus: MealImageStatus;
  imageLastUpdated: string | null;
}

export type MealSourceClassification =
  | "recipe-page"
  | "social-video"
  | "video-page"
  | "short-link"
  | "unknown-url"
  | "manual-text"
  | "tiktok"
  | "instagram"
  | "youtube"
  | "pinterest"
  | "facebook"
  | "unknown-social"
  | "plain-text";

export interface MealAnalysisRequest {
  recipeText: string;
  sourceType?: "manual" | "url" | "ai" | "family";
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourceClassification?: MealSourceClassification | null;
}

export type AnalyzeFailureReason =
  | "blocked_url"
  | "fetch_failed"
  | "no_recipe_found"
  | "partial_recipe_found"
  | "social_url"
  | "manual_input_needed";

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

  // Cookbook capture. Source recipe content preserved verbatim so saved meals
  // remain cookable. Optional for backward compatibility with older payloads.
  ingredients?: RecipeIngredient[] | null;
  instructions?: string[] | null;

  // Recipe source tracking foundation. Optional for backward compatibility.
  sourceType?: "manual" | "url" | "ai" | "family";
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourceClassification?: MealSourceClassification | null;
  sourceNotes?: string[] | null;
  importedAt?: string | null;
  lastParsedAt?: string | null;
  parserVersion?: string | null;
  socialRecipeCandidate?: SocialRecipeCandidate | null;
  canonicalRecipe?: CanonicalRecipe | null;
  extractionMethod?: RecipeExtractionMethod | null;
  extractionConfidence?: RecipeExtractionConfidence | null;

  // Runtime analysis metadata. Optional and not required for Notion persistence.
  knownIngredientContextUsed?: boolean;
  knownIngredientContextNames?: string[];
  analysisVersion?: string;
  analysisModel?: string;

  nutritionEstimate?: MealNutritionEstimate | null;

  imageUrl?: string | null;
  imageSource?: MealImageSource | null;
  imageOriginalUrl?: string | null;
  imagePrompt?: string | null;
  imageAttribution?: string | null;
  imageStatus?: MealImageStatus | null;
  imageLastUpdated?: string | null;

  householdId?: string;
  createdBy?: string;
  visibility?: "private" | "household";
  schemaVersion?: string;
}
