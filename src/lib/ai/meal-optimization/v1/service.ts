import OpenAI from "openai";
import { getOpenAIEnv } from "@/src/lib/env";
import { mealOptimizationModelConfig } from "@/src/lib/ai/meal-optimization/v1/config";
import {
  formatOptimizationUserPrompt,
  mealOptimizationSystemPrompt
} from "@/src/lib/ai/meal-optimization/v1/prompt";
import { parseOptimizationResponse } from "@/src/lib/ai/meal-optimization/v1/response-parser";
import { mealOptimizationJsonSchema } from "@/src/lib/ai/meal-optimization/v1/schema";
import type { MealOptimizationResult, OptimizationType } from "@/src/lib/ai/meal-optimization/v1/types";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

export interface MealOptimizationRequest {
  analysis: MealAnalysisResult;
  optimizationType: OptimizationType;
}

export async function optimizeMeal(
  request: MealOptimizationRequest
): Promise<MealOptimizationResult> {
  const { OPENAI_API_KEY } = getOpenAIEnv();
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await openai.responses.create({
    model: mealOptimizationModelConfig.model,
    input: [
      {
        role: "system",
        content: mealOptimizationSystemPrompt
      },
      {
        role: "user",
        content: formatOptimizationUserPrompt(request.analysis, request.optimizationType)
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: mealOptimizationModelConfig.schemaName,
        strict: true,
        schema: mealOptimizationJsonSchema
      }
    }
  });

  return parseOptimizationResponse(response.output_text);
}
