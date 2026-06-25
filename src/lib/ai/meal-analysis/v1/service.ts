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
import { buildPendingRecipeImageMetadata } from "@/src/lib/images/recipe-image-pipeline";
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

  // Parser-extracted recipe content is canonical (verbatim from the source
  // page); AI extraction fills in for manual/pasted text the parser can't see.
  const ingredients = preparedRecipe.ingredients.length
    ? preparedRecipe.ingredients
    : result.ingredients ?? null;
  const instructions = preparedRecipe.instructions.length
    ? preparedRecipe.instructions
    : result.instructions ?? null;
  const recoveryConfidenceNote =
    preparedRecipe.canonicalRecipe?.confidence === "estimated_description"
      ? "This analysis used partial pasted details or page metadata, so nutrition and recipe conclusions are estimates to review."
      : preparedRecipe.canonicalRecipe?.confidence === "partial_recipe"
        ? "The extracted recipe was partial, so review ingredients, servings, and nutrition before saving."
        : null;
  const confidenceNotes = recoveryConfidenceNote
    ? Array.from(new Set([recoveryConfidenceNote, ...result.confidenceNotes]))
    : result.confidenceNotes;
  const imageMetadata = buildPendingRecipeImageMetadata({
    title: result.mealName,
    cuisine: result.cuisine,
    ingredients: ingredients ?? [],
    instructions: instructions ?? [],
    dietaryTags: [
      result.mealType,
      result.proteinLevel ? `${result.proteinLevel} protein` : "",
      result.weeknightFriendly ? "weeknight friendly" : "",
      result.comfortMeal ? "comfort meal" : ""
    ].filter(Boolean),
    platingContext: result.plateStrategy,
    sourceName: preparedRecipe.sourceName,
    sourceUrl: preparedRecipe.sourceUrl,
    originalImageUrl:
      preparedRecipe.originalImage?.url ??
      preparedRecipe.canonicalRecipe?.image?.url ??
      null
  });

  return {
    ...result,
    confidenceNotes,
    ingredients,
    instructions,
    sourceType: preparedRecipe.sourceType,
    sourceUrl: preparedRecipe.sourceUrl,
    sourceName: preparedRecipe.sourceName,
    sourceClassification: preparedRecipe.sourceClassification,
    sourceNotes: preparedRecipe.sourceNotes,
    importedAt: preparedRecipe.importedAt,
    lastParsedAt: preparedRecipe.lastParsedAt,
    parserVersion: preparedRecipe.parserVersion,
    socialRecipeCandidate: preparedRecipe.socialRecipeCandidate,
    canonicalRecipe: preparedRecipe.canonicalRecipe,
    extractionMethod: preparedRecipe.canonicalRecipe?.extractionMethod ?? null,
    extractionConfidence: preparedRecipe.canonicalRecipe?.confidence ?? null,
    knownIngredientContextUsed: ingredientContext.ingredients.length > 0,
    knownIngredientContextNames: ingredientContext.ingredients.map(
      (ingredient) => ingredient.ingredientName
    ),
    analysisVersion: mealAnalysisModelConfig.analysisVersion,
    analysisModel: mealAnalysisModelConfig.model,
    nutritionEstimate: preparedRecipe.nutritionEstimate,
    imageUrl: imageMetadata.imageUrl,
    imageSource: imageMetadata.imageSource,
    imageOriginalUrl: imageMetadata.imageOriginalUrl,
    imagePrompt: imageMetadata.imagePrompt,
    imageAttribution:
      imageMetadata.imageAttribution ??
      preparedRecipe.originalImage?.attribution ??
      null,
    imageStatus: imageMetadata.imageStatus,
    imageLastUpdated: imageMetadata.imageLastUpdated,
    householdId: household.householdId,
    createdBy: household.createdBy,
    visibility: household.visibility,
    schemaVersion: household.schemaVersion
  };
}
