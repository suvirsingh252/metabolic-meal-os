import type {
  FoodDataCentralConfidence,
  FoodDataCentralFoodNutrient,
  FoodDataCentralSearchFood,
  IngredientNutrientSnapshot
} from "@/src/lib/integrations/food-data-central/types";
import {
  validateNutritionSnapshot,
  type FoodState,
  type NutritionSnapshot
} from "@/src/lib/domain/nutrition";

const brandedDataType = "Branded";
const dataTypeRank: Record<string, number> = {
  Foundation: 5,
  "SR Legacy": 4,
  "Survey (FNDDS)": 3,
  Experimental: 2,
  Branded: 0
};

const plainStaplePreparedWords = new Set([
  "babyfood",
  "baked",
  "bbq",
  "beverage",
  "breakfast",
  "candy",
  "canned",
  "cereal",
  "chips",
  "chocolate",
  "cooked",
  "curry",
  "dessert",
  "dinner",
  "dish",
  "drink",
  "flavored",
  "frozen",
  "garlic",
  "honey",
  "instant",
  "meal",
  "mix",
  "palak",
  "prepared",
  "ready",
  "restaurant",
  "roasted",
  "salted",
  "sauce",
  "seasoned",
  "snack",
  "soup",
  "strawberry",
  "sweetened",
  "vanilla",
  "with"
]);

const brandSpecificSignals = new Set([
  "brand",
  "costco",
  "kirkland",
  "president",
  "choice",
  "great",
  "value",
  "trader",
  "joe",
  "astro",
  "natrel",
  "silk",
  "liberte",
  "nanak",
  "gits",
  "mdh"
]);

const stapleTokens = new Set([
  "atta",
  "basmati",
  "bean",
  "beans",
  "chickpea",
  "chickpeas",
  "flour",
  "lentil",
  "lentils",
  "paneer",
  "rice",
  "wheat",
  "yogurt",
  "yoghurt"
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

  const confidence = calculateConfidence(query, bestMatch);
  const matching = buildMatchingDetails(query, bestMatch, foods, confidence);

  const nutrients = mapNutrients(bestMatch.foodNutrients ?? []);
  const nutritionSnapshot = buildNutritionSnapshot(
    bestMatch,
    confidence,
    nutrients
  );
  const validation = validateNutritionSnapshot(nutritionSnapshot);

  if (!validation.success) {
    return null;
  }

  return {
    ingredient: query,
    source: "usda-food-data-central",
    sourceName: "USDA FoodData Central",
    confidence,
    matchedDescription: bestMatch.description,
    fdcId: bestMatch.fdcId,
    matching,
    nutrients,
    nutritionSnapshot,
    notes: buildNotes(query, bestMatch, matching)
  };
}

function buildNutritionSnapshot(
  food: FoodDataCentralSearchFood,
  confidence: FoodDataCentralConfidence,
  nutrients: IngredientNutrientSnapshot["nutrients"]
): NutritionSnapshot {
  return {
    amountBasis: "per-100g",
    basisUnit: "g",
    per100g: true,
    servingSize:
      typeof food.servingSize === "number" && Number.isFinite(food.servingSize)
        ? food.servingSize
        : null,
    servingUnit: food.servingSizeUnit ?? null,
    source: "usda-food-data-central",
    sourceId: String(food.fdcId),
    confidence,
    matchedFoodState: inferMatchedFoodState(food),
    rawOrCookedState: inferRawOrCookedState(food.description),
    ediblePortionNotes:
      "FoodData Central search nutrient values are treated as per-100g reference values for the matched food description.",
    nutrients,
    lastVerifiedAt: new Date().toISOString()
  };
}

function inferMatchedFoodState(food: FoodDataCentralSearchFood): FoodState {
  if (food.dataType === brandedDataType) {
    return "branded";
  }

  const description = normalizeText(food.description);

  if (description.includes("cooked")) {
    return "cooked";
  }

  if (description.includes("raw")) {
    return "raw";
  }

  if (
    ["prepared", "restaurant", "ready", "canned", "frozen"].some((word) =>
      description.includes(word)
    )
  ) {
    return "prepared";
  }

  return "unknown";
}

function inferRawOrCookedState(description: string) {
  const normalized = normalizeText(description);

  if (normalized.includes("cooked")) {
    return "cooked";
  }

  if (normalized.includes("raw")) {
    return "raw";
  }

  return "unknown";
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
  const isBranded = food.dataType === brandedDataType;
  const queryLooksSpecific = queryAppearsBrandedOrSpecific(queryTokens);
  const dataTypeBonus = (dataTypeRank[food.dataType ?? ""] ?? 1) * 0.65;
  const brandedPenalty = isBranded && !queryLooksSpecific ? 7 : 0;
  const exactBonus = description === normalizedQuery ? 5 : 0;
  const containsBonus = description.includes(normalizedQuery) ? 1.75 : 0;
  const allTokensBonus = queryTokens.every((token) =>
    descriptionTokens.includes(token)
  )
    ? 1.25
    : 0;
  const missingQueryTokenPenalty =
    queryTokens.filter((token) => !descriptionTokens.includes(token)).length *
    1.4;
  const shortDescriptionBonus =
    descriptionTokens.length <= queryTokens.length + 4 ? 0.9 : 0;
  const preparedPenalty = getPreparedProductPenalty(queryTokens, descriptionTokens);
  const experimentalPenalty =
    food.dataType === "Experimental" && overlap < 0.75 ? 2.5 : 0;
  const extraTokenPenalty = Math.min(
    Math.max(descriptionTokens.length - queryTokens.length - 3, 0) * 0.08,
    1.2
  );
  const orderPenalty = index * 0.01;

  return (
    overlap * 4 +
    dataTypeBonus +
    exactBonus +
    containsBonus +
    allTokensBonus +
    shortDescriptionBonus -
    brandedPenalty -
    preparedPenalty -
    missingQueryTokenPenalty -
    experimentalPenalty -
    extraTokenPenalty -
    orderPenalty
  );
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
  const queryLooksSpecific = queryAppearsBrandedOrSpecific(queryTokens);

  if (
    !isBranded &&
    (normalizedDescription === normalizedQuery ||
      isClearlyCloseCommonDescription(queryTokens, descriptionTokens))
  ) {
    return "high";
  }

  if (
    (overlap >= 0.5 || normalizedDescription.includes(normalizedQuery)) &&
    (!isBranded || queryLooksSpecific)
  ) {
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

function buildMatchingDetails(
  query: string,
  selectedFood: FoodDataCentralSearchFood,
  foods: FoodDataCentralSearchFood[],
  confidence: FoodDataCentralConfidence
) {
  const selectedIsBranded = selectedFood.dataType === brandedDataType;
  const genericCandidate = foods.find((food) =>
    isSuitableGenericCandidate(query, selectedFood, food)
  );
  const genericMatchPreferred = !selectedIsBranded && foods.some(
    (food) => food.dataType === brandedDataType
  );
  const brandedFallback = selectedIsBranded && !genericCandidate;

  return {
    dataType: selectedFood.dataType,
    genericMatchPreferred,
    brandedFallback,
    confidenceReason: getConfidenceReason(
      query,
      selectedFood,
      confidence,
      brandedFallback
    )
  };
}

function isSuitableGenericCandidate(
  query: string,
  selectedFood: FoodDataCentralSearchFood,
  food: FoodDataCentralSearchFood
) {
  if (food.fdcId === selectedFood.fdcId || food.dataType === brandedDataType) {
    return false;
  }

  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(food.description);
  const normalizedQuery = normalizeText(query);
  const normalizedDescription = normalizeText(food.description);
  const overlap = calculateTokenOverlap(queryTokens, descriptionTokens);

  return (
    normalizedDescription.includes(normalizedQuery) ||
    queryTokens.every((token) => descriptionTokens.includes(token)) ||
    overlap >= 0.85
  );
}

function getConfidenceReason(
  query: string,
  food: FoodDataCentralSearchFood,
  confidence: FoodDataCentralConfidence,
  brandedFallback: boolean
) {
  const queryTokens = tokenize(query);
  const descriptionTokens = tokenize(food.description);
  const overlap = calculateTokenOverlap(queryTokens, descriptionTokens);
  const normalizedQuery = normalizeText(query);
  const normalizedDescription = normalizeText(food.description);

  if (brandedFallback) {
    return "Only branded or product-specific matches were suitable for this query.";
  }

  if (food.dataType && food.dataType !== brandedDataType) {
    return `Selected ${food.dataType} because generic USDA data is preferred for plain household ingredients.`;
  }

  if (normalizedDescription === normalizedQuery) {
    return "Selected because the description exactly matches the query.";
  }

  if (normalizedDescription.includes(normalizedQuery) || overlap >= 0.75) {
    return `Selected because token overlap supports ${confidence} confidence.`;
  }

  return "Selected as the best available FoodData Central search result; review before relying on it.";
}

function buildNotes(
  query: string,
  food: FoodDataCentralSearchFood,
  matching: IngredientNutrientSnapshot["matching"]
) {
  const notes = [
    "Nutrient values are from USDA FoodData Central search results and are usually per 100 g unless source data specifies otherwise.",
    "Use as a diagnostic nutrient snapshot only; do not treat as recipe-level nutrition without serving-size review."
  ];

  if (food.dataType) {
    notes.push(`Matched FoodData Central data type: ${food.dataType}.`);
  }

  if (matching?.genericMatchPreferred) {
    notes.push(
      "Generic USDA food data was preferred over branded/product-specific results where possible."
    );
  }

  if (matching?.brandedFallback) {
    notes.push(
      "No suitable generic USDA match was found, so a branded/product-specific result was used as a fallback."
    );
  }

  if (matching?.confidenceReason) {
    notes.push(`Confidence reason: ${matching.confidenceReason}`);
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

function getPreparedProductPenalty(
  queryTokens: string[],
  descriptionTokens: string[]
) {
  if (!isPlainStapleQuery(queryTokens)) {
    return 0;
  }

  const preparedWordCount = descriptionTokens.filter((token) =>
    plainStaplePreparedWords.has(token)
  ).length;

  return preparedWordCount * 2.5;
}

function isPlainStapleQuery(queryTokens: string[]) {
  return (
    queryTokens.length <= 4 &&
    queryTokens.some((token) => stapleTokens.has(token)) &&
    !queryAppearsBrandedOrSpecific(queryTokens)
  );
}

function queryAppearsBrandedOrSpecific(queryTokens: string[]) {
  if (queryTokens.some((token) => brandSpecificSignals.has(token))) {
    return true;
  }

  return (
    queryTokens.length >= 4 &&
    queryTokens.some((token) => plainStaplePreparedWords.has(token))
  );
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
    .map(normalizeToken)
    .filter((token) => token.length > 1);
}

function normalizeToken(token: string) {
  if (token === "atta") {
    return "wheat";
  }

  if (token === "yoghurt") {
    return "yogurt";
  }

  return token;
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
