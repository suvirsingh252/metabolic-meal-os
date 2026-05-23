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
}
