import type {
  FoodDataCentralSearchFood,
  FoodDataCentralSearchRequest,
  FoodDataCentralSearchResponse
} from "@/src/lib/integrations/food-data-central/types";

const searchUrl = "https://api.nal.usda.gov/fdc/v1/foods/search";
const requestTimeoutMs = 10_000;
const commonFoodDataTypes = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

export class FoodDataCentralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FoodDataCentralError";
  }
}

export async function searchFoodDataCentral({
  query,
  apiKey
}: FoodDataCentralSearchRequest): Promise<FoodDataCentralSearchFood[]> {
  const commonFoods = await fetchCommonFoods({ query, apiKey });

  if (hasReasonableCommonMatch(query, commonFoods)) {
    return commonFoods;
  }

  const allFoods = await fetchFoodDataCentralSearch({ query, apiKey });

  return mergeFoods(commonFoods, allFoods);
}

async function fetchCommonFoods(request: FoodDataCentralSearchRequest) {
  try {
    return await fetchFoodDataCentralSearch({
      ...request,
      dataTypes: commonFoodDataTypes
    });
  } catch {
    return [];
  }
}

function mergeFoods(
  commonFoods: FoodDataCentralSearchFood[],
  allFoods: FoodDataCentralSearchFood[]
) {
  const seen = new Set<number>();
  const merged: FoodDataCentralSearchFood[] = [];

  for (const food of [...commonFoods, ...allFoods]) {
    if (seen.has(food.fdcId)) {
      continue;
    }

    seen.add(food.fdcId);
    merged.push(food);
  }

  return merged;
}

function hasReasonableCommonMatch(
  query: string,
  foods: FoodDataCentralSearchFood[]
) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);

  return foods.some((food) => {
    const description = normalizeText(food.description);
    const descriptionTokens = tokenize(food.description);

    return (
      description.includes(normalizedQuery) ||
      (queryTokens.every((token) => descriptionTokens.includes(token)) &&
        descriptionTokens.length <= queryTokens.length + 4)
    );
  });
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

async function fetchFoodDataCentralSearch({
  query,
  apiKey,
  dataTypes
}: FoodDataCentralSearchRequest & { dataTypes?: string[] }) {
  const url = new URL(searchUrl);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("sortBy", "dataType.keyword");
  url.searchParams.set("sortOrder", "asc");

  for (const dataType of dataTypes ?? []) {
    url.searchParams.append("dataType", dataType);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(requestTimeoutMs)
    });
  } catch {
    throw new FoodDataCentralError("FoodData Central request failed.");
  }

  if (!response.ok) {
    throw new FoodDataCentralError(
      `FoodData Central returned ${response.status}.`
    );
  }

  const data = (await response.json()) as FoodDataCentralSearchResponse;

  return Array.isArray(data.foods) ? data.foods : [];
}
