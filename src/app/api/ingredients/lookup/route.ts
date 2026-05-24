import { NextResponse } from "next/server";
import { getFoodDataCentralEnv } from "@/src/lib/env";
import {
  FoodDataCentralError,
  mapFoodDataCentralSearchResult,
  searchFoodDataCentral
} from "@/src/lib/integrations/food-data-central";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function validateRequest(body: unknown): string | NextResponse {
  if (!isRecord(body)) {
    return validationError("Request body must be a JSON object.");
  }

  if (typeof body.ingredient !== "string") {
    return validationError("ingredient is required.");
  }

  const ingredient = body.ingredient.trim();

  if (ingredient.length < 2) {
    return validationError("ingredient must be at least 2 characters.");
  }

  if (ingredient.length > 100) {
    return validationError("ingredient must be 100 characters or fewer.");
  }

  return ingredient;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return validationError("Request body must be valid JSON.");
  }

  const ingredient = validateRequest(body);

  if (ingredient instanceof NextResponse) {
    return ingredient;
  }

  try {
    const { FDC_API_KEY } = getFoodDataCentralEnv();
    const foods = await searchFoodDataCentral({
      query: ingredient,
      apiKey: FDC_API_KEY
    });
    const snapshot = mapFoodDataCentralSearchResult(ingredient, foods);

    if (!snapshot) {
      return NextResponse.json(
        { error: "No FoodData Central match found for that ingredient." },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Ingredient lookup API failure", error);

    if (error instanceof FoodDataCentralError) {
      return NextResponse.json(
        { error: "Unable to look up ingredient nutrition right now." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Unable to look up ingredient nutrition right now." },
      { status: 500 }
    );
  }
}
