import { NextResponse } from "next/server";
import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { getFoodDataCentralEnv, getNotionIngredientsEnv } from "@/src/lib/env";
import {
  FoodDataCentralError,
  mapFoodDataCentralSearchResult,
  searchFoodDataCentral,
  type IngredientNutrientSnapshot
} from "@/src/lib/integrations/food-data-central";
import { getNotionClient } from "@/src/lib/notion/client";

export const runtime = "nodejs";

type PageProperties = NonNullable<CreatePageParameters["properties"]>;

interface SkippedField {
  field: string;
  reason: string;
}

interface IngredientNutrientPropertyDefinition {
  field: string;
  expectedTypes: string[];
  getValue: (snapshot: IngredientNutrientSnapshot) => string | number | null;
}

const nutrientPropertyDefinitions: IngredientNutrientPropertyDefinition[] = [
  {
    field: "FDC ID",
    expectedTypes: ["number", "rich_text"],
    getValue: (snapshot) => snapshot.fdcId
  },
  {
    field: "FDC Description",
    expectedTypes: ["rich_text"],
    getValue: (snapshot) => snapshot.matchedDescription
  },
  {
    field: "Nutrient Source",
    expectedTypes: ["select", "rich_text"],
    getValue: (snapshot) => snapshot.sourceName
  },
  {
    field: "Nutrient Confidence",
    expectedTypes: ["select", "rich_text"],
    getValue: (snapshot) => snapshot.confidence
  },
  {
    field: "Protein (g)",
    expectedTypes: ["number"],
    getValue: (snapshot) => snapshot.nutrients.proteinG ?? null
  },
  {
    field: "Fiber (g)",
    expectedTypes: ["number"],
    getValue: (snapshot) => snapshot.nutrients.fiberG ?? null
  },
  {
    field: "Carbohydrates (g)",
    expectedTypes: ["number"],
    getValue: (snapshot) => snapshot.nutrients.carbohydrateG ?? null
  },
  {
    field: "Sugars (g)",
    expectedTypes: ["number"],
    getValue: (snapshot) => snapshot.nutrients.totalSugarsG ?? null
  },
  {
    field: "Sodium (mg)",
    expectedTypes: ["number"],
    getValue: (snapshot) => snapshot.nutrients.sodiumMg ?? null
  },
  {
    field: "Energy (kcal)",
    expectedTypes: ["number"],
    getValue: (snapshot) => snapshot.nutrients.energyKcal ?? null
  },
  {
    field: "Last Nutrient Lookup",
    expectedTypes: ["date"],
    getValue: () => new Date().toISOString()
  }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function validateRequest(body: unknown) {
  if (!isRecord(body)) {
    return validationError("Request body must be a JSON object.");
  }

  if (typeof body.ingredientName !== "string") {
    return validationError("ingredientName is required.");
  }

  const ingredientName = body.ingredientName.trim();

  if (ingredientName.length < 2) {
    return validationError("ingredientName must be at least 2 characters.");
  }

  if (ingredientName.length > 100) {
    return validationError("ingredientName must be 100 characters or fewer.");
  }

  if (
    body.ingredientPageId !== undefined &&
    body.ingredientPageId !== null &&
    typeof body.ingredientPageId !== "string"
  ) {
    return validationError("ingredientPageId must be a string when provided.");
  }

  const ingredientPageId =
    typeof body.ingredientPageId === "string" && body.ingredientPageId.trim()
      ? body.ingredientPageId.trim()
      : null;

  return {
    ingredientName,
    ingredientPageId
  };
}

function getPropertyType(property: unknown) {
  if (isRecord(property) && typeof property.type === "string") {
    return property.type;
  }

  return null;
}

function getProperties(dataSource: unknown) {
  if (isRecord(dataSource) && isRecord(dataSource.properties)) {
    return dataSource.properties;
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

  throw new Error("Ingredients database did not return a queryable data source.");
}

function richText(content: string) {
  return {
    rich_text: [
      {
        text: {
          content
        }
      }
    ]
  };
}

function select(name: string) {
  return {
    select: {
      name
    }
  };
}

function number(value: number) {
  return {
    number: value
  };
}

function date(start: string) {
  return {
    date: {
      start
    }
  };
}

function buildIngredientNutrientUpdate(
  snapshot: IngredientNutrientSnapshot,
  properties: Record<string, unknown>
) {
  const notionProperties: PageProperties = {};
  const updatedFields: string[] = [];
  const skippedFields: SkippedField[] = [];

  for (const definition of nutrientPropertyDefinitions) {
    const property = properties[definition.field];
    const propertyType = getPropertyType(property);

    if (!propertyType) {
      skippedFields.push({
        field: definition.field,
        reason: "Missing Notion property"
      });
      continue;
    }

    if (!definition.expectedTypes.includes(propertyType)) {
      skippedFields.push({
        field: definition.field,
        reason: `Incompatible Notion property type: ${propertyType}`
      });
      continue;
    }

    const value = definition.getValue(snapshot);

    if (value === null) {
      skippedFields.push({
        field: definition.field,
        reason: "Nutrient value not returned by FoodData Central"
      });
      continue;
    }

    const mappedProperty = mapValueToNotionProperty(value, propertyType);

    if (!mappedProperty) {
      skippedFields.push({
        field: definition.field,
        reason: `Unable to map value to Notion property type: ${propertyType}`
      });
      continue;
    }

    notionProperties[definition.field] = mappedProperty;
    updatedFields.push(definition.field);
  }

  return {
    notionProperties,
    updatedFields,
    skippedFields
  };
}

function mapValueToNotionProperty(value: string | number, propertyType: string) {
  if (propertyType === "number" && typeof value === "number") {
    return number(value);
  }

  if (propertyType === "rich_text") {
    return richText(String(value));
  }

  if (propertyType === "select") {
    return select(String(value));
  }

  if (propertyType === "date" && typeof value === "string") {
    return date(value);
  }

  return null;
}

async function lookupIngredientSnapshot(ingredientName: string) {
  const { FDC_API_KEY } = getFoodDataCentralEnv();
  const foods = await searchFoodDataCentral({
    query: ingredientName,
    apiKey: FDC_API_KEY
  });
  const snapshot = mapFoodDataCentralSearchResult(ingredientName, foods);

  if (!snapshot) {
    throw new FoodDataCentralError("No FoodData Central match found.");
  }

  return snapshot;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return validationError("Request body must be valid JSON.");
  }

  const validatedRequest = validateRequest(body);

  if (validatedRequest instanceof NextResponse) {
    return validatedRequest;
  }

  try {
    const snapshot = await lookupIngredientSnapshot(
      validatedRequest.ingredientName
    );

    if (!validatedRequest.ingredientPageId) {
      return NextResponse.json({
        success: true,
        mode: "lookup",
        lookup: snapshot,
        lookupConfidence: snapshot.confidence,
        updatedFields: [],
        skippedFields: nutrientPropertyDefinitions.map((definition) => ({
          field: definition.field,
          reason: "No ingredientPageId provided; lookup only"
        }))
      });
    }

    const { NOTION_API_KEY, NOTION_INGREDIENTS_DATABASE_ID } =
      getNotionIngredientsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: NOTION_INGREDIENTS_DATABASE_ID
    });
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: getPrimaryDataSourceId(database)
    });
    const { notionProperties, updatedFields, skippedFields } =
      buildIngredientNutrientUpdate(snapshot, getProperties(dataSource));

    if (updatedFields.length > 0) {
      await notion.pages.update({
        page_id: validatedRequest.ingredientPageId,
        properties: notionProperties
      });
    }

    return NextResponse.json({
      success: true,
      mode: "lookup-and-update",
      lookup: snapshot,
      lookupConfidence: snapshot.confidence,
      updatedFields,
      skippedFields
    });
  } catch (error) {
    console.error("Ingredient enrichment API failure", error);

    if (error instanceof FoodDataCentralError) {
      return NextResponse.json(
        { error: "Unable to look up ingredient nutrition right now." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Unable to enrich ingredient right now." },
      { status: 500 }
    );
  }
}
