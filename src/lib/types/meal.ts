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

export interface MealAnalysisRequest {
  recipeText: string;
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
}
