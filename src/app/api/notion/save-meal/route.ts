import { NextResponse } from "next/server";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { mapMealAnalysisToNotionProperties } from "@/src/lib/notion/mappers";
import {
  bloodSugarImpacts,
  cuisines,
  effortLevels,
  mealTypes,
  proteinLevels,
  satietyLevels,
  type BloodSugarImpact,
  type Cuisine,
  type EffortLevel,
  type MealAnalysisResult,
  type MealType,
  type ProteinLevel,
  type SatietyLevel
} from "@/src/lib/types/meal";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEnumValue<TValue extends string>(
  value: unknown,
  options: readonly TValue[]
): value is TValue {
  return typeof value === "string" && options.includes(value as TValue);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function getNotionPageUrl(page: { id: string; url?: string }) {
  if (!page.url) {
    throw new Error(`Notion did not return a page URL for page ${page.id}.`);
  }

  return page.url;
}

function validateMealAnalysis(body: unknown): MealAnalysisResult | NextResponse {
  if (!isRecord(body)) {
    return validationError("Request body must be a JSON object.");
  }

  if (!isString(body.mealName)) {
    return validationError("mealName is required.");
  }

  if (!isEnumValue<Cuisine>(body.cuisine, cuisines)) {
    return validationError("cuisine is required.");
  }

  if (!isEnumValue<MealType>(body.mealType, mealTypes)) {
    return validationError("mealType is required.");
  }

  if (!isEnumValue<ProteinLevel>(body.proteinLevel, proteinLevels)) {
    return validationError("proteinLevel is required.");
  }

  if (!isEnumValue<SatietyLevel>(body.satietyLevel, satietyLevels)) {
    return validationError("satietyLevel is required.");
  }

  if (!isEnumValue<BloodSugarImpact>(body.bloodSugarImpact, bloodSugarImpacts)) {
    return validationError("bloodSugarImpact is required.");
  }

  if (!isEnumValue<EffortLevel>(body.effortLevel, effortLevels)) {
    return validationError("effortLevel is required.");
  }

  if (typeof body.familyApproved !== "boolean") {
    return validationError("familyApproved is required.");
  }

  if (typeof body.weeknightFriendly !== "boolean") {
    return validationError("weeknightFriendly is required.");
  }

  if (typeof body.comfortMeal !== "boolean") {
    return validationError("comfortMeal is required.");
  }

  if (!isString(body.optimizedVersion)) {
    return validationError("optimizedVersion is required.");
  }

  if (!isString(body.notes)) {
    return validationError("notes is required.");
  }

  if (!isStringArray(body.ingredientSuggestions)) {
    return validationError("ingredientSuggestions must be an array of strings.");
  }

  if (!isString(body.feedbackPrompt)) {
    return validationError("feedbackPrompt is required.");
  }

  // v2 fields — required in type but optional in Notion save (not written to Notion yet)
  const metabolicScore = typeof body.metabolicScore === "number" ? body.metabolicScore : 0;
  const proteinScore = typeof body.proteinScore === "number" ? body.proteinScore : 0;
  const fiberScore = typeof body.fiberScore === "number" ? body.fiberScore : 0;
  const satietyScoreNumeric = typeof body.satietyScoreNumeric === "number" ? body.satietyScoreNumeric : 0;
  const bloodSugarRiskScore = typeof body.bloodSugarRiskScore === "number" ? body.bloodSugarRiskScore : 0;
  const quickVerdict = typeof body.quickVerdict === "string" ? body.quickVerdict : "";
  const mainConcerns = isStringArray(body.mainConcerns) ? body.mainConcerns : [];
  const minimalChangeVersion = typeof body.minimalChangeVersion === "string" ? body.minimalChangeVersion : "";
  const supportiveVersion = typeof body.supportiveVersion === "string" ? body.supportiveVersion : "";
  const plateStrategy = typeof body.plateStrategy === "string" ? body.plateStrategy : "";
  const whyThisHelps = typeof body.whyThisHelps === "string" ? body.whyThisHelps : "";
  const culturalNotes = typeof body.culturalNotes === "string" ? body.culturalNotes : "";
  const shoppingAdditions = isStringArray(body.shoppingAdditions) ? body.shoppingAdditions : [];
  const prepNotes = isStringArray(body.prepNotes) ? body.prepNotes : [];
  const mealPairings = isStringArray(body.mealPairings) ? body.mealPairings : [];
  const cautions = isStringArray(body.cautions) ? body.cautions : [];

  return {
    mealName: body.mealName.trim(),
    cuisine: body.cuisine,
    mealType: body.mealType,
    proteinLevel: body.proteinLevel,
    satietyLevel: body.satietyLevel,
    bloodSugarImpact: body.bloodSugarImpact,
    effortLevel: body.effortLevel,
    familyApproved: body.familyApproved,
    weeknightFriendly: body.weeknightFriendly,
    comfortMeal: body.comfortMeal,
    optimizedVersion: body.optimizedVersion.trim(),
    notes: body.notes.trim(),
    ingredientSuggestions: body.ingredientSuggestions,
    feedbackPrompt: body.feedbackPrompt.trim(),
    metabolicScore,
    proteinScore,
    fiberScore,
    satietyScoreNumeric,
    bloodSugarRiskScore,
    quickVerdict,
    mainConcerns,
    minimalChangeVersion,
    supportiveVersion,
    plateStrategy,
    whyThisHelps,
    culturalNotes,
    shoppingAdditions,
    prepNotes,
    mealPairings,
    cautions
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return validationError("Request body must be valid JSON.");
  }

  const meal = validateMealAnalysis(body);

  if (meal instanceof NextResponse) {
    return meal;
  }

  try {
    const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
    const notion = getNotionClient(NOTION_API_KEY);

    const page = await notion.pages.create({
      parent: {
        database_id: NOTION_MEALS_DATABASE_ID
      },
      properties: mapMealAnalysisToNotionProperties(meal)
    });

    return NextResponse.json({
      success: true,
      notionPageId: page.id,
      notionUrl: getNotionPageUrl(page)
    });
  } catch (error) {
    console.error("Notion save meal API failure", error);

    return NextResponse.json(
      { error: "Unable to save meal to Notion right now." },
      { status: 500 }
    );
  }
}
