export type NutritionMetric =
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "fiber"
  | "sodium"
  | "sugar";

export type NutritionTotals = Record<NutritionMetric, number | null>;

export interface NutritionTargets {
  calories: number;
  protein: number;
  fiber: number;
  sodium: number;
}

export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: 2200,
  protein: 140,
  fiber: 30,
  sodium: 2300
};

export interface AnalyticsMeal {
  id: string;
  name: string;
  loggedAt: string;
  url?: string | null;
  mealType?: string | null;
  confidence?: string | null;
  source?: string | null;
  provenance?: string | null;
  ingredientCount?: number | null;
  minimallyProcessedSignal?: "high" | "moderate" | "low" | "unknown" | null;
  qualityScore?: number | null;
  qualitySignals?: {
    metabolicScore: number;
    proteinScore: number;
    fiberScore: number;
    energyDensityScore?: number | null;
    processingScore?: number | null;
    satietyScoreNumeric: number;
    bloodSugarRiskScore: number;
  } | null;
  nutrition: Partial<NutritionTotals>;
}

export interface DashboardMealSummary {
  id: string;
  name: string;
  loggedAt: string;
  calories: number | null;
  protein: number | null;
  confidence: string | null;
  provenance: string | null;
  qualityScore: number | null;
  qualityLabel: "high" | "moderate" | "low" | "unknown";
  url: string | null;
}

export interface NutritionProgress {
  caloriesPct: number | null;
  proteinPct: number | null;
  fiberPct: number | null;
}

export interface NutritionCompletenessSummary {
  knownMeals: number;
  totalMeals: number;
  label: string;
}

export type NutritionCompleteness = Record<
  NutritionMetric,
  NutritionCompletenessSummary
>;

export interface QualitySampleSummary {
  scoredMeals: number;
  totalMeals: number;
  isEnoughData: boolean;
  label: string;
}

export interface NutritionSourceMix {
  structured: number;
  estimated: number;
  reviewed: number;
  userEntered: number;
  backfilled: number;
  missingNutrition: number;
}

export type TrendLabel = "low" | "moderate" | "high" | "unknown";

export interface DashboardInsight {
  id: string;
  severity: "positive" | "info" | "warning";
  title: string;
  message: string;
  action?: string;
  metric?: string;
}

export interface DashboardViewModel {
  generatedAt: string;
  today: {
    date: string;
    mealCount: number;
    totals: NutritionTotals;
    targets: NutritionTargets;
    progress: NutritionProgress;
    averageQualityScore: number | null;
    nutritionCompleteness: NutritionCompleteness;
    qualitySample: QualitySampleSummary;
    sourceMix: NutritionSourceMix;
  };
  week: {
    startDate: string;
    endDate: string;
    mealCount: number;
    dailyAverages: NutritionTotals;
    totals: NutritionTotals;
    trends: {
      proteinConsistency: TrendLabel;
      fiberConsistency: TrendLabel;
      calorieVariance: TrendLabel;
    };
    averageQualityScore: number | null;
    nutritionCompleteness: NutritionCompleteness;
    qualitySample: QualitySampleSummary;
    sourceMix: NutritionSourceMix;
  };
  insights: DashboardInsight[];
  recentMeals: DashboardMealSummary[];
  quality: {
    bestRecentMeal: DashboardMealSummary | null;
    highestOpportunityMeal: DashboardMealSummary | null;
  };
}
