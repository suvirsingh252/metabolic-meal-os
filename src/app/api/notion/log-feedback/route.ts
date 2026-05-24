import { NextResponse } from "next/server";
import { getNotionFeedbackEnv, getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { mapMealFeedbackToNotionProperties } from "@/src/lib/notion/mappers";
import {
  energyAfterOptions,
  hungerLaterOptions,
  type EnergyAfter,
  type HungerLater,
  type MealFeedbackRequest
} from "@/src/lib/types/feedback";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isEnumValue<TValue extends string>(
  value: unknown,
  options: readonly TValue[]
): value is TValue {
  return typeof value === "string" && options.includes(value as TValue);
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function getNotionPageUrl(page: { id: string; url?: string }) {
  if (!page.url) {
    throw new Error(`Notion did not return a page URL for page ${page.id}.`);
  }

  return page.url;
}

function hasMealRelationProperty(dataSource: unknown) {
  if (!isRecord(dataSource) || !isRecord(dataSource.properties)) {
    return null;
  }

  const mealProperty = dataSource.properties.Meal;

  if (isRecord(mealProperty) && mealProperty.type === "relation") {
    return "Meal";
  }

  return null;
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
  const exactMealProperty = hasMealRelationProperty(dataSource);

  if (exactMealProperty) {
    return exactMealProperty;
  }

  if (!isRecord(dataSource) || !isRecord(dataSource.properties)) {
    return null;
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

function summarizeProperties(dataSource: unknown) {
  if (!isRecord(dataSource) || !isRecord(dataSource.properties)) {
    return [];
  }

  return Object.entries(dataSource.properties)
    .map(([name, property]) => ({
      name,
      type:
        isRecord(property) && typeof property.type === "string"
          ? property.type
          : "unknown",
      relationTarget: getRelationTarget(property)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

  throw new Error("Meal Feedback database did not return a queryable data source.");
}

function validateFeedback(body: unknown): MealFeedbackRequest | NextResponse {
  if (!isRecord(body)) {
    return validationError("Request body must be a JSON object.");
  }

  if (!isString(body.feedbackEntry)) {
    return validationError("feedbackEntry is required.");
  }

  if (!isEnumValue<EnergyAfter>(body.energyAfter, energyAfterOptions)) {
    return validationError("energyAfter is required.");
  }

  if (!isEnumValue<HungerLater>(body.hungerLater, hungerLaterOptions)) {
    return validationError("hungerLater is required.");
  }

  if (typeof body.cravingsLater !== "boolean") {
    return validationError("cravingsLater is required.");
  }

  if (typeof body.wouldRepeat !== "boolean") {
    return validationError("wouldRepeat is required.");
  }

  if (typeof body.notes !== "string") {
    return validationError("notes must be a string.");
  }

  if (
    body.selectedMealId !== undefined &&
    body.selectedMealId !== null &&
    typeof body.selectedMealId !== "string"
  ) {
    return validationError("selectedMealId must be a string or null.");
  }

  const selectedMealId =
    typeof body.selectedMealId === "string" && body.selectedMealId.trim()
      ? body.selectedMealId.trim()
      : null;

  return {
    feedbackEntry: body.feedbackEntry.trim(),
    selectedMealId,
    energyAfter: body.energyAfter,
    hungerLater: body.hungerLater,
    cravingsLater: body.cravingsLater,
    wouldRepeat: body.wouldRepeat,
    notes: body.notes.trim()
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return validationError("Request body must be valid JSON.");
  }

  const feedback = validateFeedback(body);

  if (feedback instanceof NextResponse) {
    return feedback;
  }

  try {
    const { NOTION_API_KEY, NOTION_FEEDBACK_DATABASE_ID } =
      getNotionFeedbackEnv();
    const { NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
    const notion = getNotionClient(NOTION_API_KEY);
    let includeMealRelation = false;
    let mealRelationPropertyName: string | undefined;
    let warning: string | undefined;

    if (feedback.selectedMealId) {
      const database = await notion.databases.retrieve({
        database_id: NOTION_FEEDBACK_DATABASE_ID
      });
      const mealsDatabase = await notion.databases.retrieve({
        database_id: NOTION_MEALS_DATABASE_ID
      });
      const mealDataSourceId = getPrimaryDataSourceId(mealsDatabase);
      const dataSource = await notion.dataSources.retrieve({
        data_source_id: getPrimaryDataSourceId(database)
      });
      mealRelationPropertyName = findMealRelationProperty(
        dataSource,
        NOTION_MEALS_DATABASE_ID,
        mealDataSourceId
      ) ?? undefined;
      includeMealRelation = Boolean(mealRelationPropertyName);

      if (!includeMealRelation) {
        console.info("Meal Feedback relation property not found", {
          feedbackDatabaseId: NOTION_FEEDBACK_DATABASE_ID,
          mealsDatabaseId: NOTION_MEALS_DATABASE_ID,
          mealDataSourceId,
          feedbackProperties: summarizeProperties(dataSource)
        });
        warning =
          "Meal Feedback -> Meals relation property is missing. Feedback was saved without a Meal relation.";
      }
    }

    const page = await notion.pages.create({
      parent: {
        database_id: NOTION_FEEDBACK_DATABASE_ID
      },
      properties: mapMealFeedbackToNotionProperties(feedback, {
        includeMealRelation,
        mealRelationPropertyName
      })
    });

    return NextResponse.json({
      success: true,
      notionPageId: page.id,
      notionUrl: getNotionPageUrl(page),
      warning
    });
  } catch (error) {
    console.error("Notion log feedback API failure", error);

    return NextResponse.json(
      { error: "Unable to save meal feedback to Notion right now." },
      { status: 500 }
    );
  }
}
