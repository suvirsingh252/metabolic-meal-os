import { NextResponse } from "next/server";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getNotionIngredientsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { mapIngredientPageToSummary } from "@/src/lib/notion/ingredient-summary";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function getProperties(dataSource: unknown) {
  if (isRecord(dataSource) && isRecord(dataSource.properties)) {
    return dataSource.properties;
  }

  throw new Error("Ingredients data source did not return properties.");
}

function getPropertyType(property: unknown) {
  if (isRecord(property) && typeof property.type === "string") {
    return property.type;
  }

  return null;
}

function getTitlePropertyName(dataSource: unknown) {
  const properties = getProperties(dataSource);
  const titleEntry = Object.entries(properties).find(
    ([, property]) => getPropertyType(property) === "title"
  );

  if (!titleEntry) {
    throw new Error("Ingredients data source does not have a title property.");
  }

  return titleEntry[0];
}

function isFullPage(page: unknown): page is PageObjectResponse {
  return isRecord(page) && isRecord(page.properties);
}

export async function GET() {
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
    const titlePropertyName = getTitlePropertyName(dataSource);
    const ingredients = [];
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

        const ingredient = mapIngredientPageToSummary(page, titlePropertyName);

        if (ingredient) {
          ingredients.push(ingredient);
        }
      }

      startCursor = response.has_more
        ? response.next_cursor ?? undefined
        : undefined;
    } while (startCursor);

    ingredients.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error("Notion ingredients list failure", error);

    return NextResponse.json(
      {
        error:
          "Unable to load Ingredients from Notion. Check the Ingredients database ID and integration sharing."
      },
      { status: 500 }
    );
  }
}
