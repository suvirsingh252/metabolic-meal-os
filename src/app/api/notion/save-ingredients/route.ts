import { NextResponse } from "next/server";
import type {
  CreatePageParameters,
  PageObjectResponse
} from "@notionhq/client/build/src/api-endpoints";
import { getNotionIngredientsEnv, getNotionMealsEnv } from "@/src/lib/env";
import {
  normalizeIngredientKey,
  normalizeIngredientListWithStats
} from "@/src/lib/ingredients";
import { getNotionClient } from "@/src/lib/notion/client";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

type PageProperties = CreatePageParameters["properties"];
type NotionProperty = PageObjectResponse["properties"][string];

interface IngredientDatabaseSchema {
  titlePropertyName: string;
  sourceMealPropertyName: string | null;
  sourceMealPropertyType: "rich_text" | "select" | null;
  createdDatePropertyName: string | null;
  mealRelationPropertyName: string | null;
}

interface ExistingIngredientRecord {
  key: string;
  pageId: string;
  relationIds: string[];
  relationHasMore: boolean;
}

interface RelationTarget {
  databaseId: string | null;
  dataSourceId: string | null;
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

function relation(pageIds: string[]) {
  return {
    relation: pageIds.map((id) => ({ id }))
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

function getRelationTarget(property: unknown): RelationTarget | null {
  if (
    isRecord(property) &&
    property.type === "relation" &&
    isRecord(property.relation)
  ) {
    return {
      databaseId:
        typeof property.relation.database_id === "string"
          ? property.relation.database_id
          : null,
      dataSourceId:
        typeof property.relation.data_source_id === "string"
          ? property.relation.data_source_id
          : null
    };
  }

  return null;
}

function isRelationTargetCompatible(
  property: unknown,
  mealDatabaseId: string,
  mealDataSourceId: string
) {
  const target = getRelationTarget(property);

  return Boolean(
    target &&
      (target.databaseId === mealDatabaseId ||
        target.dataSourceId === mealDataSourceId)
  );
}

function findMealRelationPropertyName(
  properties: Record<string, unknown>,
  mealDatabaseId: string,
  mealDataSourceId: string
) {
  const preferredRelation = ["Meal", "Meals"]
    .map((name) => [name, properties[name]] as const)
    .find(([, property]) =>
      isRelationTargetCompatible(property, mealDatabaseId, mealDataSourceId)
    );

  if (preferredRelation) {
    return preferredRelation[0];
  }

  const compatibleRelation = Object.entries(properties).find(([, property]) =>
    isRelationTargetCompatible(property, mealDatabaseId, mealDataSourceId)
  );

  return compatibleRelation?.[0] ?? null;
}

function getIngredientDatabaseSchema(
  database: unknown,
  mealDatabaseId: string | null,
  mealDataSourceId: string | null
): IngredientDatabaseSchema {
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
    createdDatePropertyName: createdDateEntry?.[0] ?? null,
    mealRelationPropertyName:
      mealDatabaseId && mealDataSourceId
        ? findMealRelationPropertyName(properties, mealDatabaseId, mealDataSourceId)
        : null
  };
}

function describeSchema(schema: IngredientDatabaseSchema) {
  return {
    titlePropertyName: schema.titlePropertyName,
    sourceMealPropertyName: schema.sourceMealPropertyName,
    sourceMealPropertyType: schema.sourceMealPropertyType,
    createdDatePropertyName: schema.createdDatePropertyName,
    mealRelationPropertyName: schema.mealRelationPropertyName
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

function readRelationIds(property: NotionProperty | undefined) {
  if (!property || property.type !== "relation") {
    return {
      relationIds: [],
      relationHasMore: false
    };
  }

  return {
    relationIds: property.relation.map((item) => item.id),
    relationHasMore:
      "has_more" in property && typeof property.has_more === "boolean"
        ? property.has_more
        : false
  };
}

async function listExistingIngredientRecords(
  notion: ReturnType<typeof getNotionClient>,
  dataSourceId: string,
  titlePropertyName: string,
  mealRelationPropertyName: string | null
) {
  const existingRecords = new Map<string, ExistingIngredientRecord>();
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
        const relationState = mealRelationPropertyName
          ? readRelationIds(page.properties[mealRelationPropertyName])
          : { relationIds: [], relationHasMore: false };

        existingRecords.set(key, {
          key,
          pageId: page.id,
          relationIds: relationState.relationIds,
          relationHasMore: relationState.relationHasMore
        });
      }
    }

    startCursor = response.has_more
      ? response.next_cursor ?? undefined
      : undefined;
  } while (startCursor);

  return existingRecords;
}

function buildIngredientProperties(
  ingredientName: string,
  mealName: string,
  schema: IngredientDatabaseSchema,
  mealPageId: string | null
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

  if (schema.mealRelationPropertyName && mealPageId) {
    properties[schema.mealRelationPropertyName] = relation([mealPageId]);
  }

  return properties;
}

function buildUpdatedRelationIds(
  record: ExistingIngredientRecord,
  mealPageId: string | null
) {
  if (!mealPageId || record.relationIds.includes(mealPageId)) {
    return null;
  }

  return [...record.relationIds, mealPageId];
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
    ingredients: body.ingredients,
    mealPageId:
      typeof body.mealPageId === "string" && body.mealPageId.trim()
        ? body.mealPageId.trim()
        : null
  };
}

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "notion-save-ingredients",
    rateLimit: 30
  });

  if (guardResponse) {
    return guardResponse;
  }

  const body = await readJsonWithLimit(request, 80_000);

  if (body instanceof NextResponse) {
    return body;
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
      duplicateCount: normalizedList.duplicateCount,
      relatedCount: 0,
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
    let mealsDatabaseId: string | null = null;
    let mealDataSourceId: string | null = null;

    if (validatedRequest.mealPageId) {
      const { NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
      const mealsDatabase = await notion.databases.retrieve({
        database_id: NOTION_MEALS_DATABASE_ID
      });
      mealsDatabaseId = NOTION_MEALS_DATABASE_ID;
      mealDataSourceId = getPrimaryDataSourceId(mealsDatabase);
    }

    const schema = getIngredientDatabaseSchema(
      dataSource,
      mealsDatabaseId,
      mealDataSourceId
    );
    console.info("Notion save ingredients schema", describeSchema(schema));
    const existingRecords = await listExistingIngredientRecords(
      notion,
      dataSourceId,
      schema.titlePropertyName,
      schema.mealRelationPropertyName
    );

    let createdCount = 0;
    let skippedCount = normalizedList.duplicateCount;
    let duplicateCount = normalizedList.duplicateCount;
    let relatedCount = 0;
    let relationWarning: string | undefined;

    if (validatedRequest.mealPageId && !schema.mealRelationPropertyName) {
      console.info("Ingredients relation property not found", {
        ingredientsDatabaseId: NOTION_INGREDIENTS_DATABASE_ID,
        mealsDatabaseId,
        mealDataSourceId
      });
      relationWarning =
        "Ingredients -> Meals relation property is missing. Ingredients were saved without a Meal relation.";
    }

    for (const ingredient of ingredients) {
      const existingRecord = existingRecords.get(ingredient.key);

      if (existingRecord) {
        skippedCount += 1;
        duplicateCount += 1;

        const updatedRelationIds = buildUpdatedRelationIds(
          existingRecord,
          schema.mealRelationPropertyName ? validatedRequest.mealPageId : null
        );

        if (schema.mealRelationPropertyName && updatedRelationIds) {
          if (existingRecord.relationHasMore) {
            relationWarning =
              "At least one Ingredient relation has more linked pages than the Notion page payload returned, so it was not updated to avoid overwriting existing relations.";
          } else {
            await notion.pages.update({
              page_id: existingRecord.pageId,
              properties: {
                [schema.mealRelationPropertyName]: relation(updatedRelationIds)
              }
            });
            existingRecord.relationIds = updatedRelationIds;
            relatedCount += 1;
          }
        }

        continue;
      }

      const page = await notion.pages.create({
        parent: {
          database_id: NOTION_INGREDIENTS_DATABASE_ID
        },
        properties: buildIngredientProperties(
          ingredient.name,
          validatedRequest.mealName,
          schema,
          validatedRequest.mealPageId
        )
      });

      existingRecords.set(ingredient.key, {
        key: ingredient.key,
        pageId: page.id,
        relationIds:
          schema.mealRelationPropertyName && validatedRequest.mealPageId
            ? [validatedRequest.mealPageId]
            : [],
        relationHasMore: false
      });
      createdCount += 1;

      if (schema.mealRelationPropertyName && validatedRequest.mealPageId) {
        relatedCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      duplicateCount,
      relatedCount,
      malformedCount: normalizedList.malformedCount,
      relationWarning
    });
  } catch (error) {
    console.error("Notion save ingredients API failure", error);

    return NextResponse.json(
      { error: "Unable to save ingredients to Notion right now." },
      { status: 500 }
    );
  }
}
