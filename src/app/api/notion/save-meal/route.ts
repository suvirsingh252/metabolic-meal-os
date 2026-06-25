import { NextResponse } from "next/server";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import { validateMealAnalysisResult } from "@/src/lib/domain/meal/validation";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import {
  mapMealAnalysisToNotionProperties,
  type MealSourcePropertySchema
} from "@/src/lib/notion/mappers";
import {
  getNotionPageUrl,
  getPrimaryDataSourceId,
  getPropertyRecord,
  getPropertyType,
  validationError
} from "@/src/lib/notion/route-helpers";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

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
  const properties = getPropertyRecord(database);
  const schema: MealSourcePropertySchema = {};
  const fieldSpecs: Array<{
    key: keyof MealSourcePropertySchema;
    names: string[];
    types: string[];
  }> = [
    { key: "sourceType", names: ["Source Type", "sourceType"], types: ["select", "rich_text"] },
    { key: "sourceUrl", names: ["Source URL", "Source Url", "Original Source", "sourceUrl"], types: ["url", "rich_text"] },
    { key: "sourceName", names: ["Source Name", "sourceName"], types: ["select", "rich_text"] },
    { key: "sourceClassification", names: ["Source Classification", "sourceClassification"], types: ["select", "rich_text"] },
    { key: "sourceNotes", names: ["Source Notes", "sourceNotes"], types: ["rich_text"] },
    { key: "ingredients", names: ["Ingredients", "Recipe Ingredients", "ingredients"], types: ["rich_text"] },
    { key: "instructions", names: ["Instructions", "Recipe Instructions", "Method", "instructions"], types: ["rich_text"] },
    { key: "importedAt", names: ["Imported At", "Imported", "importedAt"], types: ["date"] },
    { key: "lastParsedAt", names: ["Last Parsed At", "Parsed At", "lastParsedAt"], types: ["date"] },
    { key: "parserVersion", names: ["Parser Version", "parserVersion"], types: ["select", "rich_text"] },
    { key: "analysisVersion", names: ["Analysis Version", "analysisVersion"], types: ["select", "rich_text"] },
    { key: "analysisModel", names: ["Analysis Model", "analysisModel"], types: ["select", "rich_text"] },
    { key: "householdId", names: ["Household ID", "householdId"], types: ["rich_text", "select"] },
    { key: "createdBy", names: ["Created By", "createdBy"], types: ["rich_text", "select"] },
    { key: "visibility", names: ["Visibility", "visibility"], types: ["select", "rich_text"] },
    { key: "schemaVersion", names: ["Schema Version", "schemaVersion"], types: ["select", "rich_text"] },
    { key: "calories", names: ["Calories", "Energy (kcal)", "Energy Kcal"], types: ["number"] },
    { key: "proteinG", names: ["Protein (g)", "Protein g", "Protein"], types: ["number"] },
    { key: "carbohydratesG", names: ["Carbohydrates (g)", "Carbs (g)", "Carbs", "Carbohydrate (g)", "Carbohydrates"], types: ["number"] },
    { key: "fatG", names: ["Fat (g)", "Total Fat (g)", "Fat"], types: ["number"] },
    { key: "fiberG", names: ["Fiber (g)", "Fibre (g)", "Fiber"], types: ["number"] },
    { key: "sodiumMg", names: ["Sodium (mg)", "Sodium"], types: ["number"] },
    { key: "sugarG", names: ["Sugar (g)", "Sugar", "Sugars (g)", "Total Sugars (g)", "Total Sugar (g)"], types: ["number"] },
    { key: "nutritionConfidence", names: ["Nutrition Confidence", "Nutrient Confidence"], types: ["select", "rich_text", "number"] },
    { key: "nutritionProvenance", names: ["Nutrition Provenance", "Nutrition Source Notes"], types: ["select", "rich_text"] },
    { key: "nutritionSource", names: ["Nutrition Source", "Nutrition Data Source"], types: ["select", "rich_text"] },
    { key: "mealQualityScore", names: ["Meal Quality Score", "Quality Score"], types: ["number"] },
    { key: "metabolicScore", names: ["Metabolic Score"], types: ["number"] },
    { key: "proteinScore", names: ["Protein Score"], types: ["number"] },
    { key: "fiberScore", names: ["Fiber Score"], types: ["number"] },
    { key: "satietyScoreNumeric", names: ["Satiety Score"], types: ["number"] },
    { key: "bloodSugarRiskScore", names: ["Blood Sugar Risk Score"], types: ["number"] },
    { key: "mealDate", names: ["Meal Date", "Date", "Logged At"], types: ["date"] },
    { key: "imageUrl", names: ["Image URL", "Image Url", "Hero Image", "imageUrl"], types: ["url", "rich_text"] },
    { key: "imageSource", names: ["Image Source", "imageSource"], types: ["select", "rich_text"] },
    { key: "imageOriginalUrl", names: ["Image Original URL", "Original Image URL", "imageOriginalUrl"], types: ["url", "rich_text"] },
    { key: "imagePrompt", names: ["Image Prompt", "imagePrompt"], types: ["rich_text"] },
    { key: "imageAttribution", names: ["Image Attribution", "imageAttribution"], types: ["rich_text"] },
    { key: "imageStatus", names: ["Image Status", "imageStatus"], types: ["select", "rich_text"] },
    { key: "imageLastUpdated", names: ["Image Last Updated", "imageLastUpdated"], types: ["date"] }
  ];

  for (const spec of fieldSpecs) {
    const field = findProperty(properties, spec.names, spec.types);
    const type = field ? getPropertyType(field[1]) : null;

    if (field && type) {
      schema[spec.key] = { name: field[0], type } as never;
    }
  }

  return schema;
}

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "notion-save-meal",
    rateLimit: 30
  });

  if (guardResponse) {
    return guardResponse;
  }

  const body = await readJsonWithLimit(request, 80_000);

  if (body instanceof NextResponse) {
    return body;
  }

  const validatedMeal = validateMealAnalysisResult(body);

  if (!validatedMeal.success || !validatedMeal.data) {
    return validationError("Meal payload failed validation.", validatedMeal.errors);
  }

  try {
    const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: NOTION_MEALS_DATABASE_ID
    });
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: getPrimaryDataSourceId(
        database,
        "Meals database did not return a queryable data source."
      )
    });
    const sourceSchema = getMealSourcePropertySchema(dataSource);

    const ownership = getConfiguredHouseholdMetadata();
    const mealToSave = {
      ...validatedMeal.data,
      householdId: validatedMeal.data.householdId ?? ownership.householdId,
      createdBy: validatedMeal.data.createdBy ?? ownership.createdBy,
      visibility: validatedMeal.data.visibility ?? ownership.visibility,
      schemaVersion:
        validatedMeal.data.schemaVersion ?? ownership.schemaVersion
    };
    const cover =
      mealToSave.imageUrl?.startsWith("http://") ||
      mealToSave.imageUrl?.startsWith("https://")
        ? {
            type: "external" as const,
            external: {
              url: mealToSave.imageUrl
            }
          }
        : undefined;
    const page = await notion.pages.create({
      parent: {
        database_id: NOTION_MEALS_DATABASE_ID
      },
      cover,
      properties: mapMealAnalysisToNotionProperties(mealToSave, sourceSchema)
    });

    return NextResponse.json({
      success: true,
      mealId: page.id,
      mealDetailPath: getMealDetailPath(page.id),
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
