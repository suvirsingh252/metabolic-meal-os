export const energyAfterOptions = [
  "Crash",
  "Neutral",
  "Steady",
  "Excellent"
] as const;

export const hungerLaterOptions = [
  "Very Hungry",
  "Moderate",
  "Satisfied",
  "Very Full"
] as const;

export type EnergyAfter = (typeof energyAfterOptions)[number];
export type HungerLater = (typeof hungerLaterOptions)[number];

export interface MealFeedbackRequest {
  feedbackEntry: string;
  selectedMealId?: string | null;
  energyAfter: EnergyAfter;
  hungerLater: HungerLater;
  cravingsLater: boolean;
  wouldRepeat: boolean;
  notes: string;
}

export interface MealFeedbackResult {
  success: true;
  notionPageId: string;
  notionUrl: string;
  warning?: string;
}

export type DifficultyActual = "Easier Than Expected" | "As Expected" | "Harder Than Expected";
export type CleanupLevel = "Low" | "Moderate" | "High";

export interface HouseholdRecipeFeedback {
  recipeId?: string | null;
  rating?: number | null;
  wouldMakeAgain: boolean;
  difficultyActual?: DifficultyActual | null;
  cleanupLevel?: CleanupLevel | null;
  tooSpicy?: boolean;
  tooHeavy?: boolean;
  notes?: string;
  modifications?: string[];
}
