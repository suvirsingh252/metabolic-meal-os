import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import {
  mapNotionPageToMealSummary,
  type MealSummary
} from "@/src/lib/notion/meal-summary";
import { collectAllPages } from "@/src/lib/notion/pagination";
import { getPrimaryDataSourceId, isRecord } from "@/src/lib/notion/route-helpers";

const MEALS_DATA_SOURCE_ERROR =
  "Meals database did not return a queryable data source.";

function getProperties(database: unknown) {
  if (isRecord(database) && isRecord(database.properties)) {
    return database.properties;
  }

  return {};
}

function getPropertyType(property: unknown) {
  if (isRecord(property) && typeof property.type === "string") {
    return property.type;
  }

  return null;
}

export function findHouseholdIdProperty(schemaSource: unknown) {
  const properties = getProperties(schemaSource);

  return ["Household ID", "householdId"].find((name) => {
    const type = getPropertyType(properties[name]);
    return type === "rich_text";
  });
}

export function buildHouseholdFilter(propertyName: string | undefined, householdId: string) {
  if (!propertyName) {
    return undefined;
  }

  // Show records tagged to this household plus legacy/manually-added rows that
  // have no Household ID yet, while still excluding records explicitly tagged
  // to a different household. Without the is_empty branch, every recipe added
  // before household tagging (or added directly in Notion) is hidden.
  return {
    or: [
      {
        property: propertyName,
        rich_text: {
          equals: householdId
        }
      },
      {
        property: propertyName,
        rich_text: {
          is_empty: true as const
        }
      }
    ]
  };
}

export interface QueryMealSummariesOptions {
  pageSize?: number;
  cursor?: string;
  search?: string;
}

export interface QueryMealSummariesResult {
  meals: MealSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function queryMealSummaries(
  options: QueryMealSummariesOptions = {}
): Promise<QueryMealSummariesResult> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const search = options.search?.trim().toLowerCase() ?? "";
  const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
  const notion = getNotionClient(NOTION_API_KEY);
  const database = await notion.databases.retrieve({
    database_id: NOTION_MEALS_DATABASE_ID
  });
  const dataSourceId = getPrimaryDataSourceId(database, MEALS_DATA_SOURCE_ERROR);
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: dataSourceId
  });
  const householdIdProperty = findHouseholdIdProperty(dataSource);
  const household = getConfiguredHouseholdMetadata();

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: pageSize,
    start_cursor: options.cursor,
    filter: buildHouseholdFilter(householdIdProperty, household.householdId),
    sorts: [
      {
        timestamp: "created_time",
        direction: "descending"
      }
    ]
  });

  const meals = response.results
    .map(mapNotionPageToMealSummary)
    .filter((meal): meal is MealSummary => meal !== null)
    .filter((meal) =>
      search
        ? meal.mealName.toLowerCase().includes(search) ||
          (meal.cuisine ?? "").toLowerCase().includes(search) ||
          (meal.mealType ?? "").toLowerCase().includes(search)
        : true
    );

  return {
    meals,
    nextCursor: response.next_cursor,
    hasMore: response.has_more
  };
}

/**
 * Fetch every matching meal by following Notion's pagination cursor. Use this
 * wherever the caller needs the complete set (list views, dashboards, planner)
 * rather than a single page; a lone `queryMealSummaries` call silently caps at
 * one page (max 100 records).
 */
export async function queryAllMealSummaries(
  options: Omit<QueryMealSummariesOptions, "cursor"> = {}
): Promise<{ meals: MealSummary[] }> {
  const meals = await collectAllPages<MealSummary>(async (cursor) => {
    const page = await queryMealSummaries({ ...options, pageSize: 100, cursor });

    return {
      items: page.meals,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore
    };
  });

  return { meals };
}
