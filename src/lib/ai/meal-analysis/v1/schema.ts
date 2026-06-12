import {
  bloodSugarImpacts,
  cuisines,
  effortLevels,
  mealTypes,
  proteinLevels,
  satietyLevels
} from "@/src/lib/types/meal";
import {
  approvedSourceIds,
  healthGuidancePrincipleIds
} from "@/src/lib/ai/meal-analysis/v1/source-context";

export const mealAnalysisRequiredFields = [
  "mealName",
  "cuisine",
  "mealType",
  "proteinLevel",
  "satietyLevel",
  "bloodSugarImpact",
  "effortLevel",
  "familyApproved",
  "weeknightFriendly",
  "comfortMeal",
  "optimizedVersion",
  "notes",
  "ingredientSuggestions",
  "feedbackPrompt",
  "metabolicScore",
  "proteinScore",
  "fiberScore",
  "satietyScoreNumeric",
  "bloodSugarRiskScore",
  "quickVerdict",
  "mainConcerns",
  "minimalChangeVersion",
  "supportiveVersion",
  "plateStrategy",
  "whyThisHelps",
  "culturalNotes",
  "shoppingAdditions",
  "prepNotes",
  "mealPairings",
  "cautions",
  "evidenceNotes",
  "confidenceNotes",
  "safetyDisclaimer",
  "guidanceBasis",
  "extractedIngredients",
  "extractedInstructions"
] as const;

const stringProperty = { type: "string" } as const;
const stringArrayProperty = {
  type: "array",
  items: { type: "string" }
} as const;
const scoreProperty = {
  type: "number",
  minimum: 1,
  maximum: 10
} as const;

export const mealAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mealName: stringProperty,
    cuisine: { type: "string", enum: cuisines },
    mealType: { type: "string", enum: mealTypes },
    proteinLevel: { type: "string", enum: proteinLevels },
    satietyLevel: { type: "string", enum: satietyLevels },
    bloodSugarImpact: { type: "string", enum: bloodSugarImpacts },
    effortLevel: { type: "string", enum: effortLevels },
    familyApproved: { type: "boolean" },
    weeknightFriendly: { type: "boolean" },
    comfortMeal: { type: "boolean" },
    optimizedVersion: stringProperty,
    notes: stringProperty,
    ingredientSuggestions: stringArrayProperty,
    feedbackPrompt: stringProperty,
    metabolicScore: scoreProperty,
    proteinScore: scoreProperty,
    fiberScore: scoreProperty,
    satietyScoreNumeric: scoreProperty,
    bloodSugarRiskScore: scoreProperty,
    quickVerdict: stringProperty,
    mainConcerns: stringArrayProperty,
    minimalChangeVersion: stringProperty,
    supportiveVersion: stringProperty,
    plateStrategy: stringProperty,
    whyThisHelps: stringProperty,
    culturalNotes: stringProperty,
    shoppingAdditions: stringArrayProperty,
    prepNotes: stringArrayProperty,
    mealPairings: stringArrayProperty,
    cautions: stringArrayProperty,
    evidenceNotes: stringArrayProperty,
    confidenceNotes: stringArrayProperty,
    safetyDisclaimer: stringProperty,
    extractedIngredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          rawText: stringProperty,
          name: { type: ["string", "null"] },
          quantity: { type: ["string", "null"] },
          unit: { type: ["string", "null"] }
        },
        required: ["rawText", "name", "quantity", "unit"]
      }
    },
    extractedInstructions: stringArrayProperty,
    guidanceBasis: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sourceId: { type: "string", enum: approvedSourceIds },
          principleId: { type: "string", enum: healthGuidancePrincipleIds },
          relevance: stringProperty
        },
        required: ["sourceId", "principleId", "relevance"]
      }
    }
  },
  required: mealAnalysisRequiredFields
} as const;
