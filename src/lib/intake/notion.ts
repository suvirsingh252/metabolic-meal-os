import { getNotionClient } from "@/src/lib/notion/client";
import type { IntakeClassification, IntakeRecord, IntakeStatus } from "@/src/lib/intake/types";

export function getIntakeDbId(): string | undefined {
  if (typeof window !== "undefined") return undefined;
  return process.env.NOTION_MEAL_INTAKE_DATABASE_ID?.trim() || undefined;
}

export function getIntakeApiKey(): string | undefined {
  if (typeof window !== "undefined") return undefined;
  return process.env.NOTION_API_KEY?.trim() || undefined;
}

function buildTitle(url?: string, text?: string): string {
  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return url.slice(0, 80);
    }
  }
  if (text) {
    return text.slice(0, 80);
  }
  return "iPhone share";
}

export interface SaveIntakeInput {
  url?: string;
  rawText?: string;
  source?: string;
  classification: IntakeClassification;
  createdAt: string;
  baseUrl?: string;
}

export interface SaveIntakeResult {
  id: string;
  analyzeUrl: string;
}

export async function saveIntakeToNotion(
  input: SaveIntakeInput
): Promise<SaveIntakeResult | null> {
  const dbId = getIntakeDbId();
  const apiKey = getIntakeApiKey();

  if (!dbId || !apiKey) {
    return null;
  }

  const notion = getNotionClient(apiKey);

  const properties: Record<string, unknown> = {
    Name: {
      title: [
        {
          text: { content: buildTitle(input.url, input.rawText) }
        }
      ]
    },
    Status: {
      select: { name: "Pending" }
    },
    "Created At": {
      date: { start: input.createdAt }
    }
  };

  if (input.url) {
    properties["URL"] = { url: input.url };
  }

  if (input.rawText) {
    properties["Raw Text"] = {
      rich_text: [{ text: { content: input.rawText.slice(0, 2000) } }]
    };
  }

  if (input.source) {
    properties["Source"] = {
      rich_text: [{ text: { content: input.source.slice(0, 200) } }]
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: dbId },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"]
  });

  const baseUrl = input.baseUrl ?? "https://metabolic-meal-os.vercel.app";
  const analyzeUrl = `${baseUrl}/analyze?intake=${page.id}`;

  return { id: page.id, analyzeUrl };
}

function isPageObject(page: unknown): page is {
  id: string;
  properties: Record<string, unknown>;
} {
  return (
    typeof page === "object" &&
    page !== null &&
    "id" in page &&
    "properties" in page
  );
}

function getRichText(prop: unknown): string | undefined {
  if (
    typeof prop === "object" &&
    prop !== null &&
    "rich_text" in prop &&
    Array.isArray((prop as { rich_text: unknown[] }).rich_text) &&
    (prop as { rich_text: unknown[] }).rich_text.length > 0
  ) {
    const first = (prop as { rich_text: { plain_text?: string }[] }).rich_text[0];
    return first?.plain_text ?? undefined;
  }
  return undefined;
}

function getUrlProp(prop: unknown): string | undefined {
  if (
    typeof prop === "object" &&
    prop !== null &&
    "url" in prop &&
    typeof (prop as { url: unknown }).url === "string"
  ) {
    return (prop as { url: string }).url || undefined;
  }
  return undefined;
}

function getSelectName(prop: unknown): string | undefined {
  if (
    typeof prop === "object" &&
    prop !== null &&
    "select" in prop &&
    typeof (prop as { select: { name?: string } | null }).select === "object" &&
    (prop as { select: { name?: string } | null }).select !== null
  ) {
    return (prop as { select: { name: string } }).select.name || undefined;
  }
  return undefined;
}

function getDateStart(prop: unknown): string | undefined {
  if (
    typeof prop === "object" &&
    prop !== null &&
    "date" in prop &&
    typeof (prop as { date: { start?: string } | null }).date === "object" &&
    (prop as { date: { start?: string } | null }).date !== null
  ) {
    return (prop as { date: { start: string } }).date.start || undefined;
  }
  return undefined;
}

function toIntakeClassification(value: string | undefined): IntakeClassification {
  const valid = new Set<IntakeClassification>([
    "recipe-url",
    "social-url",
    "plain-text",
    "unknown-url"
  ]);
  if (value && valid.has(value as IntakeClassification)) {
    return value as IntakeClassification;
  }
  return "unknown-url";
}

function toIntakeStatus(value: string | undefined): IntakeStatus {
  const map: Record<string, IntakeStatus> = {
    Pending: "pending",
    Analyzed: "analyzed",
    Error: "error"
  };
  return map[value ?? ""] ?? "pending";
}

export async function fetchIntakeRecord(id: string): Promise<IntakeRecord | null> {
  const apiKey = getIntakeApiKey();

  if (!id || !apiKey) {
    return null;
  }

  try {
    const notion = getNotionClient(apiKey);
    const page = await notion.pages.retrieve({ page_id: id });

    if (!isPageObject(page)) {
      return null;
    }

    const props = page.properties;

    return {
      id: page.id,
      url: getUrlProp(props["URL"]),
      rawText: getRichText(props["Raw Text"]),
      source: getRichText(props["Source"]),
      classification: toIntakeClassification(getRichText(props["Classification"]) ?? getSelectName(props["Classification"])),
      status: toIntakeStatus(getSelectName(props["Status"])),
      createdAt: getDateStart(props["Created At"]) ?? new Date().toISOString(),
      error: getRichText(props["Error"])
    };
  } catch {
    return null;
  }
}
