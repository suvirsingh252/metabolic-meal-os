import { NextResponse } from "next/server";
import { getServerEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";

export const runtime = "nodejs";

function hasTitle(value: unknown): value is { title: Array<{ plain_text?: string }> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    Array.isArray(value.title)
  );
}

function getDatabaseTitle(database: unknown) {
  if (!hasTitle(database)) {
    return "Untitled database";
  }

  const title = database.title
    ?.map((part) => part.plain_text ?? "")
    .join("")
    .trim();

  return title || "Untitled database";
}

export async function GET() {
  try {
    const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getServerEnv();

    if (!NOTION_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Notion API key is not configured." },
        { status: 500 }
      );
    }

    if (!NOTION_MEALS_DATABASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Meals database ID is not configured." },
        { status: 500 }
      );
    }

    const notion = getNotionClient();
    const database = await notion.databases.retrieve({
      database_id: NOTION_MEALS_DATABASE_ID
    });

    return NextResponse.json({
      ok: true,
      databaseTitle: getDatabaseTitle(database),
      databaseId: database.id
    });
  } catch (error) {
    console.error("Notion diagnostics failure", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to verify Notion connection. Check the API key, database ID, and database sharing."
      },
      { status: 500 }
    );
  }
}
