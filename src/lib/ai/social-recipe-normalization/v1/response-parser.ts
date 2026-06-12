import {
  socialRecipeConfidenceLevels,
  type SocialRecipeCandidate
} from "@/src/lib/ai/social-recipe-normalization/v1/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanStringArray(value: unknown, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanString(item))
    .filter(Boolean)
    .slice(0, maxLength);
}

export function validateSocialRecipeCandidate(
  value: unknown
): SocialRecipeCandidate {
  if (!isRecord(value)) {
    throw new Error("Social recipe normalization response must be an object.");
  }

  const title = cleanString(value.title, "Untitled social recipe");
  const confidence = socialRecipeConfidenceLevels.includes(
    value.confidence as SocialRecipeCandidate["confidence"]
  )
    ? (value.confidence as SocialRecipeCandidate["confidence"])
    : "low";
  const ingredients = cleanStringArray(value.ingredients, 80);
  const steps = cleanStringArray(value.steps, 50);
  const servings = cleanString(value.servings) || null;
  const assumptions = cleanStringArray(value.assumptions, 20);
  const missingDetails = cleanStringArray(value.missingDetails, 20);

  if (ingredients.length === 0 && steps.length === 0) {
    throw new Error(
      "Social recipe normalization needs at least ingredients or steps."
    );
  }

  return {
    title,
    ingredients,
    steps,
    servings,
    confidence,
    assumptions,
    missingDetails
  };
}

export function parseSocialRecipeNormalizationResponse(
  outputText: string
): SocialRecipeCandidate {
  return validateSocialRecipeCandidate(JSON.parse(outputText));
}

