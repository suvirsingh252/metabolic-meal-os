import type { MealFeedbackSummary } from "@/src/lib/domain/feedback";

export type TodayMealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export const todayMealCategories: TodayMealCategory[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack"
];

export interface RecommendationMeal {
  id: string;
  url: string;
  mealName: string;
  createdAt: string;
  cuisine: string | null;
  mealType: string | null;
  familyApproved: boolean;
  weeknightFriendly: boolean;
  comfortMeal: boolean;
  calories: number | null;
  proteinG: number | null;
  carbohydratesG: number | null;
  fatG: number | null;
  fiberG: number | null;
  qualityScore: number | null;
}

export interface RecommendationScoreBreakdown {
  preferenceScore: number;
  recencyScore: number;
  varietyPenalty: number;
  schedulingScore: number;
  totalScore: number;
}

export interface RecommendationExplanation {
  headline: string;
  details: string[];
}

export interface MealRecommendation {
  meal: RecommendationMeal;
  feedbackSummary: MealFeedbackSummary | null;
  category: TodayMealCategory;
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  reasons: string[];
  explanation: RecommendationExplanation;
  confidence: "medium" | "low";
  confidenceNote: string;
}
