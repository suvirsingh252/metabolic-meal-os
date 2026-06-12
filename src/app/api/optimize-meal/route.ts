import { NextResponse } from "next/server";
import { optimizeMeal } from "@/src/lib/ai/meal-optimization/v1/service";
import { optimizationTypes } from "@/src/lib/ai/meal-optimization/v1/types";
import type { OptimizationType } from "@/src/lib/ai/meal-optimization/v1/types";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

export const runtime = "nodejs";

function isValidOptimizationType(value: unknown): value is OptimizationType {
  return typeof value === "string" && (optimizationTypes as string[]).includes(value);
}

function hasRequiredAnalysisFields(value: unknown): value is MealAnalysisResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).mealName === "string" &&
    (value as Record<string, unknown>).mealName !== ""
  );
}

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "optimize-meal",
    rateLimit: 6
  });

  if (guardResponse) {
    return guardResponse;
  }

  const body = await readJsonWithLimit(request, 40_000);

  if (body instanceof NextResponse) {
    return body;
  }

  const { analysis, optimizationType } = body as Record<string, unknown>;

  if (!hasRequiredAnalysisFields(analysis)) {
    return NextResponse.json(
      { error: "A valid meal analysis is required." },
      { status: 400 }
    );
  }

  if (!isValidOptimizationType(optimizationType)) {
    return NextResponse.json(
      { error: `optimizationType must be one of: ${optimizationTypes.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const result = await optimizeMeal({ analysis, optimizationType });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Meal optimization API failure", error);

    return NextResponse.json(
      { error: "Unable to generate optimization right now." },
      { status: 500 }
    );
  }
}
