import {
  bloodSugarImpacts,
  cuisines,
  effortLevels,
  mealTypes,
  proteinLevels,
  satietyLevels,
  type MealAnalysisResult
} from "@/src/lib/types/meal";
import {
  defaultManualRecipeSource,
  recipeSourceClassifications,
  recipeSourceTypes
} from "@/src/lib/types/recipe";
import { mergeIngredientWithParsedRawText } from "@/src/lib/ingredients";
import { getSafeHttpUrl } from "@/src/lib/security/source-url";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 10;
}

function enumIncludes<TValue extends string>(
  value: unknown,
  options: readonly TValue[]
): value is TValue {
  return typeof value === "string" && options.includes(value as TValue);
}

function requiredString(
  body: Record<string, unknown>,
  field: string,
  errors: string[]
) {
  const value = body[field];

  if (!isNonEmptyString(value)) {
    errors.push(`${field} is required.`);
    return "";
  }

  return value.trim();
}

function requiredStringArray(
  body: Record<string, unknown>,
  field: string,
  errors: string[]
) {
  const value = body[field];

  if (!isStringArray(value)) {
    errors.push(`${field} must be an array of strings.`);
    return [];
  }

  return value as string[];
}

function requiredScore(
  body: Record<string, unknown>,
  field: string,
  errors: string[]
): number {
  const value = body[field];

  if (!isScore(value)) {
    errors.push(`${field} must be a number from 1 to 10.`);
    return 1;
  }

  return value;
}

function optionalNutritionNumber(
  value: unknown,
  field: string,
  errors: string[]
) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  errors.push(
    `nutritionEstimate.totals.${field} must be a non-negative number or null.`
  );
  return null;
}

function readNutritionEstimate(
  body: Record<string, unknown>,
  errors: string[]
): MealAnalysisResult["nutritionEstimate"] {
  const value = body.nutritionEstimate;

  if (value === null || value === undefined) {
    return null;
  }

  if (!isRecord(value) || !isRecord(value.totals)) {
    errors.push("nutritionEstimate must include a totals object.");
    return null;
  }

  const confidence =
    value.confidence === "high" ||
    value.confidence === "medium" ||
    value.confidence === "low"
      ? value.confidence
      : null;
  const source =
    value.source === "recipe-json-ld" ||
    value.source === "user-entered" ||
    value.source === "notion-backfill" ||
    value.source === "estimated"
      ? value.source
      : null;

  if (!confidence) {
    errors.push(
      "nutritionEstimate.confidence is required when nutrition is present."
    );
  }

  if (!source) {
    errors.push("nutritionEstimate.source is required when nutrition is present.");
  }

  return {
    totals: {
      calories: optionalNutritionNumber(value.totals.calories, "calories", errors),
      protein: optionalNutritionNumber(value.totals.protein, "protein", errors),
      carbs: optionalNutritionNumber(value.totals.carbs, "carbs", errors),
      fat: optionalNutritionNumber(value.totals.fat, "fat", errors),
      fiber: optionalNutritionNumber(value.totals.fiber, "fiber", errors),
      sodium: optionalNutritionNumber(value.totals.sodium, "sodium", errors),
      sugar: optionalNutritionNumber(value.totals.sugar, "sugar", errors)
    },
    confidence: confidence ?? "low",
    provenance:
      typeof value.provenance === "string" && value.provenance.trim()
        ? value.provenance.trim()
        : "Nutrition totals provided with meal record",
    source: source ?? "user-entered"
  };
}

const maxCookbookIngredients = 100;
const maxCookbookInstructions = 60;
const maxIngredientTextLength = 400;
const maxInstructionTextLength = 1200;

function readOptionalIngredientText(value: unknown, maxLength: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function readCookbookIngredients(
  body: Record<string, unknown>
): MealAnalysisResult["ingredients"] {
  const value = body.ingredients ?? body.extractedIngredients;

  if (!Array.isArray(value)) {
    return null;
  }

  const ingredients = value
    .map((item) => {
      if (typeof item === "string") {
        const rawText = item.trim();
        return rawText
          ? mergeIngredientWithParsedRawText({
              rawText: rawText.slice(0, maxIngredientTextLength)
            })
          : null;
      }

      if (!isRecord(item) || typeof item.rawText !== "string") {
        return null;
      }

      const rawText = item.rawText.trim();

      if (!rawText) {
        return null;
      }

      return mergeIngredientWithParsedRawText({
        rawText: rawText.slice(0, maxIngredientTextLength),
        name: readOptionalIngredientText(item.name, maxIngredientTextLength),
        quantity: readOptionalIngredientText(item.quantity, 40),
        unit: readOptionalIngredientText(item.unit, 40)
      });
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, maxCookbookIngredients);

  if (process.env.TABLEWISE_INGREDIENT_DIAGNOSTICS === "1") {
    console.info("Ingredient pipeline diagnostics: analysis validation", {
      sourceCount: value.length,
      normalized: ingredients.map((ingredient) => ({
        rawText: ingredient.rawText,
        name: ingredient.name ?? null,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null
      }))
    });
  }

  return ingredients.length > 0 ? ingredients : null;
}

function readCookbookInstructions(
  body: Record<string, unknown>
): MealAnalysisResult["instructions"] {
  const value = body.instructions ?? body.extractedInstructions;

  if (!Array.isArray(value)) {
    return null;
  }

  const instructions = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, maxInstructionTextLength))
    .slice(0, maxCookbookInstructions);

  return instructions.length > 0 ? instructions : null;
}

export function validateMealAnalysisResult(
  value: unknown
): ValidationResult<MealAnalysisResult> {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      success: false,
      errors: ["Request body must be a JSON object."]
    };
  }

  const body = value;
  const cuisine = enumIncludes(body.cuisine, cuisines) ? body.cuisine : null;
  const mealType = enumIncludes(body.mealType, mealTypes) ? body.mealType : null;
  const proteinLevel = enumIncludes(body.proteinLevel, proteinLevels)
    ? body.proteinLevel
    : null;
  const satietyLevel = enumIncludes(body.satietyLevel, satietyLevels)
    ? body.satietyLevel
    : null;
  const bloodSugarImpact = enumIncludes(body.bloodSugarImpact, bloodSugarImpacts)
    ? body.bloodSugarImpact
    : null;
  const effortLevel = enumIncludes(body.effortLevel, effortLevels)
    ? body.effortLevel
    : null;

  if (!cuisine) errors.push("cuisine is required.");
  if (!mealType) errors.push("mealType is required.");
  if (!proteinLevel) errors.push("proteinLevel is required.");
  if (!satietyLevel) errors.push("satietyLevel is required.");
  if (!bloodSugarImpact) errors.push("bloodSugarImpact is required.");
  if (!effortLevel) errors.push("effortLevel is required.");

  for (const field of ["familyApproved", "weeknightFriendly", "comfortMeal"]) {
    if (typeof body[field] !== "boolean") {
      errors.push(`${field} is required.`);
    }
  }

  const guidanceBasis = body.guidanceBasis;

  if (
    !Array.isArray(guidanceBasis) ||
    !guidanceBasis.every(
      (item) =>
        isRecord(item) &&
        typeof item.sourceId === "string" &&
        typeof item.principleId === "string" &&
        typeof item.relevance === "string"
    )
  ) {
    errors.push("guidanceBasis must be an array of source guidance objects.");
  }

  const sourceType = enumIncludes(body.sourceType, recipeSourceTypes)
    ? body.sourceType
    : defaultManualRecipeSource.sourceType;

  const meal: MealAnalysisResult = {
    mealName: requiredString(body, "mealName", errors),
    cuisine: cuisine ?? cuisines[0],
    mealType: mealType ?? mealTypes[0],
    proteinLevel: proteinLevel ?? proteinLevels[0],
    satietyLevel: satietyLevel ?? satietyLevels[0],
    bloodSugarImpact: bloodSugarImpact ?? bloodSugarImpacts[0],
    effortLevel: effortLevel ?? effortLevels[0],
    familyApproved: body.familyApproved === true,
    weeknightFriendly: body.weeknightFriendly === true,
    comfortMeal: body.comfortMeal === true,
    optimizedVersion: requiredString(body, "optimizedVersion", errors),
    notes: requiredString(body, "notes", errors),
    ingredientSuggestions: requiredStringArray(
      body,
      "ingredientSuggestions",
      errors
    ),
    feedbackPrompt: requiredString(body, "feedbackPrompt", errors),
    metabolicScore: requiredScore(body, "metabolicScore", errors),
    proteinScore: requiredScore(body, "proteinScore", errors),
    fiberScore: requiredScore(body, "fiberScore", errors),
    satietyScoreNumeric: requiredScore(body, "satietyScoreNumeric", errors),
    bloodSugarRiskScore: requiredScore(body, "bloodSugarRiskScore", errors),
    quickVerdict: requiredString(body, "quickVerdict", errors),
    mainConcerns: requiredStringArray(body, "mainConcerns", errors),
    minimalChangeVersion: requiredString(body, "minimalChangeVersion", errors),
    supportiveVersion: requiredString(body, "supportiveVersion", errors),
    plateStrategy: requiredString(body, "plateStrategy", errors),
    whyThisHelps: requiredString(body, "whyThisHelps", errors),
    culturalNotes: typeof body.culturalNotes === "string" ? body.culturalNotes : "",
    shoppingAdditions: requiredStringArray(body, "shoppingAdditions", errors),
    prepNotes: requiredStringArray(body, "prepNotes", errors),
    mealPairings: requiredStringArray(body, "mealPairings", errors),
    cautions: requiredStringArray(body, "cautions", errors),
    evidenceNotes: requiredStringArray(body, "evidenceNotes", errors),
    confidenceNotes: requiredStringArray(body, "confidenceNotes", errors),
    safetyDisclaimer: requiredString(body, "safetyDisclaimer", errors),
    guidanceBasis: Array.isArray(guidanceBasis)
      ? (guidanceBasis as MealAnalysisResult["guidanceBasis"])
      : [],
    ingredients: readCookbookIngredients(body),
    instructions: readCookbookInstructions(body),
    sourceType,
    sourceUrl: getSafeHttpUrl(body.sourceUrl),
    sourceName:
      typeof body.sourceName === "string" && body.sourceName.trim()
        ? body.sourceName.trim()
        : null,
    sourceClassification: enumIncludes(
      body.sourceClassification,
      recipeSourceClassifications
    )
      ? body.sourceClassification
      : null,
    sourceNotes: isStringArray(body.sourceNotes) ? body.sourceNotes : null,
    importedAt:
      typeof body.importedAt === "string" && body.importedAt.trim()
        ? body.importedAt.trim()
        : null,
    lastParsedAt:
      typeof body.lastParsedAt === "string" && body.lastParsedAt.trim()
        ? body.lastParsedAt.trim()
        : null,
    parserVersion:
      typeof body.parserVersion === "string" && body.parserVersion.trim()
        ? body.parserVersion.trim()
        : null,
    analysisVersion:
      typeof body.analysisVersion === "string" && body.analysisVersion.trim()
        ? body.analysisVersion.trim()
        : undefined,
    analysisModel:
      typeof body.analysisModel === "string" && body.analysisModel.trim()
        ? body.analysisModel.trim()
        : undefined,
    nutritionEstimate: readNutritionEstimate(body, errors),
    householdId:
      typeof body.householdId === "string" && body.householdId.trim()
        ? body.householdId.trim()
        : undefined,
    createdBy:
      typeof body.createdBy === "string" && body.createdBy.trim()
        ? body.createdBy.trim()
        : undefined,
    visibility:
      body.visibility === "private" || body.visibility === "household"
        ? body.visibility
        : undefined,
    schemaVersion:
      typeof body.schemaVersion === "string" && body.schemaVersion.trim()
        ? body.schemaVersion.trim()
        : undefined
  };

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? meal : undefined,
    errors
  };
}
