import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface MealSummary {
  id: string;
  url: string;
  mealName: string;
  createdAt: string;
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
  calories: number | null;
  proteinG: number | null;
  carbohydratesG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  sugarG: number | null;
  nutritionConfidence: string | null;
  nutritionProvenance: string | null;
  qualityScore: number | null;
  metabolicScore: number | null;
  proteinScore: number | null;
  fiberScore: number | null;
  satietyScoreNumeric: number | null;
  bloodSugarRiskScore: number | null;
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

function readNumberProperty(property: NotionProperty | undefined) {
  if (!property || property.type !== "number") {
    return null;
  }

  return typeof property.number === "number" ? property.number : null;
}

function readFormulaNumber(property: NotionProperty | undefined) {
  if (!property || property.type !== "formula") {
    return null;
  }

  return property.formula.type === "number" &&
    typeof property.formula.number === "number"
    ? property.formula.number
    : null;
}

function readNumber(page: PageObjectResponse, propertyNames: string[]) {
  for (const propertyName of propertyNames) {
    const property = getProperty(page, propertyName);
    const value = readNumberProperty(property) ?? readFormulaNumber(property);

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function readTextLike(page: PageObjectResponse, propertyNames: string[]) {
  for (const propertyName of propertyNames) {
    const property = getProperty(page, propertyName);
    const value = readSelect(property) ?? readRichText(property);

    if (value) {
      return value;
    }
  }

  return null;
}

function parseScoreFromNotes(notes: string | null, label: string) {
  if (!notes) {
    return null;
  }

  const pattern = new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)\\/10`, "i");
  const match = notes.match(pattern);
  const value = match ? Number(match[1]) : NaN;

  return Number.isFinite(value) ? value : null;
}

export function mapNotionPageToMealSummary(page: unknown): MealSummary | null {
  if (!isFullPage(page)) {
    return null;
  }

  const notes = readRichText(getProperty(page, "Notes"));

  return {
    id: page.id,
    url: page.url,
    mealName: readTitle(getProperty(page, "Meal Name")) || "Untitled meal",
    createdAt: page.created_time,
    cuisine: readSelect(getProperty(page, "Cuisine")),
    mealType: readSelect(getProperty(page, "Meal Type")),
    proteinLevel: readSelect(getProperty(page, "Protein Level")),
    satietyLevel: readSelect(getProperty(page, "Satiety Level")),
    bloodSugarImpact: readSelect(getProperty(page, "Blood Sugar Impact")),
    effortLevel: readSelect(getProperty(page, "Effort Level")),
    familyApproved: readCheckbox(getProperty(page, "Family Approved")),
    weeknightFriendly: readCheckbox(getProperty(page, "Weeknight Friendly")),
    comfortMeal: readCheckbox(getProperty(page, "Comfort Meal")),
    notes,
    calories: readNumber(page, ["Calories", "Energy (kcal)", "Energy Kcal"]),
    proteinG: readNumber(page, ["Protein (g)", "Protein g", "Protein"]),
    carbohydratesG: readNumber(page, [
      "Carbohydrates (g)",
      "Carbs (g)",
      "Carbohydrate (g)",
      "Carbohydrates"
    ]),
    fatG: readNumber(page, ["Fat (g)", "Total Fat (g)", "Fat"]),
    fiberG: readNumber(page, ["Fiber (g)", "Fibre (g)", "Fiber"]),
    sodiumMg: readNumber(page, ["Sodium (mg)", "Sodium"]),
    sugarG: readNumber(page, [
      "Sugar (g)",
      "Sugars (g)",
      "Total Sugars (g)",
      "Total Sugar (g)"
    ]),
    nutritionConfidence: readTextLike(page, [
      "Nutrition Confidence",
      "Nutrient Confidence",
      "Confidence"
    ]),
    nutritionProvenance: readTextLike(page, [
      "Nutrition Source",
      "Nutrition Provenance",
      "Source Name",
      "Source Type"
    ]),
    qualityScore: readNumber(page, ["Meal Quality Score", "Quality Score"]),
    metabolicScore:
      readNumber(page, ["Metabolic Score"]) ??
      parseScoreFromNotes(notes, "Metabolic"),
    proteinScore:
      readNumber(page, ["Protein Score"]) ?? parseScoreFromNotes(notes, "Protein"),
    fiberScore:
      readNumber(page, ["Fiber Score"]) ?? parseScoreFromNotes(notes, "Fiber"),
    satietyScoreNumeric:
      readNumber(page, ["Satiety Score"]) ?? parseScoreFromNotes(notes, "Satiety"),
    bloodSugarRiskScore:
      readNumber(page, ["Blood Sugar Risk Score"]) ??
      parseScoreFromNotes(notes, "Blood Sugar Risk")
  };
}
