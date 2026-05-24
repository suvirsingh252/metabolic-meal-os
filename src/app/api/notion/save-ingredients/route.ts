import { NextResponse } from "next/server";
import type {
  CreatePageParameters,
  PageObjectResponse
} from "@notionhq/client/build/src/api-endpoints";
import { getNotionIngredientsEnv } from "@/src/lib/env";
import {
  normalizeIngredientKey,
  normalizeIngredientListWithStats
} from "@/src/lib/ingredients";
import { getNotionClient } from "@/src/lib/notion/client";

export const runtime = "nodejs";

type PageProperties = CreatePageParameters["properties"];
type NotionProperty = PageObjectResponse["properties"][string];

interface IngredientDatabaseSchema {
  titlePropertyName: string;
  sourceMealPropertyName: string | null;
  sourceMealPropertyType: "rich_text" | "select" | null;
  createdDatePropertyName: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function title(content: string) {
  return {
    title: [
      {
        text: {
          content
        }
      }
    ]
  };
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

function date(start: string) {
  return {
    date: {
      start
    }
  };
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

function getProperties(database: unknown) {
  if (isRecord(database) && isRecord(database.properties)) {
    return database.properties;
  }

  throw new Error("Ingredients database did not return properties.");
}

function getPropertyType(property: unknown) {
  if (isRecord(property) && typeof property.type === "string") {
    return property.type;
  }

  return null;
}

function getIngredientDatabaseSchema(database: unknown): IngredientDatabaseSchema {
  const properties = getProperties(database);
  const entries = Object.entries(properties);
  const titleEntry = entries.find(([, property]) => getPropertyType(property) === "title");

  if (!titleEntry) {
    throw new Error("Ingredients database does not have a title property.");
  }

  const sourceMealCandidates = [
    "Source Meal",
    "Source Meal Name",
    "Meal",
    "Meal Name"
  ];
  const createdDateCandidates = ["Created", "Created Date", "Created At", "Added Date"];

  const sourceMealEntry = sourceMealCandidates
    .map((name) => [name, properties[name]] as const)
    .find(([, property]) => {
      const type = getPropertyType(property);
      return type === "rich_text" || type === "select";
    });

  const createdDateEntry = createdDateCandidates
    .map((name) => [name, properties[name]] as const)
    .find(([, property]) => getPropertyType(property) === "date");

  const sourceMealPropertyType = sourceMealEntry
    ? (getPropertyType(sourceMealEntry[1]) as "rich_text" | "select")
    : null;

  return {
    titlePropertyName: titleEntry[0],
    sourceMealPropertyName: sourceMealEntry?.[0] ?? null,
    sourceMealPropertyType,
    createdDatePropertyName: createdDateEntry?.[0] ?? null
  };
}

function describeSchema(schema: IngredientDatabaseSchema) {
  return {
    titlePropertyName: schema.titlePropertyName,
    sourceMealPropertyName: schema.sourceMealPropertyName,
    sourceMealPropertyType: schema.sourceMealPropertyType,
    createdDatePropertyName: schema.createdDatePropertyName
  };
}

function readTitle(property: NotionProperty | undefined) {
  if (!property || property.type !== "title") {
    return "";
  }

  return property.title
    .map((part) => part.plain_text)
    .join("")
    .trim();
}

function isFullPage(page: unknown): page is PageObjectResponse {
  return isRecord(page) && isRecord(page.properties);
}

async function listExistingIngredientKeys(
  notion: ReturnType<typeof getNotionClient>,
  dataSourceId: string,
  titlePropertyName: string
) {
  const existingKeys = new Set<string>();
  let startCursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor
    });

    for (const page of response.results) {
      if (!isFullPage(page)) {
        continue;
      }

      const titleValue = readTitle(page.properties[titlePropertyName]);
      const key = normalizeIngredientKey(titleValue);

      if (key) {
        existingKeys.add(key);
      }
    }

    startCursor = response.has_more
      ? response.next_cursor ?? undefined
      : undefined;
  } while (startCursor);

  return existingKeys;
}

function buildIngredientProperties(
  ingredientName: string,
  mealName: string,
  schema: IngredientDatabaseSchema
): PageProperties {
  const properties: PageProperties = {
    [schema.titlePropertyName]: title(ingredientName)
  };

  if (schema.sourceMealPropertyName && schema.sourceMealPropertyType) {
    if (schema.sourceMealPropertyType === "rich_text") {
      properties[schema.sourceMealPropertyName] = richText(mealName);
    }

    if (schema.sourceMealPropertyType === "select") {
      properties[schema.sourceMealPropertyName] = select(mealName);
    }
  }

  if (schema.createdDatePropertyName) {
    properties[schema.createdDatePropertyName] = date(new Date().toISOString());
  }

  return properties;
}

function validateRequest(body: unknown) {
  if (!isRecord(body)) {
    return validationError("Request body must be a JSON object.");
  }

  if (typeof body.mealName !== "string" || body.mealName.trim().length === 0) {
    return validationError("mealName is required.");
  }

  if (!Array.isArray(body.ingredients)) {
    return validationError("ingredients must be an array.");
  }

  return {
    mealName: body.mealName.trim(),
    ingredients: body.ingredients
  };
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

  const normalizedList = normalizeIngredientListWithStats(
    validatedRequest.ingredients
  );
  const { ingredients } = normalizedList;

  if (ingredients.length === 0) {
    return NextResponse.json({
      success: true,
      createdCount: 0,
      skippedCount: normalizedList.duplicateCount,
      malformedCount: normalizedList.malformedCount
    });
  }

  try {
    const { NOTION_API_KEY, NOTION_INGREDIENTS_DATABASE_ID } =
      getNotionIngredientsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: NOTION_INGREDIENTS_DATABASE_ID
    });
    const dataSourceId = getPrimaryDataSourceId(database);
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: dataSourceId
    });
    const schema = getIngredientDatabaseSchema(dataSource);
    console.info("Notion save ingredients schema", describeSchema(schema));
    const existingKeys = await listExistingIngredientKeys(
      notion,
      dataSourceId,
      schema.titlePropertyName
    );

    let createdCount = 0;
    let skippedCount = normalizedList.duplicateCount;

    for (const ingredient of ingredients) {
      if (existingKeys.has(ingredient.key)) {
        skippedCount += 1;
        continue;
      }

      await notion.pages.create({
        parent: {
          database_id: NOTION_INGREDIENTS_DATABASE_ID
        },
        properties: buildIngredientProperties(
          ingredient.name,
          validatedRequest.mealName,
          schema
        )
      });

      existingKeys.add(ingredient.key);
      createdCount += 1;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      malformedCount: normalizedList.malformedCount
    });
  } catch (error) {
    console.error("Notion save ingredients API failure", error);

    return NextResponse.json(
      { error: "Unable to save ingredients to Notion right now." },
      { status: 500 }
    );
  }
}
