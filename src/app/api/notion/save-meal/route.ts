import { NextResponse } from "next/server";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { validateMealAnalysisResult } from "@/src/lib/domain/meal/validation";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import {
  mapMealAnalysisToNotionProperties,
  type MealSourcePropertySchema
} from "@/src/lib/notion/mappers";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(errors: string[]) {
  return NextResponse.json(
    {
      error: "Meal payload failed validation.",
      details: errors
    },
    { status: 400 }
  );
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

function getPrimaryDataSourceId(database: unknown) {
  if (
    isRecord(database) &&
    Array.isArray(database.data_sources) &&
    database.data_sources.length > 0 &&
    isRecord(database.data_sources[0]) &&
    typeof database.data_sources[0].id === "string"
  ) {
    return database.data_sources[0].id;
  }

  throw new Error("Meals database did not return a queryable data source.");
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

  const sourceType = findProperty(properties, ["Source Type", "sourceType"], [
    "select",
    "rich_text"
  ]);
  const sourceUrl = findProperty(
    properties,
    ["Source URL", "Source Url", "Original Source", "sourceUrl"],
    ["url", "rich_text"]
  );
  const sourceName = findProperty(properties, ["Source Name", "sourceName"], [
    "select",
    "rich_text"
  ]);
  const sourceClassification = findProperty(
    properties,
    ["Source Classification", "sourceClassification"],
    ["select", "rich_text"]
  );
  const sourceNotes = findProperty(
    properties,
    ["Source Notes", "sourceNotes"],
    ["rich_text"]
  );
  const ingredientsProperty = findProperty(
    properties,
    ["Ingredients", "Recipe Ingredients", "ingredients"],
    ["rich_text"]
  );
  const instructionsProperty = findProperty(
    properties,
    ["Instructions", "Recipe Instructions", "Method", "instructions"],
    ["rich_text"]
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
  const analysisVersion = findProperty(
    properties,
    ["Analysis Version", "analysisVersion"],
    ["select", "rich_text"]
  );
  const analysisModel = findProperty(
    properties,
    ["Analysis Model", "analysisModel"],
    ["select", "rich_text"]
  );
  const householdId = findProperty(
    properties,
    ["Household ID", "householdId"],
    ["rich_text", "select"]
  );
  const createdBy = findProperty(properties, ["Created By", "createdBy"], [
    "rich_text",
    "select"
  ]);
  const visibility = findProperty(properties, ["Visibility", "visibility"], [
    "select",
    "rich_text"
  ]);
  const schemaVersion = findProperty(
    properties,
    ["Schema Version", "schemaVersion"],
    ["select", "rich_text"]
  );
  const calories = findProperty(properties, ["Calories", "Energy (kcal)", "Energy Kcal"], [
    "number"
  ]);
  const proteinG = findProperty(properties, ["Protein (g)", "Protein g", "Protein"], [
    "number"
  ]);
  const carbohydratesG = findProperty(
    properties,
    ["Carbohydrates (g)", "Carbs (g)", "Carbs", "Carbohydrate (g)", "Carbohydrates"],
    ["number"]
  );
  const fatG = findProperty(properties, ["Fat (g)", "Total Fat (g)", "Fat"], [
    "number"
  ]);
  const fiberG = findProperty(properties, ["Fiber (g)", "Fibre (g)", "Fiber"], [
    "number"
  ]);
  const sodiumMg = findProperty(properties, ["Sodium (mg)", "Sodium"], [
    "number"
  ]);
  const sugarG = findProperty(
    properties,
    ["Sugar (g)", "Sugar", "Sugars (g)", "Total Sugars (g)", "Total Sugar (g)"],
    ["number"]
  );
  const nutritionConfidence = findProperty(
    properties,
    ["Nutrition Confidence", "Nutrient Confidence"],
    ["select", "rich_text", "number"]
  );
  const nutritionProvenance = findProperty(
    properties,
    ["Nutrition Provenance", "Nutrition Source Notes"],
    ["select", "rich_text"]
  );
  const nutritionSource = findProperty(
    properties,
    ["Nutrition Source", "Nutrition Data Source"],
    ["select", "rich_text"]
  );
  const mealQualityScore = findProperty(
    properties,
    ["Meal Quality Score", "Quality Score"],
    ["number"]
  );
  const metabolicScore = findProperty(properties, ["Metabolic Score"], ["number"]);
  const proteinScoreField = findProperty(properties, ["Protein Score"], ["number"]);
  const fiberScoreField = findProperty(properties, ["Fiber Score"], ["number"]);
  const satietyScoreNumeric = findProperty(properties, ["Satiety Score"], [
    "number"
  ]);
  const bloodSugarRiskScore = findProperty(
    properties,
    ["Blood Sugar Risk Score"],
    ["number"]
  );
  const mealDate = findProperty(properties, ["Meal Date", "Date", "Logged At"], [
    "date"
  ]);

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

  if (sourceClassification) {
    schema.sourceClassification = {
      name: sourceClassification[0],
      type: getPropertyType(sourceClassification[1]) as "select" | "rich_text"
    };
  }

  if (sourceNotes) {
    schema.sourceNotes = {
      name: sourceNotes[0],
      type: "rich_text"
    };
  }

  if (ingredientsProperty) {
    schema.ingredients = {
      name: ingredientsProperty[0],
      type: "rich_text"
    };
  }

  if (instructionsProperty) {
    schema.instructions = {
      name: instructionsProperty[0],
      type: "rich_text"
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

  if (analysisVersion) {
    schema.analysisVersion = {
      name: analysisVersion[0],
      type: getPropertyType(analysisVersion[1]) as "select" | "rich_text"
    };
  }

  if (analysisModel) {
    schema.analysisModel = {
      name: analysisModel[0],
      type: getPropertyType(analysisModel[1]) as "select" | "rich_text"
    };
  }

  if (householdId) {
    schema.householdId = {
      name: householdId[0],
      type: getPropertyType(householdId[1]) as "rich_text" | "select"
    };
  }

  if (createdBy) {
    schema.createdBy = {
      name: createdBy[0],
      type: getPropertyType(createdBy[1]) as "rich_text" | "select"
    };
  }

  if (visibility) {
    schema.visibility = {
      name: visibility[0],
      type: getPropertyType(visibility[1]) as "select" | "rich_text"
    };
  }

  if (schemaVersion) {
    schema.schemaVersion = {
      name: schemaVersion[0],
      type: getPropertyType(schemaVersion[1]) as "select" | "rich_text"
    };
  }

  if (calories) schema.calories = { name: calories[0], type: "number" };
  if (proteinG) schema.proteinG = { name: proteinG[0], type: "number" };
  if (carbohydratesG) {
    schema.carbohydratesG = { name: carbohydratesG[0], type: "number" };
  }
  if (fatG) schema.fatG = { name: fatG[0], type: "number" };
  if (fiberG) schema.fiberG = { name: fiberG[0], type: "number" };
  if (sodiumMg) schema.sodiumMg = { name: sodiumMg[0], type: "number" };
  if (sugarG) schema.sugarG = { name: sugarG[0], type: "number" };
  if (nutritionConfidence) {
    schema.nutritionConfidence = {
      name: nutritionConfidence[0],
      type: getPropertyType(nutritionConfidence[1]) as
        | "select"
        | "rich_text"
        | "number"
    };
  }
  if (nutritionProvenance) {
    schema.nutritionProvenance = {
      name: nutritionProvenance[0],
      type: getPropertyType(nutritionProvenance[1]) as "select" | "rich_text"
    };
  }
  if (nutritionSource) {
    schema.nutritionSource = {
      name: nutritionSource[0],
      type: getPropertyType(nutritionSource[1]) as "select" | "rich_text"
    };
  }
  if (mealQualityScore) {
    schema.mealQualityScore = { name: mealQualityScore[0], type: "number" };
  }
  if (metabolicScore) {
    schema.metabolicScore = { name: metabolicScore[0], type: "number" };
  }
  if (proteinScoreField) {
    schema.proteinScore = { name: proteinScoreField[0], type: "number" };
  }
  if (fiberScoreField) {
    schema.fiberScore = { name: fiberScoreField[0], type: "number" };
  }
  if (satietyScoreNumeric) {
    schema.satietyScoreNumeric = {
      name: satietyScoreNumeric[0],
      type: "number"
    };
  }
  if (bloodSugarRiskScore) {
    schema.bloodSugarRiskScore = {
      name: bloodSugarRiskScore[0],
      type: "number"
    };
  }
  if (mealDate) {
    schema.mealDate = {
      name: mealDate[0],
      type: "date"
    };
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
    return validationError(validatedMeal.errors);
  }

  try {
    const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: NOTION_MEALS_DATABASE_ID
    });
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: getPrimaryDataSourceId(database)
    });
    const sourceSchema = getMealSourcePropertySchema(dataSource);

    const ownership = getConfiguredHouseholdMetadata();
    const page = await notion.pages.create({
      parent: {
        database_id: NOTION_MEALS_DATABASE_ID
      },
      properties: mapMealAnalysisToNotionProperties(
        {
          ...validatedMeal.data,
          householdId: validatedMeal.data.householdId ?? ownership.householdId,
          createdBy: validatedMeal.data.createdBy ?? ownership.createdBy,
          visibility: validatedMeal.data.visibility ?? ownership.visibility,
          schemaVersion:
            validatedMeal.data.schemaVersion ?? ownership.schemaVersion
        },
        sourceSchema
      )
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
