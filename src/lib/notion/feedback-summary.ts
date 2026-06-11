import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getNotionFeedbackEnv, getNotionMealsEnv } from "@/src/lib/env";
import {
  summarizeMealFeedback,
  type MealFeedbackEvent,
  type MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";
import { getNotionClient } from "@/src/lib/notion/client";
import type { EnergyAfter, HungerLater } from "@/src/lib/types/feedback";

type NotionProperty = PageObjectResponse["properties"][string];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFullPage(page: unknown): page is PageObjectResponse {
  return (
    typeof page === "object" &&
    page !== null &&
    "properties" in page &&
    "created_time" in page
  );
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

  throw new Error("Feedback database did not return a queryable data source.");
}

function getRelationTarget(property: unknown) {
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

function findMealRelationProperty(
  dataSource: unknown,
  mealDatabaseId: string,
  mealDataSourceId: string
) {
  if (!isRecord(dataSource) || !isRecord(dataSource.properties)) {
    return null;
  }

  const exactMealProperty = dataSource.properties.Meal;

  if (isRecord(exactMealProperty) && exactMealProperty.type === "relation") {
    return "Meal";
  }

  for (const [name, property] of Object.entries(dataSource.properties)) {
    const target = getRelationTarget(property);

    if (
      target &&
      (target.databaseId === mealDatabaseId || target.dataSourceId === mealDataSourceId)
    ) {
      return name;
    }
  }

  return null;
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

function readRichText(property: NotionProperty | undefined) {
  if (!property || property.type !== "rich_text") {
    return null;
  }

  const value = property.rich_text
    .map((part) => part.plain_text)
    .join("")
    .trim();

  return value || null;
}

function readSelect(property: NotionProperty | undefined) {
  if (!property || property.type !== "select") {
    return null;
  }

  return property.select?.name ?? null;
}

function readCheckbox(property: NotionProperty | undefined) {
  if (!property || property.type !== "checkbox") {
    return null;
  }

  return property.checkbox;
}

function readMealId(property: NotionProperty | undefined) {
  if (!property || property.type !== "relation") {
    return null;
  }

  return property.relation[0]?.id ?? null;
}

function mapNotionPageToFeedbackEvent(
  page: unknown,
  mealRelationPropertyName: string
): MealFeedbackEvent | null {
  if (!isFullPage(page)) {
    return null;
  }

  const mealId = readMealId(page.properties[mealRelationPropertyName]);

  if (!mealId) {
    return null;
  }

  return {
    mealId,
    createdAt: page.created_time,
    feedbackEntry: readTitle(page.properties["Feedback Entry"]),
    energyAfter: readSelect(page.properties["Energy After"]) as EnergyAfter | null,
    hungerLater: readSelect(page.properties["Hunger Later"]) as HungerLater | null,
    cravingsLater: readCheckbox(page.properties["Cravings Later"]),
    wouldRepeat: readCheckbox(page.properties["Would Repeat"]),
    notes: readRichText(page.properties.Notes)
  };
}

export async function queryMealFeedbackSummaries(
  options: { pageSize?: number } = {}
): Promise<MealFeedbackSummaryByMealId> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 100, 1), 100);
  const { NOTION_API_KEY, NOTION_FEEDBACK_DATABASE_ID } =
    getNotionFeedbackEnv();
  const { NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
  const notion = getNotionClient(NOTION_API_KEY);
  const feedbackDatabase = await notion.databases.retrieve({
    database_id: NOTION_FEEDBACK_DATABASE_ID
  });
  const mealsDatabase = await notion.databases.retrieve({
    database_id: NOTION_MEALS_DATABASE_ID
  });
  const feedbackDataSourceId = getPrimaryDataSourceId(feedbackDatabase);
  const mealDataSourceId = getPrimaryDataSourceId(mealsDatabase);
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: feedbackDataSourceId
  });
  const mealRelationPropertyName = findMealRelationProperty(
    dataSource,
    NOTION_MEALS_DATABASE_ID,
    mealDataSourceId
  );

  if (!mealRelationPropertyName) {
    return {};
  }

  const response = await notion.dataSources.query({
    data_source_id: feedbackDataSourceId,
    page_size: pageSize,
    sorts: [
      {
        timestamp: "created_time",
        direction: "descending"
      }
    ]
  });
  const events = response.results
    .map((page) => mapNotionPageToFeedbackEvent(page, mealRelationPropertyName))
    .filter((event): event is MealFeedbackEvent => event !== null);

  return summarizeMealFeedback(events);
}
