import { basicRecipeParserAdapter } from "@/src/lib/integrations/recipe-parser";
import { updateMealImageMetadata } from "@/src/lib/images/meal-image-persistence";
import {
  buildAiRecipeImageMetadata,
  buildOriginalRecipeImageMetadata,
  buildRecipeImagePrompt,
  type RecipeImageContext
} from "@/src/lib/images/recipe-image-pipeline";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { MealImageMetadata } from "@/src/lib/types/meal";
import type { RecipeIngredient } from "@/src/lib/types/recipe";

function parseIngredientLines(meal: MealSummary): RecipeIngredient[] {
  const text = meal.ingredientsText ?? "";

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 60)
    .map((rawText) => ({ rawText }));
}

function parseInstructionLines(meal: MealSummary) {
  const text = meal.instructionsText ?? "";

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function shouldResolveMealImage(meal: MealSummary) {
  if (meal.imageSource === "manual") {
    return false;
  }

  if (meal.imageStatus === "failed") {
    return false;
  }

  if (meal.imageUrl) {
    return false;
  }

  return Boolean(
    meal.imageOriginalUrl ||
      meal.sourceUrl ||
      meal.ingredientsText ||
      meal.instructionsText ||
      meal.notes
  );
}

export function buildRecipeImageContextFromMeal(
  meal: MealSummary,
  originalImageUrl: string | null
): RecipeImageContext {
  return {
    title: meal.mealName,
    cuisine: meal.cuisine,
    ingredients: parseIngredientLines(meal),
    instructions: parseInstructionLines(meal),
    dietaryTags: [
      meal.mealType ?? "",
      meal.proteinLevel ? `${meal.proteinLevel} protein` : "",
      meal.weeknightFriendly ? "weeknight friendly" : "",
      meal.comfortMeal ? "comfort meal" : ""
    ].filter(Boolean),
    platingContext: meal.optimizedVersion ?? meal.notes,
    sourceName: meal.sourceName,
    sourceUrl: meal.sourceUrl,
    originalImageUrl
  };
}

export async function findOriginalImageUrlForMeal(meal: MealSummary) {
  if (meal.imageOriginalUrl) {
    console.info(
      `[recipe-images] Using stored original image candidate for ${meal.id}: ${meal.imageOriginalUrl}`
    );
    return meal.imageOriginalUrl;
  }

  if (!meal.sourceUrl) {
    console.info(
      `[recipe-images] No source URL available for original image lookup: ${meal.id}`
    );
    return null;
  }

  try {
    console.info(
      `[recipe-images] Parsing source URL for original image candidate: ${meal.id}`
    );
    const parsed = await basicRecipeParserAdapter.parseFromUrl(meal.sourceUrl);
    const imageUrl = parsed.image?.url ?? parsed.canonicalRecipe?.image?.url ?? null;

    if (imageUrl) {
      console.info(
        `[recipe-images] Extracted original image candidate for ${meal.id}: ${imageUrl}`
      );
    } else {
      console.info(`[recipe-images] No original image candidate found: ${meal.id}`);
    }

    return imageUrl;
  } catch (error) {
    console.warn(
      `[recipe-images] Original image extraction failed for ${meal.id}`,
      error
    );
    return null;
  }
}

export async function planMealImageResolution(meal: MealSummary) {
  const originalImageUrl = await findOriginalImageUrlForMeal(meal);

  if (originalImageUrl) {
    return {
      strategy: "original" as const,
      originalImageUrl,
      prompt: null
    };
  }

  return {
    strategy: "ai" as const,
    originalImageUrl: null,
    prompt: buildRecipeImagePrompt(buildRecipeImageContextFromMeal(meal, null))
  };
}

export async function resolveMealImageForMeal(
  meal: MealSummary
): Promise<{ metadata: MealImageMetadata; strategy: "original" | "ai" }> {
  const originalImageUrl = await findOriginalImageUrlForMeal(meal);

  if (originalImageUrl) {
    console.info(`[recipe-images] Copying original image for ${meal.id}`);
    const original = await buildOriginalRecipeImageMetadata(
      buildRecipeImageContextFromMeal(meal, originalImageUrl)
    );

    if (original?.imageUrl) {
      console.info(
        `[recipe-images] Stored original image for ${meal.id}: ${original.imageUrl}`
      );
      await updateMealImageMetadata(meal, original);
      return { metadata: original, strategy: "original" };
    }

    console.warn(
      `[recipe-images] Original image copy failed or returned no stored URL for ${meal.id}; falling back to AI.`
    );
  }

  console.info(`[recipe-images] Generating AI fallback image for ${meal.id}`);
  const ai = await buildAiRecipeImageMetadata(
    buildRecipeImageContextFromMeal(meal, null)
  );

  if (ai.imageUrl) {
    console.info(`[recipe-images] Stored AI image for ${meal.id}: ${ai.imageUrl}`);
  } else {
    console.warn(
      `[recipe-images] AI fallback did not produce a stored image for ${meal.id}; status=${ai.imageStatus}.`
    );
  }

  await updateMealImageMetadata(meal, ai);
  return { metadata: ai, strategy: "ai" };
}
