import type { MealFeedbackSummary } from "@/src/lib/domain/feedback";
import type { MealIntelligence } from "@/src/lib/domain/meal-intelligence";

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
  imageUrl?: string | null;
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
  proteinLevel?: string | null;
  satietyLevel?: string | null;
  bloodSugarImpact?: string | null;
  effortLevel?: string | null;
  notes?: string | null;
  ingredientsText?: string | null;
  instructionsText?: string | null;
  metabolicScore?: number | null;
  proteinScore?: number | null;
  fiberScore?: number | null;
  satietyScoreNumeric?: number | null;
  bloodSugarRiskScore?: number | null;
  intelligence?: MealIntelligence;
}

export interface RecommendationScoreBreakdown {
  preferenceScore: number;
  recencyScore: number;
  varietyPenalty: number;
  schedulingScore: number;
  intelligenceScore: number;
  feedbackAdjustment: number;
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
