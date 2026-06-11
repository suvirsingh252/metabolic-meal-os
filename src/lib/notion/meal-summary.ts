import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { backfillMealMetadata } from "@/src/lib/notion/meal-backfill";

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
  nutritionSource: string | null;
  nutritionProvenance: string | null;
  qualityScore: number | null;
  metabolicScore: number | null;
  proteinScore: number | null;
  fiberScore: number | null;
  energyDensityScore: number | null;
  processingScore: number | null;
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

function readDateProperty(property: NotionProperty | undefined) {
  if (!property || property.type !== "date") {
    return null;
  }

  return property.date?.start ?? null;
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

function readDate(page: PageObjectResponse, propertyNames: string[]) {
  for (const propertyName of propertyNames) {
    const value = readDateProperty(getProperty(page, propertyName));

    if (value) {
      return value;
    }
  }

  return null;
}

export function mapNotionPageToMealSummary(page: unknown): MealSummary | null {
  if (!isFullPage(page)) {
    return null;
  }

  const notes = readRichText(getProperty(page, "Notes"));
  const nutrition = {
    calories: readNumber(page, ["Calories", "Energy (kcal)", "Energy Kcal"]),
    protein: readNumber(page, ["Protein (g)", "Protein g", "Protein"]),
    carbs: readNumber(page, [
      "Carbohydrates (g)",
      "Carbs (g)",
      "Carbs",
      "Carbohydrate (g)",
      "Carbohydrates"
    ]),
    fat: readNumber(page, ["Fat (g)", "Total Fat (g)", "Fat"]),
    fiber: readNumber(page, ["Fiber (g)", "Fibre (g)", "Fiber"]),
    sodium: readNumber(page, ["Sodium (mg)", "Sodium"]),
    sugar: readNumber(page, [
      "Sugar (g)",
      "Sugar",
      "Sugars (g)",
      "Total Sugars (g)",
      "Total Sugar (g)"
    ])
  };
  const explicitNutritionConfidence = readTextLike(page, [
    "Nutrition Confidence",
    "Nutrient Confidence",
    "Confidence"
  ]);
  const explicitNutritionSource = readTextLike(page, [
    "Nutrition Source",
    "Nutrition Data Source",
    "Source Name",
    "Source Type"
  ]);
  const explicitNutritionProvenance = readTextLike(page, [
    "Nutrition Provenance",
    "Nutrition Source Notes"
  ]);
  const explicitQualityScore = readNumber(page, [
    "Meal Quality Score",
    "Quality Score"
  ]);
  const backfill = backfillMealMetadata({
    notes,
    nutrition,
    nutritionConfidence: explicitNutritionConfidence,
    nutritionSource: explicitNutritionSource,
    nutritionProvenance: explicitNutritionProvenance,
    qualityScore: explicitQualityScore,
    metabolicScore: readNumber(page, ["Metabolic Score"]),
    proteinScore: readNumber(page, ["Protein Score"]),
    fiberScore: readNumber(page, ["Fiber Score"]),
    energyDensityScore: readNumber(page, ["Energy Density Score"]),
    processingScore: readNumber(page, ["Processing Score"]),
    satietyScoreNumeric: readNumber(page, ["Satiety Score"]),
    bloodSugarRiskScore: readNumber(page, ["Blood Sugar Risk Score"])
  });

  return {
    id: page.id,
    url: page.url,
    mealName: readTitle(getProperty(page, "Meal Name")) || "Untitled meal",
    createdAt: readDate(page, ["Meal Date", "Date", "Logged At"]) ?? page.created_time,
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
    calories: nutrition.calories,
    proteinG: nutrition.protein,
    carbohydratesG: nutrition.carbs,
    fatG: nutrition.fat,
    fiberG: nutrition.fiber,
    sodiumMg: nutrition.sodium,
    sugarG: nutrition.sugar,
    nutritionConfidence: backfill.nutritionConfidence,
    nutritionSource: backfill.nutritionSource,
    nutritionProvenance: backfill.nutritionProvenance,
    qualityScore: backfill.qualityScore,
    metabolicScore: backfill.metabolicScore,
    proteinScore: backfill.proteinScore,
    fiberScore: backfill.fiberScore,
    energyDensityScore: backfill.energyDensityScore,
    processingScore: backfill.processingScore,
    satietyScoreNumeric: backfill.satietyScoreNumeric,
    bloodSugarRiskScore: backfill.bloodSugarRiskScore
  };
}
