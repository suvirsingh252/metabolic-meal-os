import { NextResponse } from "next/server";
import { analyzeMeal } from "@/src/lib/ai/meal-analysis/v1/service";
import { mealAnalysisErrorResponse } from "@/src/lib/ai/meal-analysis/v1/fallback";
import { validateMealAnalysisRequest } from "@/src/lib/ai/meal-analysis/v1/request";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "analyze-meal",
    rateLimit: 12
  });

  if (guardResponse) {
    return guardResponse;
  }

  const body = await readJsonWithLimit(request, 80_000);

  if (body instanceof NextResponse) {
    return body;
  }

  const validatedRequest = validateMealAnalysisRequest(body);

  if (validatedRequest instanceof NextResponse) {
    return validatedRequest;
  }

  try {
    const result = await analyzeMeal(validatedRequest);

    return NextResponse.json(result);
  } catch (error) {
    return mealAnalysisErrorResponse(error);
  }
}
