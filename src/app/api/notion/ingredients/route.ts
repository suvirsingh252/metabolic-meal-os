import { NextResponse } from "next/server";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getNotionIngredientsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { mapIngredientPageToSummary } from "@/src/lib/notion/ingredient-summary";
import {
  getPrimaryDataSourceId,
  isRecord
} from "@/src/lib/notion/route-helpers";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

const INGREDIENTS_DATA_SOURCE_ERROR =
  "Ingredients database did not return a queryable data source.";

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

function parseListParams(request: Request) {
  const url = new URL(request.url);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize") ?? 50), 1),
    100
  );

  return {
    pageSize,
    cursor: url.searchParams.get("cursor") ?? undefined,
    search: url.searchParams.get("search")?.trim().toLowerCase() ?? ""
  };
}

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "notion-ingredients-list",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const params = parseListParams(request);
    const { NOTION_API_KEY, NOTION_INGREDIENTS_DATABASE_ID } =
      getNotionIngredientsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: NOTION_INGREDIENTS_DATABASE_ID
    });
    const dataSourceId = getPrimaryDataSourceId(database, INGREDIENTS_DATA_SOURCE_ERROR);
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: dataSourceId
    });
    const titlePropertyName = getTitlePropertyName(dataSource);
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: params.pageSize,
      start_cursor: params.cursor
    });

    const ingredients = response.results
      .filter(isFullPage)
      .map((page) => mapIngredientPageToSummary(page, titlePropertyName))
      .filter((ingredient) => ingredient !== null)
      .filter((ingredient) =>
        params.search
          ? ingredient.name.toLowerCase().includes(params.search) ||
            (ingredient.category ?? "").toLowerCase().includes(params.search)
          : true
      );

    ingredients.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      ingredients,
      nextCursor: response.next_cursor,
      hasMore: response.has_more
    });
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
