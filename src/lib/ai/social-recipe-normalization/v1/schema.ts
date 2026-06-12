import { socialRecipeConfidenceLevels } from "@/src/lib/ai/social-recipe-normalization/v1/types";

const stringProperty = { type: "string" } as const;
const stringArrayProperty = {
  type: "array",
  items: stringProperty
} as const;

export const socialRecipeNormalizationRequiredFields = [
  "title",
  "ingredients",
  "steps",
  "servings",
  "confidence",
  "assumptions",
  "missingDetails"
] as const;

export const socialRecipeNormalizationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: stringProperty,
    ingredients: stringArrayProperty,
    steps: stringArrayProperty,
    servings: { type: ["string", "null"] },
    confidence: { type: "string", enum: socialRecipeConfidenceLevels },
    assumptions: stringArrayProperty,
    missingDetails: stringArrayProperty
  },
  required: socialRecipeNormalizationRequiredFields
} as const;

