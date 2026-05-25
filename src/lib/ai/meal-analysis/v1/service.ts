import OpenAI from "openai";
import { getOpenAIEnv } from "@/src/lib/env";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { mealAnalysisModelConfig } from "@/src/lib/ai/meal-analysis/v1/config";
import {
  formatAnalysisUserPrompt,
  mealAnalysisSystemPrompt
} from "@/src/lib/ai/meal-analysis/v1/prompt";
import { prepareRecipeForMealAnalysis } from "@/src/lib/ai/meal-analysis/v1/recipe-prep";
import { parseMealAnalysisResponse } from "@/src/lib/ai/meal-analysis/v1/response-parser";
import { mealAnalysisJsonSchema } from "@/src/lib/ai/meal-analysis/v1/schema";
import { getKnownIngredientContext } from "@/src/lib/notion/ingredient-context";
import type { MealAnalysisRequest } from "@/src/lib/types/meal";

async function safeGetKnownIngredientContext(analysisText: string) {
  try {
    return await getKnownIngredientContext({
      text: analysisText
    });
  } catch (error) {
    console.warn("Known ingredient context unavailable", error);

    return {
      ingredients: [],
      promptContext: ""
    };
  }
}

export async function analyzeMeal(request: MealAnalysisRequest) {
  const preparedRecipe = await prepareRecipeForMealAnalysis(request);
  const ingredientContext = await safeGetKnownIngredientContext(
    preparedRecipe.analysisText
  );
  const { OPENAI_API_KEY } = getOpenAIEnv();
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await openai.responses.create({
    model: mealAnalysisModelConfig.model,
    input: [
      {
        role: "system",
        content: mealAnalysisSystemPrompt
      },
      {
        role: "user",
        content: formatAnalysisUserPrompt(
          preparedRecipe.analysisText,
          ingredientContext.promptContext
        )
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: mealAnalysisModelConfig.schemaName,
        strict: true,
        schema: mealAnalysisJsonSchema
      }
    }
  });

  const result = parseMealAnalysisResponse(response.output_text);
  const household = getConfiguredHouseholdMetadata();

  return {
    ...result,
    sourceType: preparedRecipe.sourceType,
    sourceUrl: preparedRecipe.sourceUrl,
    sourceName: preparedRecipe.sourceName,
    sourceClassification: preparedRecipe.sourceClassification,
    sourceNotes: preparedRecipe.sourceNotes,
    importedAt: preparedRecipe.importedAt,
    lastParsedAt: preparedRecipe.lastParsedAt,
    parserVersion: preparedRecipe.parserVersion,
    knownIngredientContextUsed: ingredientContext.ingredients.length > 0,
    knownIngredientContextNames: ingredientContext.ingredients.map(
      (ingredient) => ingredient.ingredientName
    ),
    analysisVersion: mealAnalysisModelConfig.analysisVersion,
    analysisModel: mealAnalysisModelConfig.model,
    nutritionEstimate: preparedRecipe.nutritionEstimate,
    householdId: household.householdId,
    createdBy: household.createdBy,
    visibility: household.visibility,
    schemaVersion: household.schemaVersion
  };
}
