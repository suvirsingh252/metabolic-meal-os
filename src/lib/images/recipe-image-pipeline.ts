import OpenAI from "openai";
import type { MealImageMetadata } from "@/src/lib/types/meal";
import type { RecipeIngredient } from "@/src/lib/types/recipe";
import {
  copyExternalRecipeImage,
  storeGeneratedRecipeImage
} from "@/src/lib/images/recipe-image-storage";

export const placeholderMealImage: MealImageMetadata = {
  imageUrl: null,
  imageSource: "placeholder",
  imageOriginalUrl: null,
  imagePrompt: null,
  imageAttribution: null,
  imageStatus: "placeholder",
  imageLastUpdated: null
};

export interface RecipeImageContext {
  title?: string | null;
  cuisine?: string | null;
  ingredients?: RecipeIngredient[];
  instructions?: string[];
  dietaryTags?: string[];
  platingContext?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  originalImageUrl?: string | null;
}

export function buildRecipeImagePrompt(context: RecipeImageContext) {
  const ingredientText = (context.ingredients ?? [])
    .slice(0, 14)
    .map((ingredient) => ingredient.name ?? ingredient.rawText)
    .filter(Boolean)
    .join(", ");
  const methodText = (context.instructions ?? [])
    .slice(0, 3)
    .join(" ")
    .slice(0, 600);
  const dietaryText = (context.dietaryTags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");

  return [
    "Professional cookbook photography of a realistic finished dish.",
    context.title ? `Dish: ${context.title}.` : null,
    context.cuisine ? `Cuisine/style: ${context.cuisine}.` : null,
    ingredientText ? `Visible ingredients to suggest: ${ingredientText}.` : null,
    methodText ? `Cooking method clues: ${methodText}.` : null,
    dietaryText ? `Dietary/context tags: ${dietaryText}.` : null,
    context.platingContext
      ? `Plating context: ${context.platingContext}.`
      : "Plated as a home-cookable family meal, not restaurant fantasy styling.",
    "Natural window light, appetizing plated final dish, realistic texture, shallow depth of field.",
    "No text, no labels, no hands, no people, no watermarks, no logos."
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPendingRecipeImageMetadata(
  context: RecipeImageContext
): MealImageMetadata {
  const prompt = buildRecipeImagePrompt(context);

  if (context.originalImageUrl) {
    return {
      imageUrl: null,
      imageSource: "original",
      imageOriginalUrl: context.originalImageUrl,
      imagePrompt: prompt,
      imageAttribution:
        context.sourceName ?? context.sourceUrl ?? context.originalImageUrl,
      imageStatus: "pending",
      imageLastUpdated: new Date().toISOString()
    };
  }

  return {
    imageUrl: null,
    imageSource: "ai",
    imageOriginalUrl: null,
    imagePrompt: prompt,
    imageAttribution: "AI-generated image pending",
    imageStatus: "pending",
    imageLastUpdated: new Date().toISOString()
  };
}

export async function buildOriginalRecipeImageMetadata(
  context: RecipeImageContext
): Promise<MealImageMetadata | null> {
  if (!context.originalImageUrl) {
    return null;
  }

  try {
    const stored = await copyExternalRecipeImage(context.originalImageUrl);

    if (!stored) {
      return null;
    }

    return {
      imageUrl: stored.url,
      imageSource: "original",
      imageOriginalUrl: context.originalImageUrl,
      imagePrompt: null,
      imageAttribution:
        context.sourceName ?? context.sourceUrl ?? context.originalImageUrl,
      imageStatus: "ready",
      imageLastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.warn("Original recipe image copy failed", error);
    return null;
  }
}

export async function buildAiRecipeImageMetadata(
  context: RecipeImageContext
): Promise<MealImageMetadata> {
  const prompt = buildRecipeImagePrompt(context);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      ...placeholderMealImage,
      imageSource: "ai",
      imagePrompt: prompt,
      imageStatus: "failed",
      imageLastUpdated: new Date().toISOString()
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });
    const b64 = response.data?.[0]?.b64_json;

    if (!b64) {
      throw new Error("OpenAI image response did not include b64_json.");
    }

    const stored = await storeGeneratedRecipeImage(
      new Uint8Array(Buffer.from(b64, "base64")),
      "image/png"
    );

    return {
      imageUrl: stored.url,
      imageSource: "ai",
      imageOriginalUrl: null,
      imagePrompt: prompt,
      imageAttribution: "AI-generated image",
      imageStatus: "ready",
      imageLastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.warn("AI recipe image generation failed", error);

    return {
      ...placeholderMealImage,
      imageSource: "ai",
      imagePrompt: prompt,
      imageStatus: "failed",
      imageLastUpdated: new Date().toISOString()
    };
  }
}

export async function buildRecipeImageMetadata(
  context: RecipeImageContext
): Promise<MealImageMetadata> {
  const original = await buildOriginalRecipeImageMetadata(context);

  if (original) {
    return original;
  }

  return buildAiRecipeImageMetadata(context);
}
