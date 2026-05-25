import type { AnalyticsMeal } from "@/src/lib/domain/analytics/types";

export interface MealQualityResult {
  score: number | null;
  label: "high" | "moderate" | "low" | "unknown";
  drivers: string[];
}

export function scoreMealQuality(meal: AnalyticsMeal): MealQualityResult {
  const calories = meal.nutrition.calories;
  const protein = meal.nutrition.protein;
  const fiber = meal.nutrition.fiber;
  const sodium = meal.nutrition.sodium;
  const sugar = meal.nutrition.sugar;

  if (typeof calories === "number" && calories > 0) {
    let score = 50;
    const drivers: string[] = [];
    const proteinPer100Calories =
      typeof protein === "number" ? (protein / calories) * 100 : null;
    const fiberPer100Calories =
      typeof fiber === "number" ? (fiber / calories) * 100 : null;
    const sodiumPer100Calories =
      typeof sodium === "number" ? (sodium / calories) * 100 : null;
    const sugarPer100Calories =
      typeof sugar === "number" ? (sugar / calories) * 100 : null;

    if (proteinPer100Calories !== null) {
      if (proteinPer100Calories >= 5) {
        score += 18;
        drivers.push("protein density");
      } else if (proteinPer100Calories >= 3) {
        score += 8;
      } else {
        score -= 10;
      }
    }

    if (fiberPer100Calories !== null) {
      if (fiberPer100Calories >= 1.5) {
        score += 16;
        drivers.push("fiber density");
      } else if (fiberPer100Calories >= 0.8) {
        score += 7;
      } else {
        score -= 8;
      }
    }

    if (sodiumPer100Calories !== null) {
      if (sodiumPer100Calories > 180) {
        score -= 16;
        drivers.push("sodium load");
      } else if (sodiumPer100Calories < 90) {
        score += 6;
      }
    }

    if (sugarPer100Calories !== null) {
      if (sugarPer100Calories > 4) {
        score -= 10;
        drivers.push("sugar load");
      } else if (sugarPer100Calories <= 2) {
        score += 4;
      }
    }

    score += diversityAdjustment(meal);
    score += wholeFoodAdjustment(meal);

    return normalizeQuality(score, drivers);
  }

  if (meal.qualitySignals) {
    const fallbackScore = Math.round(
      (meal.qualitySignals.metabolicScore +
        meal.qualitySignals.proteinScore +
        meal.qualitySignals.fiberScore +
        meal.qualitySignals.satietyScoreNumeric +
        (11 - meal.qualitySignals.bloodSugarRiskScore)) *
        2
    );

    return normalizeQuality(fallbackScore, ["analysis score backfill"]);
  }

  return {
    score: null,
    label: "unknown",
    drivers: []
  };
}

function diversityAdjustment(meal: AnalyticsMeal) {
  const count = meal.ingredientCount ?? 0;

  if (count >= 8) return 8;
  if (count >= 5) return 4;
  if (count > 0 && count <= 2) return -4;
  return 0;
}

function wholeFoodAdjustment(meal: AnalyticsMeal) {
  if (meal.minimallyProcessedSignal === "high") return 6;
  if (meal.minimallyProcessedSignal === "low") return -6;
  return 0;
}

function normalizeQuality(score: number, drivers: string[]): MealQualityResult {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: normalized,
    label:
      normalized >= 75 ? "high" : normalized >= 50 ? "moderate" : "low",
    drivers
  };
}
