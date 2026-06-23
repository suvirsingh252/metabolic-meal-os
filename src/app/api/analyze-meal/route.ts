import { NextResponse } from "next/server";
import { analyzeMeal } from "@/src/lib/ai/meal-analysis/v1/service";
import { mealAnalysisErrorResponse } from "@/src/lib/ai/meal-analysis/v1/fallback";
import { validateMealAnalysisRequest } from "@/src/lib/ai/meal-analysis/v1/request";
import { RecipeParserError } from "@/src/lib/integrations/recipe-parser";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";
import type { MealAnalysisRequest, MealAnalysisResult } from "@/src/lib/types/meal";

export const runtime = "nodejs";

function readAnalyzeAttemptDomain(request: MealAnalysisRequest) {
  const candidate = request.sourceUrl ?? request.recipeText.split(/\s+/)[0];

  try {
    return new URL(candidate).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function readAnalyzeAttemptSourceType(request: MealAnalysisRequest) {
  if (request.sourceType && request.sourceType !== "manual") {
    return request.sourceType;
  }

  return readAnalyzeAttemptDomain(request) ? "url" : "manual";
}

function logAnalyzeAttempt(input: {
  request: MealAnalysisRequest;
  success: boolean;
  failureReason?: string | null;
  result?: MealAnalysisResult | null;
}) {
  console.info("Analyze meal attempt", {
    sourceType: readAnalyzeAttemptSourceType(input.request),
    sourceClassification: input.request.sourceClassification ?? null,
    domain: readAnalyzeAttemptDomain(input.request),
    success: input.success,
    failureReason: input.failureReason ?? null,
    extractionMethod: input.result?.extractionMethod ?? null,
    confidence: input.result?.extractionConfidence ?? null
  });
}

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
    logAnalyzeAttempt({
      request: validatedRequest,
      success: true,
      result
    });

    return NextResponse.json(result);
  } catch (error) {
    logAnalyzeAttempt({
      request: validatedRequest,
      success: false,
      failureReason:
        error instanceof RecipeParserError ? error.reason : "fetch_failed"
    });
    return mealAnalysisErrorResponse(error);
  }
}
