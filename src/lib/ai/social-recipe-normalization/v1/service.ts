import OpenAI from "openai";
import { getOpenAIEnv } from "@/src/lib/env";
import {
  formatSocialRecipeNormalizationPrompt,
  socialRecipeNormalizationSystemPrompt
} from "@/src/lib/ai/social-recipe-normalization/v1/prompt";
import { parseSocialRecipeNormalizationResponse } from "@/src/lib/ai/social-recipe-normalization/v1/response-parser";
import { socialRecipeNormalizationJsonSchema } from "@/src/lib/ai/social-recipe-normalization/v1/schema";
import type {
  SocialRecipeCandidate,
  SocialRecipeNormalizationRequest
} from "@/src/lib/ai/social-recipe-normalization/v1/types";

const socialRecipeNormalizationConfig = {
  model: "gpt-4.1-mini",
  schemaName: "social_recipe_normalization_v1"
};

export async function normalizeSocialRecipeText(
  request: SocialRecipeNormalizationRequest
): Promise<SocialRecipeCandidate> {
  const { OPENAI_API_KEY } = getOpenAIEnv();
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: socialRecipeNormalizationConfig.model,
    input: [
      {
        role: "system",
        content: socialRecipeNormalizationSystemPrompt
      },
      {
        role: "user",
        content: formatSocialRecipeNormalizationPrompt(request)
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: socialRecipeNormalizationConfig.schemaName,
        strict: true,
        schema: socialRecipeNormalizationJsonSchema
      }
    }
  });

  return parseSocialRecipeNormalizationResponse(response.output_text);
}
