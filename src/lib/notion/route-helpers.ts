import { NextResponse } from "next/server";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasTitle(value: unknown): value is { title: Array<{ plain_text?: string }> } {
  return isRecord(value) && Array.isArray(value.title);
}

export function getDatabaseTitle(database: unknown) {
  if (!hasTitle(database)) {
    return "Untitled database";
  }

  const title = database.title
    .map((part) => part.plain_text ?? "")
    .join("")
    .trim();

  return title || "Untitled database";
}

export function getPrimaryDataSourceId(
  database: unknown,
  errorMessage = "Database did not return a queryable data source."
) {
  if (
    isRecord(database) &&
    Array.isArray(database.data_sources) &&
    database.data_sources.length > 0 &&
    isRecord(database.data_sources[0]) &&
    typeof database.data_sources[0].id === "string"
  ) {
    return database.data_sources[0].id;
  }

  throw new Error(errorMessage);
}

export function getNotionPageUrl(page: { id: string; url?: string }) {
  if (!page.url) {
    throw new Error(`Notion did not return a page URL for page ${page.id}.`);
  }

  return page.url;
}

export function validationError(message: string, details?: string[]) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {})
    },
    { status: 400 }
  );
}

export function getPropertyType(property: unknown) {
  if (isRecord(property) && typeof property.type === "string") {
    return property.type;
  }

  return null;
}

export function getPropertyRecord(value: unknown) {
  if (isRecord(value) && isRecord(value.properties)) {
    return value.properties;
  }

  return {};
}

export function isObjectWithProperties(
  value: unknown
): value is { id: string; properties: Record<string, unknown> } {
  return isRecord(value) && typeof value.id === "string" && isRecord(value.properties);
}
