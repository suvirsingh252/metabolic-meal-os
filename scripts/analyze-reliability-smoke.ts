interface AnalyzeResponse {
  error?: string;
  recoverable?: boolean;
  failureReason?: string;
  mealName?: string;
  extractionMethod?: string | null;
  extractionConfidence?: string | null;
}

interface SmokeResult {
  name: string;
  ok: boolean;
  status: number | null;
  detail: string;
}

const defaultProductionBaseUrl = "https://metabolic-meal-os.vercel.app";

function readBaseUrl() {
  const raw = process.env.SMOKE_BASE_URL?.trim() || defaultProductionBaseUrl;
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/+$/, "");

  return url;
}

function buildUrl(baseUrl: URL, path: string) {
  return new URL(path, `${baseUrl.origin}${baseUrl.pathname || "/"}`);
}

async function postAnalyze(baseUrl: URL, body: unknown) {
  const response = await fetch(buildUrl(baseUrl, "/api/analyze-meal"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as AnalyzeResponse) : {};

  return { response, data };
}

function result(
  name: string,
  ok: boolean,
  status: number | null,
  detail: string
): SmokeResult {
  return { name, ok, status, detail };
}

async function foodNetworkJsonLdSuccess(baseUrl: URL): Promise<SmokeResult> {
  const { response, data } = await postAnalyze(baseUrl, {
    recipeText:
      "https://www.foodnetwork.com/recipes/easy-juicy-chicken-breast-5618389"
  });

  return result(
    "Food Network JSON-LD automatic success",
    response.ok &&
      data.extractionMethod === "jsonld" &&
      data.extractionConfidence === "full_recipe",
    response.status,
    response.ok
      ? `method=${data.extractionMethod}; confidence=${data.extractionConfidence}; meal=${data.mealName ?? "unknown"}`
      : data.error ?? "Expected successful analysis."
  );
}

async function allrecipesBlockedRecovery(baseUrl: URL): Promise<SmokeResult> {
  const { response, data } = await postAnalyze(baseUrl, {
    recipeText:
      "https://www.allrecipes.com/recipe/9038/anniversary-chicken-i/"
  });

  return result(
    "Allrecipes blocked_url recovery",
    response.status === 400 &&
      data.recoverable === true &&
      data.failureReason === "blocked_url",
    response.status,
    `failureReason=${data.failureReason ?? "missing"}; recoverable=${String(
      data.recoverable
    )}; error=${data.error ?? "none"}`
  );
}

async function pastedFallbackSuccess(baseUrl: URL): Promise<SmokeResult> {
  const sourceUrl =
    "https://www.allrecipes.com/recipe/9038/anniversary-chicken-i/";
  const { response, data } = await postAnalyze(baseUrl, {
    recipeText: [
      sourceUrl,
      "",
      "Ingredients: chicken breasts, teriyaki sauce, ranch dressing, cheddar cheese, bacon, parsley.",
      "Instructions: Brown chicken, brush with sauces, bake until cooked, top with cheese and bacon, melt, and serve."
    ].join("\n"),
    sourceType: "url",
    sourceUrl,
    sourceName: "Allrecipes recovered"
  });

  return result(
    "Pasted fallback success",
    response.ok &&
      data.extractionMethod === "manual" &&
      data.extractionConfidence === "estimated_description",
    response.status,
    response.ok
      ? `method=${data.extractionMethod}; confidence=${data.extractionConfidence}; meal=${data.mealName ?? "unknown"}`
      : data.error ?? "Expected successful fallback analysis."
  );
}

async function main() {
  const baseUrl = readBaseUrl();
  const checks = [
    foodNetworkJsonLdSuccess,
    allrecipesBlockedRecovery,
    pastedFallbackSuccess
  ];
  const results: SmokeResult[] = [];

  console.log(`Analyze reliability smoke: ${baseUrl.toString()}`);
  console.log("Checks: JSON-LD success, blocked URL recovery, pasted fallback.\n");

  for (const check of checks) {
    const smokeResult = await check(baseUrl);
    results.push(smokeResult);
    console.log(
      `${smokeResult.ok ? "PASS" : "FAIL"} ${smokeResult.name} (${smokeResult.status ?? "no status"})`
    );
    console.log(`  ${smokeResult.detail}`);
  }

  const failed = results.filter((item) => !item.ok);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
