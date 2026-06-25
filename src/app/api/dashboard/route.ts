import { NextResponse } from "next/server";
import { buildDashboardViewModel, type AnalyticsMeal } from "@/src/lib/domain/analytics";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

function mapMealSummaryToAnalyticsMeal(meal: MealSummary): AnalyticsMeal {
  return {
    id: meal.id,
    name: meal.mealName,
    loggedAt: meal.createdAt,
    url: meal.url,
    imageUrl: meal.imageUrl,
    mealType: meal.mealType,
    confidence: meal.nutritionConfidence,
    source: meal.nutritionSource,
    provenance: meal.nutritionProvenance,
    qualityScore: meal.qualityScore,
    qualitySignals:
      meal.metabolicScore !== null &&
      meal.proteinScore !== null &&
      meal.fiberScore !== null &&
      meal.satietyScoreNumeric !== null &&
      meal.bloodSugarRiskScore !== null
        ? {
            metabolicScore: meal.metabolicScore,
            proteinScore: meal.proteinScore,
            fiberScore: meal.fiberScore,
            energyDensityScore: meal.energyDensityScore,
            processingScore: meal.processingScore,
            satietyScoreNumeric: meal.satietyScoreNumeric,
            bloodSugarRiskScore: meal.bloodSugarRiskScore
          }
        : null,
    nutrition: {
      calories: meal.calories,
      protein: meal.proteinG,
      carbs: meal.carbohydratesG,
      fat: meal.fatG,
      fiber: meal.fiberG,
      sodium: meal.sodiumMg,
      sugar: meal.sugarG
    }
  };
}

function readTargets(request: Request) {
  const url = new URL(request.url);

  return {
    calories: readTarget(url, "calories", 2200),
    protein: readTarget(url, "protein", 140),
    fiber: readTarget(url, "fiber", 30),
    sodium: readTarget(url, "sodium", 2300)
  };
}

function readTarget(url: URL, key: string, fallback: number) {
  const value = Number(url.searchParams.get(key));

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "dashboard",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const { meals } = await queryAllMealSummaries();
    const dashboard = buildDashboardViewModel(
      meals.map(mapMealSummaryToAnalyticsMeal),
      { targets: readTargets(request) }
    );

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Dashboard API failure", error);

    return NextResponse.json(
      { error: "Unable to load dashboard intelligence right now." },
      { status: 500 }
    );
  }
}
