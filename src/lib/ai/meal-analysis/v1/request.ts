import { NextResponse } from "next/server";
import {
  defaultManualRecipeSource,
  recipeSourceTypes,
  recipeSourceClassifications,
  type RecipeSourceClassification,
  type RecipeSourceType
} from "@/src/lib/types/recipe";
import type { MealAnalysisRequest } from "@/src/lib/types/meal";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateMealAnalysisRequest(
  body: unknown
): MealAnalysisRequest | NextResponse {
  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const recipeText = body.recipeText;

  if (typeof recipeText !== "string") {
    return NextResponse.json(
      { error: "recipeText is required and must be a string." },
      { status: 400 }
    );
  }

  const trimmedRecipeText = recipeText.trim();

  if (trimmedRecipeText.length < 10) {
    return NextResponse.json(
      { error: "recipeText must be at least 10 characters." },
      { status: 400 }
    );
  }

  const sourceType: RecipeSourceType =
    typeof body.sourceType === "string" &&
    recipeSourceTypes.includes(body.sourceType as RecipeSourceType)
      ? (body.sourceType as RecipeSourceType)
      : defaultManualRecipeSource.sourceType;
  const sourceClassification: RecipeSourceClassification | null =
    typeof body.sourceClassification === "string" &&
    recipeSourceClassifications.includes(
      body.sourceClassification as RecipeSourceClassification
    )
      ? (body.sourceClassification as RecipeSourceClassification)
      : null;

  return {
    recipeText: trimmedRecipeText,
    sourceType,
    sourceUrl:
      typeof body.sourceUrl === "string" && body.sourceUrl.trim()
        ? body.sourceUrl.trim()
        : null,
    sourceName:
      typeof body.sourceName === "string" && body.sourceName.trim()
        ? body.sourceName.trim()
        : null,
    sourceClassification
  };
}
