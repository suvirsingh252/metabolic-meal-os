import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface IngredientSummary {
  id: string;
  name: string;
  url: string;
  category?: string | null;
  proteinSource?: boolean;
  fiberSource?: boolean;
  staple?: boolean;
  householdFavorite?: boolean;
  nutrientConfidence?: string | null;
  fdcDescription?: string | null;
}

type NotionProperty = PageObjectResponse["properties"][string];

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

export function mapIngredientPageToSummary(
  page: PageObjectResponse,
  titlePropertyName: string
): IngredientSummary | null {
  const name = readTitle(page.properties[titlePropertyName]);

  if (!name) {
    return null;
  }

  return {
    id: page.id,
    name,
    url: page.url,
    category: readText(page.properties, "Category"),
    proteinSource: readCheckbox(page.properties, "Protein Source"),
    fiberSource: readCheckbox(page.properties, "Fiber Source"),
    staple: readCheckbox(page.properties, "Staple"),
    householdFavorite: readCheckbox(page.properties, "Household Favorite"),
    nutrientConfidence: readText(page.properties, "Nutrient Confidence"),
    fdcDescription: readText(page.properties, "FDC Description")
  };
}
