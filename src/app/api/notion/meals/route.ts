import { NextResponse } from "next/server";
import { getNotionMealsEnv } from "@/src/lib/env";
import { mapNotionPageToMealSummary } from "@/src/lib/notion/meal-summary";
import { getNotionClient } from "@/src/lib/notion/client";

export const runtime = "nodejs";

function getPrimaryDataSourceId(database: unknown) {
  if (
    typeof database === "object" &&
    database !== null &&
    "data_sources" in database &&
    Array.isArray(database.data_sources) &&
    database.data_sources.length > 0 &&
    typeof database.data_sources[0]?.id === "string"
  ) {
    return database.data_sources[0].id;
  }

  throw new Error("Meals database did not return a queryable data source.");
}

export async function GET() {
  try {
    const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: NOTION_MEALS_DATABASE_ID
    });
    const dataSourceId = getPrimaryDataSourceId(database);

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [
        {
          timestamp: "created_time",
          direction: "descending"
        }
      ]
    });

    const meals = response.results
      .map(mapNotionPageToMealSummary)
      .filter((meal) => meal !== null);

    return NextResponse.json({ meals });
  } catch (error) {
    console.error("Notion meals query failure", error);

    return NextResponse.json(
      { error: "Unable to load meals from Notion right now." },
      { status: 500 }
    );
  }
}
