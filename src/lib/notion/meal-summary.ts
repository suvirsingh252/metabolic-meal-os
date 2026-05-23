import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface MealSummary {
  id: string;
  url: string;
  mealName: string;
  cuisine: string | null;
  mealType: string | null;
  proteinLevel: string | null;
  satietyLevel: string | null;
  bloodSugarImpact: string | null;
  effortLevel: string | null;
  familyApproved: boolean;
  weeknightFriendly: boolean;
  comfortMeal: boolean;
  notes: string | null;
}

type NotionProperty = PageObjectResponse["properties"][string];

function isFullPage(page: unknown): page is PageObjectResponse {
  return (
    typeof page === "object" &&
    page !== null &&
    "properties" in page &&
    "url" in page
  );
}

function getProperty(
  page: PageObjectResponse,
  propertyName: string
): NotionProperty | undefined {
  return page.properties[propertyName];
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

function readSelect(property: NotionProperty | undefined) {
  if (!property || property.type !== "select") {
    return null;
  }

  return property.select?.name ?? null;
}

function readCheckbox(property: NotionProperty | undefined) {
  if (!property || property.type !== "checkbox") {
    return false;
  }

  return property.checkbox;
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

export function mapNotionPageToMealSummary(page: unknown): MealSummary | null {
  if (!isFullPage(page)) {
    return null;
  }

  return {
    id: page.id,
    url: page.url,
    mealName: readTitle(getProperty(page, "Meal Name")) || "Untitled meal",
    cuisine: readSelect(getProperty(page, "Cuisine")),
    mealType: readSelect(getProperty(page, "Meal Type")),
    proteinLevel: readSelect(getProperty(page, "Protein Level")),
    satietyLevel: readSelect(getProperty(page, "Satiety Level")),
    bloodSugarImpact: readSelect(getProperty(page, "Blood Sugar Impact")),
    effortLevel: readSelect(getProperty(page, "Effort Level")),
    familyApproved: readCheckbox(getProperty(page, "Family Approved")),
    weeknightFriendly: readCheckbox(getProperty(page, "Weeknight Friendly")),
    comfortMeal: readCheckbox(getProperty(page, "Comfort Meal")),
    notes: readRichText(getProperty(page, "Notes"))
  };
}
