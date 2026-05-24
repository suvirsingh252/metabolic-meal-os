import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getNotionIngredientsEnv } from "@/src/lib/env";
import { normalizeIngredientKey } from "@/src/lib/ingredients";
import { getNotionClient } from "@/src/lib/notion/client";
import type { MealKnownIngredientContext } from "@/src/lib/types/meal";

interface IngredientContextOptions {
  text: string;
  ingredientSuggestions?: string[];
  maxResults?: number;
}

interface IngredientContextResult {
  ingredients: MealKnownIngredientContext[];
  promptContext: string;
}

type NotionProperty = PageObjectResponse["properties"][string];

const defaultMaxResults = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  throw new Error("Ingredients database did not return a queryable data source.");
}

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

function readTitle(property: NotionProperty | undefined) {
  if (!property || property.type !== "title") {
    return "";
  }

  return property.title
    .map((part) => part.plain_text)
    .join("")
    .trim();
}

function readCheckbox(properties: PageObjectResponse["properties"], name: string) {
  const property = properties[name];

  if (!property || property.type !== "checkbox") {
    return undefined;
  }

  return property.checkbox;
}

function readNumber(properties: PageObjectResponse["properties"], name: string) {
  const property = properties[name];

  if (!property || property.type !== "number") {
    return null;
  }

  return property.number;
}

function readText(properties: PageObjectResponse["properties"], name: string) {
  const property = properties[name];

  if (!property) {
    return null;
  }

  if (property.type === "rich_text") {
    const value = property.rich_text
      .map((part) => part.plain_text)
      .join("")
      .trim();

    return value || null;
  }

  if (property.type === "select") {
    return property.select?.name ?? null;
  }

  return null;
}

function mapIngredientPage(
  page: PageObjectResponse,
  titlePropertyName: string
): MealKnownIngredientContext | null {
  const ingredientName = readTitle(page.properties[titlePropertyName]);

  if (!ingredientName) {
    return null;
  }

  return {
    ingredientName,
    proteinSource: readCheckbox(page.properties, "Protein Source"),
    fiberSource: readCheckbox(page.properties, "Fiber Source"),
    staple: readCheckbox(page.properties, "Staple"),
    householdFavorite: readCheckbox(page.properties, "Household Favorite"),
    nutrientConfidence: readText(page.properties, "Nutrient Confidence"),
    fdcDescription: readText(page.properties, "FDC Description"),
    proteinG: readNumber(page.properties, "Protein (g)"),
    fiberG: readNumber(page.properties, "Fiber (g)"),
    carbohydratesG: readNumber(page.properties, "Carbohydrates (g)"),
    energyKcal: readNumber(page.properties, "Energy (kcal)")
  };
}

function buildMatchText(options: IngredientContextOptions) {
  return [
    options.text,
    ...(options.ingredientSuggestions ?? [])
  ]
    .join("\n")
    .toLowerCase();
}

function ingredientMatches(
  ingredient: MealKnownIngredientContext,
  normalizedMatchText: string
) {
  const key = normalizeIngredientKey(ingredient.ingredientName);

  if (!key || key.length < 3) {
    return false;
  }

  return normalizedMatchText.includes(key);
}

function formatBooleanLabel(label: string, value: boolean | undefined) {
  return value ? label : null;
}

function formatNumberLabel(label: string, value: number | null | undefined) {
  return typeof value === "number" ? `${label}: ${value}` : null;
}

export function formatIngredientContextForPrompt(
  ingredients: MealKnownIngredientContext[]
) {
  if (ingredients.length === 0) {
    return "";
  }

  return [
    "Known household ingredient context:",
    ...ingredients.map((ingredient) => {
      const details = [
        formatBooleanLabel("protein source", ingredient.proteinSource),
        formatBooleanLabel("fiber source", ingredient.fiberSource),
        formatBooleanLabel("staple", ingredient.staple),
        formatBooleanLabel("household favorite", ingredient.householdFavorite),
        formatNumberLabel("protein g", ingredient.proteinG),
        formatNumberLabel("fiber g", ingredient.fiberG),
        formatNumberLabel("carbs g", ingredient.carbohydratesG),
        formatNumberLabel("energy kcal", ingredient.energyKcal),
        ingredient.nutrientConfidence
          ? `nutrient confidence: ${ingredient.nutrientConfidence}`
          : null,
        ingredient.fdcDescription
          ? `FDC description: ${ingredient.fdcDescription}`
          : null
      ].filter(Boolean);

      return `- ${ingredient.ingredientName}: ${details.join("; ") || "known ingredient"}`;
    })
  ].join("\n");
}

export async function getKnownIngredientContext(
  options: IngredientContextOptions
): Promise<IngredientContextResult> {
  const { NOTION_API_KEY, NOTION_INGREDIENTS_DATABASE_ID } =
    getNotionIngredientsEnv();
  const notion = getNotionClient(NOTION_API_KEY);
  const database = await notion.databases.retrieve({
    database_id: NOTION_INGREDIENTS_DATABASE_ID
  });
  const dataSourceId = getPrimaryDataSourceId(database);
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: dataSourceId
  });
  const titlePropertyName = getTitlePropertyName(dataSource);
  const normalizedMatchText = normalizeIngredientKey(buildMatchText(options));
  const ingredients: MealKnownIngredientContext[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor
    });

    for (const page of response.results) {
      if (!isFullPage(page)) {
        continue;
      }

      const ingredient = mapIngredientPage(page, titlePropertyName);

      if (ingredient && ingredientMatches(ingredient, normalizedMatchText)) {
        ingredients.push(ingredient);
      }

      if (ingredients.length >= (options.maxResults ?? defaultMaxResults)) {
        break;
      }
    }

    if (ingredients.length >= (options.maxResults ?? defaultMaxResults)) {
      break;
    }

    startCursor = response.has_more
      ? response.next_cursor ?? undefined
      : undefined;
  } while (startCursor);

  return {
    ingredients,
    promptContext: formatIngredientContextForPrompt(ingredients)
  };
}
