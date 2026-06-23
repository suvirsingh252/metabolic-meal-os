export const recipeSourceTypes = ["manual", "url", "ai", "family"] as const;
export const recipeSourceClassifications = [
  "recipe-page",
  "social-video",
  "video-page",
  "short-link",
  "unknown-url",
  "manual-text",
  "tiktok",
  "instagram",
  "youtube",
  "pinterest",
  "facebook",
  "unknown-social",
  "plain-text"
] as const;
export const manualParserVersion = "manual-v1";
export const urlParserVersion = "recipe-parser-shared-url-v2";

export const recipeExtractionMethods = [
  "jsonld",
  "html",
  "manual",
  "social_caption",
  "ai_reconstructed"
] as const;

export const recipeExtractionConfidences = [
  "full_recipe",
  "partial_recipe",
  "estimated_description"
] as const;

export const operationalRecipeTags = [
  "weeknight",
  "cheap",
  "freezer-friendly",
  "leftovers",
  "no-oven",
  "one-pot",
  "high-protein",
  "low-cleanup",
  "summer",
  "comfort-food",
  "meal-prep",
  "pantry-heavy"
] as const;

export type RecipeSourceType = (typeof recipeSourceTypes)[number];
export type RecipeSourceClassification =
  (typeof recipeSourceClassifications)[number];
export type OperationalRecipeTag = (typeof operationalRecipeTags)[number];
export type RecipeExtractionMethod = (typeof recipeExtractionMethods)[number];
export type RecipeExtractionConfidence =
  (typeof recipeExtractionConfidences)[number];

export interface RecipeSourceMetadata {
  sourceType: RecipeSourceType;
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourceClassification?: RecipeSourceClassification | null;
  sourceNotes?: string[] | null;
  importedAt?: string | null;
  lastParsedAt?: string | null;
  parserVersion?: string | null;
}

export interface RecipeIngredient {
  rawText: string;
  name?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  preparation?: string | null;
  optional?: boolean;
  category?: string | null;
}

export interface RecipeRecord {
  id?: string;
  name: string;
  source: RecipeSourceMetadata;
  ingredients: RecipeIngredient[];
  operationalTags?: OperationalRecipeTag[];
}

export interface RecipeNutritionFacts {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  sugar: number | null;
  confidence: "high" | "medium" | "low";
  provenance: string;
}

export interface CanonicalRecipe {
  title: string | null;
  servings: string | null;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: string | null;
  cookTime: string | null;
  sourceUrl: string | null;
  extractionMethod: RecipeExtractionMethod;
  confidence: RecipeExtractionConfidence;
  nutrition?: RecipeNutritionFacts | null;
  description?: string | null;
}

export const defaultManualRecipeSource: RecipeSourceMetadata = {
  sourceType: "manual",
  sourceUrl: null,
  sourceName: null,
  importedAt: null,
  lastParsedAt: null,
  parserVersion: manualParserVersion
};
