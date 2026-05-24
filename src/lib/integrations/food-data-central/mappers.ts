import type {
  FoodDataCentralConfidence,
  FoodDataCentralFoodNutrient,
  FoodDataCentralSearchFood,
  IngredientNutrientSnapshot
} from "@/src/lib/integrations/food-data-central/types";

const brandedDataType = "Branded";
const preferredDataTypes = new Set([
  "Foundation",
  "SR Legacy",
  "Survey (FNDDS)"
]);

const nutrientAliases = {
  proteinG: ["Protein"],
  fiberG: ["Fiber, total dietary", "Fiber"],
  carbohydrateG: ["Carbohydrate, by difference"],
  totalSugarsG: ["Sugars, total including NLEA", "Sugars, total"],
  totalFatG: ["Total lipid (fat)", "Total fat"],
  saturatedFatG: ["Fatty acids, total saturated", "Saturated fatty acids"],
  sodiumMg: ["Sodium, Na", "Sodium"],
  energyKcal: ["Energy"]
} as const;

export function mapFoodDataCentralSearchResult(
  query: string,
  foods: FoodDataCentralSearchFood[]
): IngredientNutrientSnapshot | null {
  const bestMatch = findBestMatch(query, foods);

  if (!bestMatch) {
    return null;
  }

  return {
    ingredient: query,
    source: "usda-food-data-central",
    sourceName: "USDA FoodData Central",
    confidence: calculateConfidence(query, bestMatch),
    matchedDescription: bestMatch.description,
    fdcId: bestMatch.fdcId,
    nutrients: mapNutrients(bestMatch.foodNutrients ?? []),
    notes: buildNotes(query, bestMatch)
  };
}

function findBestMatch(
  query: string,
  foods: FoodDataCentralSearchFood[]
): FoodDataCentralSearchFood | null {
  const candidates = foods
    .filter((food) => food.fdcId && food.description)
    .map((food, index) => ({
      food,
      score: scoreFoodMatch(query, food, index)
    }))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.food ?? null;
}

function scoreFoodMatch(
  query: string,
  food: FoodDataCentralSearchFood,
  index: number
) {
  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(food.description);
  const overlap = calculateTokenOverlap(queryTokens, descriptionTokens);
  const description = normalizeText(food.description);
  const normalizedQuery = normalizeText(query);
  const dataTypeBonus = preferredDataTypes.has(food.dataType ?? "") ? 0.5 : 0;
  const brandedPenalty = food.dataType === brandedDataType ? 0.55 : 0;
  const exactBonus = description === normalizedQuery ? 0.8 : 0;
  const containsBonus = description.includes(normalizedQuery) ? 0.25 : 0;
  const orderPenalty = index * 0.01;

  return overlap + dataTypeBonus + exactBonus + containsBonus - brandedPenalty - orderPenalty;
}

function calculateConfidence(
  query: string,
  food: FoodDataCentralSearchFood
): FoodDataCentralConfidence {
  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(food.description);
  const overlap = calculateTokenOverlap(queryTokens, descriptionTokens);
  const normalizedQuery = normalizeText(query);
  const normalizedDescription = normalizeText(food.description);
  const isBranded = food.dataType === brandedDataType;

  if (
    !isBranded &&
    (normalizedDescription === normalizedQuery ||
      isClearlyCloseCommonDescription(queryTokens, descriptionTokens))
  ) {
    return "high";
  }

  if (overlap >= 0.5 || normalizedDescription.includes(normalizedQuery)) {
    return "medium";
  }

  return "low";
}

function isClearlyCloseCommonDescription(
  queryTokens: string[],
  descriptionTokens: string[]
) {
  const overlap = calculateTokenOverlap(queryTokens, descriptionTokens);

  return overlap >= 0.85 && descriptionTokens.length <= queryTokens.length + 3;
}

function mapNutrients(nutrients: FoodDataCentralFoodNutrient[]) {
  return {
    proteinG: findNutrientValue(nutrients, nutrientAliases.proteinG, "G"),
    fiberG: findNutrientValue(nutrients, nutrientAliases.fiberG, "G"),
    carbohydrateG: findNutrientValue(
      nutrients,
      nutrientAliases.carbohydrateG,
      "G"
    ),
    totalSugarsG: findNutrientValue(
      nutrients,
      nutrientAliases.totalSugarsG,
      "G"
    ),
    totalFatG: findNutrientValue(nutrients, nutrientAliases.totalFatG, "G"),
    saturatedFatG: findNutrientValue(
      nutrients,
      nutrientAliases.saturatedFatG,
      "G"
    ),
    sodiumMg: findNutrientValue(nutrients, nutrientAliases.sodiumMg, "MG"),
    energyKcal: findNutrientValue(
      nutrients.filter((nutrient) => nutrient.unitName?.toUpperCase() === "KCAL"),
      nutrientAliases.energyKcal,
      "KCAL"
    )
  };
}

function findNutrientValue(
  nutrients: FoodDataCentralFoodNutrient[],
  names: readonly string[],
  expectedUnit: string
) {
  const match = nutrients.find((nutrient) => {
    const unitName = nutrient.unitName?.toUpperCase();
    return (
      typeof nutrient.value === "number" &&
      unitName === expectedUnit &&
      names.some((name) => nutrient.nutrientName === name)
    );
  });

  return typeof match?.value === "number"
    ? roundNutrientValue(match.value)
    : undefined;
}

function buildNotes(query: string, food: FoodDataCentralSearchFood) {
  const notes = [
    "Nutrient values are from USDA FoodData Central search results and are usually per 100 g unless source data specifies otherwise.",
    "Use as a diagnostic nutrient snapshot only; do not treat as recipe-level nutrition without serving-size review."
  ];

  if (food.dataType) {
    notes.push(`Matched FoodData Central data type: ${food.dataType}.`);
  }

  if (food.dataType === brandedDataType) {
    notes.push(
      "Matched a branded food result; confidence is limited unless this exact product is intended."
    );
  }

  if (calculateConfidence(query, food) !== "high") {
    notes.push("Review the matched description before using this nutrient snapshot.");
  }

  return notes;
}

function calculateTokenOverlap(queryTokens: string[], descriptionTokens: string[]) {
  if (queryTokens.length === 0 || descriptionTokens.length === 0) {
    return 0;
  }

  const descriptionSet = new Set(descriptionTokens);
  const matchedCount = queryTokens.filter((token) => descriptionSet.has(token)).length;

  return matchedCount / queryTokens.length;
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roundNutrientValue(value: number) {
  return Math.round(value * 100) / 100;
}
