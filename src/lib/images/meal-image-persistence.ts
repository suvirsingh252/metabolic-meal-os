import type { UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { upsertMirrorMealFromSummary } from "@/src/lib/db/dinner-feedback";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import {
  getPrimaryDataSourceId,
  getPropertyRecord,
  getPropertyType
} from "@/src/lib/notion/route-helpers";
import type { MealImageMetadata } from "@/src/lib/types/meal";

type PageProperties = NonNullable<UpdatePageParameters["properties"]>;
const RICH_TEXT_BLOCK_LIMIT = 2000;
const RICH_TEXT_MAX_BLOCKS = 100;

function richText(content: string) {
  return { rich_text: [{ text: { content } }] };
}

function richTextChunks(content: string) {
  const chunks: Array<{ text: { content: string } }> = [];

  for (
    let offset = 0;
    offset < content.length && chunks.length < RICH_TEXT_MAX_BLOCKS;
    offset += RICH_TEXT_BLOCK_LIMIT
  ) {
    chunks.push({
      text: { content: content.slice(offset, offset + RICH_TEXT_BLOCK_LIMIT) }
    });
  }

  return {
    rich_text: chunks.length > 0 ? chunks : [{ text: { content: "" } }]
  };
}

function select(name: string) {
  return { select: { name } };
}

function url(content: string) {
  return { url: content };
}

function date(start: string) {
  return { date: { start } };
}

function findProperty(
  properties: Record<string, unknown>,
  names: string[],
  allowedTypes: string[]
) {
  return names
    .map((name) => [name, properties[name]] as const)
    .find(([, property]) => {
      const type = getPropertyType(property);
      return Boolean(type && allowedTypes.includes(type));
    });
}

function applyTextLike(
  properties: PageProperties,
  schemaProperties: Record<string, unknown>,
  names: string[],
  value: string | null
) {
  if (!value) {
    return;
  }

  const field = findProperty(schemaProperties, names, ["select", "rich_text"]);
  const type = field ? getPropertyType(field[1]) : null;

  if (!field || !type) {
    return;
  }

  properties[field[0]] = type === "select" ? select(value) : richText(value);
}

function applyUrlLike(
  properties: PageProperties,
  schemaProperties: Record<string, unknown>,
  names: string[],
  value: string | null
) {
  if (!value) {
    return;
  }

  const field = findProperty(schemaProperties, names, ["url", "rich_text"]);
  const type = field ? getPropertyType(field[1]) : null;

  if (!field || !type) {
    return;
  }

  properties[field[0]] = type === "url" ? url(value) : richText(value);
}

function applyDate(
  properties: PageProperties,
  schemaProperties: Record<string, unknown>,
  names: string[],
  value: string | null
) {
  if (!value) {
    return;
  }

  const field = findProperty(schemaProperties, names, ["date"]);

  if (field) {
    properties[field[0]] = date(value);
  }
}

export function buildImageNotionProperties(
  schemaProperties: Record<string, unknown>,
  metadata: MealImageMetadata
) {
  const properties: PageProperties = {};

  applyUrlLike(
    properties,
    schemaProperties,
    ["Image URL", "Image Url", "Hero Image", "imageUrl"],
    metadata.imageUrl
  );
  applyTextLike(
    properties,
    schemaProperties,
    ["Image Source", "imageSource"],
    metadata.imageSource
  );
  applyUrlLike(
    properties,
    schemaProperties,
    ["Image Original URL", "Original Image URL", "imageOriginalUrl"],
    metadata.imageOriginalUrl
  );
  applyTextLike(
    properties,
    schemaProperties,
    ["Image Prompt", "imagePrompt"],
    metadata.imagePrompt
  );
  applyTextLike(
    properties,
    schemaProperties,
    ["Image Attribution", "imageAttribution"],
    metadata.imageAttribution
  );
  applyTextLike(
    properties,
    schemaProperties,
    ["Image Status", "imageStatus"],
    metadata.imageStatus
  );
  applyDate(
    properties,
    schemaProperties,
    ["Image Last Updated", "imageLastUpdated"],
    metadata.imageLastUpdated
  );

  return properties;
}

function formatImageMetadataSection(metadata: MealImageMetadata) {
  return [
    "Image Metadata:",
    metadata.imageUrl ? `Image URL: ${metadata.imageUrl}` : null,
    metadata.imageSource ? `Image Source: ${metadata.imageSource}` : null,
    metadata.imageOriginalUrl
      ? `Original Image URL: ${metadata.imageOriginalUrl}`
      : null,
    metadata.imageAttribution
      ? `Image Attribution: ${metadata.imageAttribution}`
      : null,
    metadata.imageStatus ? `Image Status: ${metadata.imageStatus}` : null,
    metadata.imageLastUpdated
      ? `Image Last Updated: ${metadata.imageLastUpdated}`
      : null,
    metadata.imagePrompt ? `Image Prompt: ${metadata.imagePrompt}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function mergeImageMetadataIntoNotes(
  notes: string | null,
  metadata: MealImageMetadata
) {
  const section = formatImageMetadataSection(metadata);
  const base = notes?.trim() ?? "";
  const imageSectionPattern =
    /(^|\n\n)Image Metadata:\n[\s\S]*?(?=\n\nAnalysis Framework v2 Summary:|\n\nEvidence-Aware v3 Summary:|$)/;

  if (!base) {
    return section;
  }

  if (imageSectionPattern.test(base)) {
    return base.replace(imageSectionPattern, `$1${section}`);
  }

  return `${base}\n\n${section}`;
}

function applyNotesFallback(
  properties: PageProperties,
  schemaProperties: Record<string, unknown>,
  meal: MealSummary,
  metadata: MealImageMetadata
) {
  const notesField = findProperty(schemaProperties, ["Notes"], ["rich_text"]);

  if (!notesField) {
    return;
  }

  properties[notesField[0]] = richTextChunks(
    mergeImageMetadataIntoNotes(meal.notes, metadata)
  );
}

function imageCover(metadata: MealImageMetadata) {
  if (
    !metadata.imageUrl ||
    (!metadata.imageUrl.startsWith("http://") &&
      !metadata.imageUrl.startsWith("https://"))
  ) {
    return undefined;
  }

  return {
    type: "external" as const,
    external: {
      url: metadata.imageUrl
    }
  };
}

export function mergeMealImageMetadata(
  meal: MealSummary,
  metadata: MealImageMetadata
): MealSummary {
  return {
    ...meal,
    imageUrl: metadata.imageUrl,
    imageSource: metadata.imageSource,
    imageOriginalUrl: metadata.imageOriginalUrl,
    imagePrompt: metadata.imagePrompt,
    imageAttribution: metadata.imageAttribution,
    imageStatus: metadata.imageStatus,
    imageLastUpdated: metadata.imageLastUpdated
  };
}

export async function updateMealImageMetadata(
  meal: MealSummary,
  metadata: MealImageMetadata
) {
  const { NOTION_API_KEY, NOTION_MEALS_DATABASE_ID } = getNotionMealsEnv();
  const notion = getNotionClient(NOTION_API_KEY);
  const database = await notion.databases.retrieve({
    database_id: NOTION_MEALS_DATABASE_ID
  });
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: getPrimaryDataSourceId(
      database,
      "Meals database did not return a queryable data source."
    )
  });
  const schemaProperties = getPropertyRecord(dataSource);
  const properties = buildImageNotionProperties(schemaProperties, metadata);
  const cover = imageCover(metadata);
  applyNotesFallback(properties, schemaProperties, meal, metadata);

  if (cover || Object.keys(properties).length > 0) {
    await notion.pages.update({
      page_id: meal.id,
      cover,
      properties
    });
  }

  const household = getConfiguredHouseholdMetadata();
  const updatedMeal = mergeMealImageMetadata(meal, metadata);

  try {
    await upsertMirrorMealFromSummary({
      householdId: household.householdId,
      createdBy: household.createdBy,
      meal: updatedMeal
    });
  } catch (error) {
    console.warn(
      `[recipe-images] Postgres mirror image metadata update failed for ${meal.id}`,
      error
    );
  }

  return updatedMeal;
}
