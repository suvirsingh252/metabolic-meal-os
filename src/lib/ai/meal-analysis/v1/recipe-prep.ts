import {
  basicRecipeParserAdapter,
  formatParsedRecipeForAnalysis,
  isProbablyUrl
} from "@/src/lib/integrations/recipe-parser";
import type { MealAnalysisRequest } from "@/src/lib/types/meal";
import {
  defaultManualRecipeSource,
  manualParserVersion
} from "@/src/lib/types/recipe";

export async function prepareRecipeForMealAnalysis(
  request: MealAnalysisRequest
) {
  if (isProbablyUrl(request.recipeText)) {
    const parsedRecipe = await basicRecipeParserAdapter.parseFromUrl(
      request.recipeText
    );

    return {
      analysisText: formatParsedRecipeForAnalysis(parsedRecipe),
      sourceType: parsedRecipe.source.sourceType,
      sourceUrl: parsedRecipe.source.sourceUrl ?? null,
      sourceName: parsedRecipe.source.sourceName ?? null,
      sourceClassification: parsedRecipe.source.sourceClassification ?? null,
      sourceNotes: parsedRecipe.source.sourceNotes ?? null,
      importedAt: parsedRecipe.source.importedAt ?? new Date().toISOString(),
      lastParsedAt: parsedRecipe.source.lastParsedAt ?? new Date().toISOString(),
      parserVersion: parsedRecipe.source.parserVersion ?? null,
      nutritionEstimate: parsedRecipe.nutrition
        ? {
            totals: {
              calories: parsedRecipe.nutrition.calories,
              protein: parsedRecipe.nutrition.protein,
              carbs: parsedRecipe.nutrition.carbs,
              fat: parsedRecipe.nutrition.fat,
              fiber: parsedRecipe.nutrition.fiber,
              sodium: parsedRecipe.nutrition.sodium,
              sugar: parsedRecipe.nutrition.sugar
            },
            confidence: parsedRecipe.nutrition.confidence,
            provenance: parsedRecipe.nutrition.provenance,
            source: "recipe-json-ld" as const
          }
        : null
    };
  }

  return {
    analysisText: request.recipeText,
    sourceType: request.sourceType ?? defaultManualRecipeSource.sourceType,
    sourceUrl: request.sourceUrl ?? null,
    sourceName: request.sourceName ?? null,
    sourceClassification: "manual-text" as const,
    sourceNotes: null,
    importedAt: new Date().toISOString(),
    lastParsedAt: null,
    parserVersion: request.sourceType === "url" ? null : manualParserVersion,
    nutritionEstimate: null
  };
}
