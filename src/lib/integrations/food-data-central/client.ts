import type {
  FoodDataCentralSearchFood,
  FoodDataCentralSearchRequest,
  FoodDataCentralSearchResponse
} from "@/src/lib/integrations/food-data-central/types";

const searchUrl = "https://api.nal.usda.gov/fdc/v1/foods/search";
const requestTimeoutMs = 10_000;
const commonFoodDataTypes = [
  "Foundation",
  "SR Legacy",
  "Survey (FNDDS)"
];
const experimentalFoodDataTypes = ["Experimental"];

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
  const searchQueries = getSearchQueries(query);
  const commonFoods = await fetchCommonFoodsForQueries({ apiKey }, searchQueries);
  const experimentalFoods = await fetchExperimentalFoodsForQueries(
    { apiKey },
    searchQueries
  );
  const preferredFoods = mergeFoods(commonFoods, experimentalFoods);

  if (hasReasonableCommonMatch(query, preferredFoods)) {
    return preferredFoods;
  }

  const allFoods = await fetchFoodDataCentralSearch({ query, apiKey });

  return mergeFoods(preferredFoods, allFoods);
}

async function fetchCommonFoodsForQueries(
  request: Pick<FoodDataCentralSearchRequest, "apiKey">,
  queries: string[]
) {
  const results = await Promise.all(
    queries.map((query) =>
      fetchDataTypesIndividually({ ...request, query }, commonFoodDataTypes)
    )
  );

  return mergeFoods(...results);
}

async function fetchExperimentalFoodsForQueries(
  request: Pick<FoodDataCentralSearchRequest, "apiKey">,
  queries: string[]
) {
  const results = await Promise.all(
    queries.map((query) =>
      fetchDataTypesIndividually({ ...request, query }, experimentalFoodDataTypes)
    )
  );

  return mergeFoods(...results);
}

async function fetchDataTypesIndividually(
  request: FoodDataCentralSearchRequest,
  dataTypes: string[]
) {
  const results = await Promise.all(
    dataTypes.map(async (dataType) => {
      try {
        return await fetchFoodDataCentralSearch({
          ...request,
          dataTypes: [dataType]
        });
      } catch {
        return [];
      }
    })
  );

  return mergeFoods(...results);
}

function mergeFoods(
  ...foodLists: FoodDataCentralSearchFood[][]
) {
  const seen = new Set<number>();
  const merged: FoodDataCentralSearchFood[] = [];

  for (const foods of foodLists) {
    for (const food of foods) {
      if (seen.has(food.fdcId)) {
        continue;
      }

      seen.add(food.fdcId);
      merged.push(food);
    }
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

function getSearchQueries(query: string) {
  const normalizedQuery = normalizeText(query);
  const queries = [query];

  if (normalizedQuery === "paneer") {
    queries.push("cheese paneer");
  }

  if (normalizedQuery.includes("atta")) {
    queries.push(normalizedQuery.replace(/\batta\b/g, "whole wheat"));
  }

  return Array.from(new Set(queries));
}

async function fetchFoodDataCentralSearch({
  query,
  apiKey,
  dataTypes
}: FoodDataCentralSearchRequest & { dataTypes?: string[] }) {
  const url = new URL(searchUrl);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "25");
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
