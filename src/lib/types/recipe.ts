export const recipeSourceTypes = ["manual", "url", "ai", "family"] as const;
export const manualParserVersion = "manual-v1";
export const urlParserVersion = "recipe-parser-basic-v1";

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
export type OperationalRecipeTag = (typeof operationalRecipeTags)[number];

export interface RecipeSourceMetadata {
  sourceType: RecipeSourceType;
  sourceUrl?: string | null;
  sourceName?: string | null;
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

export const defaultManualRecipeSource: RecipeSourceMetadata = {
  sourceType: "manual",
  sourceUrl: null,
  sourceName: null,
  importedAt: null,
  lastParsedAt: null,
  parserVersion: manualParserVersion
};
