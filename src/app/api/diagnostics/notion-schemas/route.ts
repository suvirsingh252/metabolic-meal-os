import { NextResponse } from "next/server";
import {
  getNotionFeedbackEnv,
  getNotionIngredientsEnv,
  getNotionMealsEnv
} from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";

export const runtime = "nodejs";

type DatabaseKey = "meals" | "ingredients" | "feedback";

interface SchemaSummary {
  key: DatabaseKey;
  id: string;
  title: string;
  properties: Array<{
    name: string;
    type: string;
  }>;
}

interface SchemaFailure {
  key: DatabaseKey;
  ok: false;
  error: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasTitle(value: unknown): value is { title: Array<{ plain_text?: string }> } {
  return isRecord(value) && Array.isArray(value.title);
}

function getDatabaseTitle(database: unknown) {
  if (!hasTitle(database)) {
    return "Untitled database";
  }

  const title = database.title
    .map((part) => part.plain_text ?? "")
    .join("")
    .trim();

  return title || "Untitled database";
}

function getProperties(database: unknown) {
  if (!isRecord(database) || !isRecord(database.properties)) {
    return [];
  }

  return Object.entries(database.properties)
    .map(([name, property]) => ({
      name,
      type:
        isRecord(property) && typeof property.type === "string"
          ? property.type
          : "unknown"
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

  throw new Error("Database did not return a queryable data source.");
}

function getSafeSchemaError(key: DatabaseKey) {
  return `Unable to read ${key} database schema. Check the database ID and integration sharing.`;
}

async function readSchema(
  key: DatabaseKey,
  getEnv: () => { NOTION_API_KEY: string } & Record<string, string>,
  databaseIdKey:
    | "NOTION_MEALS_DATABASE_ID"
    | "NOTION_INGREDIENTS_DATABASE_ID"
    | "NOTION_FEEDBACK_DATABASE_ID"
): Promise<SchemaSummary | SchemaFailure> {
  try {
    const env = getEnv();
    const notion = getNotionClient(env.NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: env[databaseIdKey]
    });
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: getPrimaryDataSourceId(database)
    });

    return {
      key,
      id: database.id,
      title: getDatabaseTitle(database),
      properties: getProperties(dataSource)
    };
  } catch (error) {
    console.error(`Notion ${key} schema diagnostics failure`, error);

    return {
      key,
      ok: false,
      error: getSafeSchemaError(key)
    };
  }
}

export async function GET() {
  const results = await Promise.all([
    readSchema("meals", getNotionMealsEnv, "NOTION_MEALS_DATABASE_ID"),
    readSchema(
      "ingredients",
      getNotionIngredientsEnv,
      "NOTION_INGREDIENTS_DATABASE_ID"
    ),
    readSchema("feedback", getNotionFeedbackEnv, "NOTION_FEEDBACK_DATABASE_ID")
  ]);

  const databases = results.filter(
    (result): result is SchemaSummary => !("ok" in result)
  );
  const errors = results.filter(
    (result): result is SchemaFailure => "ok" in result && !result.ok
  );

  return NextResponse.json({
    ok: errors.length === 0,
    databases,
    errors
  });
}
