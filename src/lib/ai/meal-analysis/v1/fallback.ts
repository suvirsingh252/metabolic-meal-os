import { NextResponse } from "next/server";
import { RecipeParserError } from "@/src/lib/integrations/recipe-parser";

export function mealAnalysisErrorResponse(error: unknown) {
  if (error instanceof RecipeParserError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("Meal analysis API failure", error);

  return NextResponse.json(
    { error: "Unable to analyze meal right now." },
    { status: 500 }
  );
}
