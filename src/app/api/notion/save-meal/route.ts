import { NextResponse } from "next/server";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import {
  mapMealAnalysisToNotionProperties,
  type MealSourcePropertySchema
} from "@/src/lib/notion/mappers";
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
import {
  defaultManualRecipeSource,
  recipeSourceTypes,
  type RecipeSourceType
} from "@/src/lib/types/recipe";

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

function getPropertyType(property: unknown) {
  if (isRecord(property) && typeof property.type === "string") {
    return property.type;
  }

  return null;
}

function getProperties(database: unknown) {
  if (isRecord(database) && isRecord(database.properties)) {
    return database.properties;
  }

  return {};
}

function findProperty(
  properties: Record<string, unknown>,
  names: string[],
  allowedTypes: string[]
) {
  return names
    .map((name) => [name, properties[name]] as const)
    .find(([, property]) => {
      const type = getPropertyType(property);
      return Boolean(type && allowedTypes.includes(type));
    });
}

function getMealSourcePropertySchema(database: unknown): MealSourcePropertySchema {
  const properties = getProperties(database);
  const schema: MealSourcePropertySchema = {};

  const sourceType = findProperty(
    properties,
    ["Source Type", "sourceType"],
    ["select", "rich_text"]
  );
  const sourceUrl = findProperty(
    properties,
    ["Source URL", "Source Url", "sourceUrl"],
    ["url", "rich_text"]
  );
  const sourceName = findProperty(
    properties,
    ["Source Name", "sourceName"],
    ["select", "rich_text"]
  );
  const importedAt = findProperty(
    properties,
    ["Imported At", "Imported", "importedAt"],
    ["date"]
  );
  const lastParsedAt = findProperty(
    properties,
    ["Last Parsed At", "Parsed At", "lastParsedAt"],
    ["date"]
  );
  const parserVersion = findProperty(
    properties,
    ["Parser Version", "parserVersion"],
    ["select", "rich_text"]
  );

  if (sourceType) {
    schema.sourceType = {
      name: sourceType[0],
      type: getPropertyType(sourceType[1]) as "select" | "rich_text"
    };
  }

  if (sourceUrl) {
    schema.sourceUrl = {
      name: sourceUrl[0],
      type: getPropertyType(sourceUrl[1]) as "url" | "rich_text"
    };
  }

  if (sourceName) {
    schema.sourceName = {
      name: sourceName[0],
      type: getPropertyType(sourceName[1]) as "select" | "rich_text"
    };
  }

  if (importedAt) {
    schema.importedAt = {
      name: importedAt[0],
      type: "date"
    };
  }

  if (lastParsedAt) {
    schema.lastParsedAt = {
      name: lastParsedAt[0],
      type: "date"
    };
  }

  if (parserVersion) {
    schema.parserVersion = {
      name: parserVersion[0],
      type: getPropertyType(parserVersion[1]) as "select" | "rich_text"
    };
  }

  return schema;
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
  const sourceType =
    isEnumValue<RecipeSourceType>(body.sourceType, recipeSourceTypes)
      ? body.sourceType
      : defaultManualRecipeSource.sourceType;
  const sourceUrl = typeof body.sourceUrl === "string" && body.sourceUrl.trim()
    ? body.sourceUrl.trim()
    : null;
  const sourceName =
    typeof body.sourceName === "string" && body.sourceName.trim()
      ? body.sourceName.trim()
      : null;
  const importedAt =
    typeof body.importedAt === "string" && body.importedAt.trim()
      ? body.importedAt.trim()
      : new Date().toISOString();
  const lastParsedAt =
    typeof body.lastParsedAt === "string" && body.lastParsedAt.trim()
      ? body.lastParsedAt.trim()
      : null;
  const parserVersion =
    typeof body.parserVersion === "string" && body.parserVersion.trim()
      ? body.parserVersion.trim()
      : defaultManualRecipeSource.parserVersion;

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
    cautions,
    sourceType,
    sourceUrl,
    sourceName,
    importedAt,
    lastParsedAt,
    parserVersion
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
    const database = await notion.databases.retrieve({
      database_id: NOTION_MEALS_DATABASE_ID
    });
    const sourceSchema = getMealSourcePropertySchema(database);

    const page = await notion.pages.create({
      parent: {
        database_id: NOTION_MEALS_DATABASE_ID
      },
      properties: mapMealAnalysisToNotionProperties(meal, sourceSchema)
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
