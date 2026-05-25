interface SmokeWriteRecord {
  database: "Meals" | "Ingredients" | "Meal Feedback";
  name: string;
  id?: string;
  url?: string;
  action: "created" | "created-or-touched";
}

export {};

interface SchemaDatabase {
  key: string;
  id: string;
  properties: Array<{
    name: string;
    type: string;
    relationTarget?: {
      databaseId: string | null;
      dataSourceId: string | null;
    };
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireBaseUrl() {
  const rawBaseUrl = process.env.SMOKE_BASE_URL?.trim();

  if (!rawBaseUrl) {
    throw new Error(
      "SMOKE_BASE_URL is required. Example: SMOKE_BASE_URL=https://example.vercel.app SMOKE_WRITE_TEST=1 npm run smoke:prod:writes"
    );
  }

  const url = new URL(rawBaseUrl);
  url.pathname = url.pathname.replace(/\/+$/, "");

  return url;
}

function requireWriteOptIn() {
  if (process.env.SMOKE_WRITE_TEST !== "1") {
    throw new Error(
      "Refusing to run write smoke test. Set SMOKE_WRITE_TEST=1 to create disposable Notion records."
    );
  }
}

function getRunId() {
  const configuredRunId = process.env.SMOKE_RUN_ID?.trim();

  if (configuredRunId) {
    return configuredRunId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
  }

  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .replace("Z", "");
}

function buildUrl(baseUrl: URL, path: string) {
  return new URL(path, `${baseUrl.origin}${baseUrl.pathname || "/"}`);
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (
    contentType.includes("application/json") ||
    contentType.includes("+json") ||
    text.trim().startsWith("{")
  ) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

async function requestJson(baseUrl: URL, path: string, options?: RequestInit) {
  const response = await fetch(buildUrl(baseUrl, path), {
    ...options,
    headers: {
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...options?.headers
    }
  });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(
      `${path} failed with ${response.status}: ${JSON.stringify(body)}`
    );
  }

  return body;
}

function expectString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string.`);
  }

  return value;
}

function expectNumber(value: unknown, label: string) {
  if (typeof value !== "number") {
    throw new Error(`Expected ${label} to be a number.`);
  }

  return value;
}

function expectBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${label} to be a boolean.`);
  }

  return value;
}

function getSchemaDatabases(body: unknown) {
  if (!isRecord(body) || body.ok !== true || !Array.isArray(body.databases)) {
    throw new Error("Expected schema diagnostics to return ok: true and databases.");
  }

  return body.databases.filter(isSchemaDatabase);
}

function isSchemaDatabase(value: unknown): value is SchemaDatabase {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.id === "string" &&
    Array.isArray(value.properties)
  );
}

function hasRelationToMeals(database: SchemaDatabase | undefined, mealsId: string) {
  return Boolean(
    database?.properties.some(
      (property) =>
        property.type === "relation" &&
        property.relationTarget?.databaseId === mealsId
    )
  );
}

function validateSaveMealResponse(body: unknown) {
  if (!isRecord(body) || body.success !== true) {
    throw new Error("Expected save-meal response with success: true.");
  }

  return {
    notionPageId: expectString(body.notionPageId, "save-meal notionPageId"),
    notionUrl: expectString(body.notionUrl, "save-meal notionUrl")
  };
}

function validateSaveIngredientsResponse(
  body: unknown,
  expected: {
    createdCount: number;
    duplicateCount: number;
    skippedCount: number;
    relatedCountWhenRelationExists: number;
    relationExists: boolean;
  }
) {
  if (!isRecord(body) || body.success !== true) {
    throw new Error("Expected save-ingredients response with success: true.");
  }

  const createdCount = expectNumber(body.createdCount, "createdCount");
  const duplicateCount = expectNumber(body.duplicateCount, "duplicateCount");
  const skippedCount = expectNumber(body.skippedCount, "skippedCount");
  const relatedCount = expectNumber(body.relatedCount, "relatedCount");
  expectNumber(body.malformedCount, "malformedCount");

  if (createdCount !== expected.createdCount) {
    throw new Error(
      `Expected createdCount ${expected.createdCount}, received ${createdCount}.`
    );
  }

  if (duplicateCount !== expected.duplicateCount) {
    throw new Error(
      `Expected duplicateCount ${expected.duplicateCount}, received ${duplicateCount}.`
    );
  }

  if (skippedCount !== expected.skippedCount) {
    throw new Error(
      `Expected skippedCount ${expected.skippedCount}, received ${skippedCount}.`
    );
  }

  if (expected.relationExists) {
    if (relatedCount !== expected.relatedCountWhenRelationExists) {
      throw new Error(
        `Expected relatedCount ${expected.relatedCountWhenRelationExists}, received ${relatedCount}.`
      );
    }

    if (typeof body.relationWarning === "string") {
      throw new Error(
        `Did not expect relationWarning when Ingredients -> Meals relation exists: ${body.relationWarning}`
      );
    }
  } else {
    if (relatedCount !== 0) {
      throw new Error(
        `Expected relatedCount 0 without Ingredients -> Meals relation, received ${relatedCount}.`
      );
    }

    if (typeof body.relationWarning !== "string") {
      throw new Error(
        "Expected relationWarning when mealPageId is sent without a compatible relation."
      );
    }
  }

  return { createdCount, duplicateCount, skippedCount, relatedCount };
}

function validateFeedbackResponse(body: unknown, feedbackRelationExists: boolean) {
  if (!isRecord(body) || body.success !== true) {
    throw new Error("Expected log-feedback response with success: true.");
  }

  const notionPageId = expectString(body.notionPageId, "feedback notionPageId");
  const notionUrl = expectString(body.notionUrl, "feedback notionUrl");

  if (feedbackRelationExists && typeof body.warning === "string") {
    throw new Error(
      `Did not expect feedback relation warning when relation exists: ${body.warning}`
    );
  }

  if (!feedbackRelationExists && typeof body.warning !== "string") {
    throw new Error(
      "Expected feedback warning when selectedMealId is sent without a compatible relation."
    );
  }

  return { notionPageId, notionUrl };
}

function buildMealPayload(name: string, runId: string) {
  const now = new Date().toISOString();

  return {
    mealName: name,
    cuisine: "Other",
    mealType: "Dinner",
    proteinLevel: "Moderate",
    satietyLevel: "High",
    bloodSugarImpact: "Moderate",
    effortLevel: "Easy",
    familyApproved: false,
    weeknightFriendly: true,
    comfortMeal: false,
    optimizedVersion:
      "SMOKE TEST disposable meal record created by write-flow smoke test.",
    notes: `SMOKE TEST disposable record. Run ID: ${runId}. Delete after verification.`,
    ingredientSuggestions: [],
    feedbackPrompt: "SMOKE TEST disposable feedback prompt.",
    metabolicScore: 6,
    proteinScore: 6,
    fiberScore: 6,
    satietyScoreNumeric: 7,
    bloodSugarRiskScore: 4,
    quickVerdict: "SMOKE TEST disposable meal.",
    mainConcerns: ["Disposable smoke-test record"],
    minimalChangeVersion: "No household guidance; test data only.",
    supportiveVersion: "No household guidance; test data only.",
    plateStrategy: "No household guidance; test data only.",
    whyThisHelps: "No household guidance; test data only.",
    culturalNotes: "No household guidance; test data only.",
    shoppingAdditions: [],
    prepNotes: [],
    mealPairings: [],
    cautions: ["Delete this smoke-test record after verification."],
    evidenceNotes: ["Smoke test does not call OpenAI."],
    confidenceNotes: ["Synthetic record only."],
    safetyDisclaimer:
      "Smoke-test record only; not nutrition or medical guidance.",
    guidanceBasis: [
      {
        sourceId: "canadas-food-guide",
        principleId: "smoke-test",
        relevance: "Synthetic write-flow verification only."
      }
    ],
    sourceType: "manual",
    sourceName: "SMOKE TEST",
    importedAt: now,
    parserVersion: "smoke-write-v1"
  };
}

function buildFeedbackPayload(name: string, mealId: string, runId: string) {
  return {
    feedbackEntry: name,
    selectedMealId: mealId,
    energyAfter: "Steady",
    hungerLater: "Neutral",
    cravingsLater: false,
    wouldRepeat: false,
    notes: `SMOKE TEST disposable feedback record. Run ID: ${runId}. Delete after verification.`
  };
}

async function createMeal(baseUrl: URL, name: string, runId: string) {
  const body = await requestJson(baseUrl, "/api/notion/save-meal", {
    method: "POST",
    body: JSON.stringify(buildMealPayload(name, runId))
  });

  return validateSaveMealResponse(body);
}

async function saveIngredients(
  baseUrl: URL,
  payload: {
    mealName: string;
    ingredients: string[];
    mealPageId: string;
  }
) {
  return requestJson(baseUrl, "/api/notion/save-ingredients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function createFeedback(
  baseUrl: URL,
  name: string,
  mealId: string,
  runId: string
) {
  const body = await requestJson(baseUrl, "/api/notion/log-feedback", {
    method: "POST",
    body: JSON.stringify(buildFeedbackPayload(name, mealId, runId))
  });

  return body;
}

function printCleanup(records: SmokeWriteRecord[], prefix: string) {
  console.log("\nCleanup instructions:");
  console.log(`Search Notion for prefix: ${prefix}`);
  console.log("Manually delete these disposable smoke-test records:");

  for (const record of records) {
    const details = [
      record.id ? `id=${record.id}` : null,
      record.url ? `url=${record.url}` : null,
      `action=${record.action}`
    ]
      .filter(Boolean)
      .join(" ");

    console.log(`- ${record.database}: ${record.name}${details ? ` (${details})` : ""}`);
  }

  console.log(
    "\nDatabases that may contain disposable records: Meals, Ingredients, Meal Feedback."
  );
}

async function main() {
  requireWriteOptIn();

  const baseUrl = requireBaseUrl();
  const runId = getRunId();
  const prefix = `SMOKE TEST - ${runId}`;
  const records: SmokeWriteRecord[] = [];

  console.log(`Write-flow smoke test: ${baseUrl.toString()}`);
  console.log("This test creates disposable Notion records.");
  console.log("No OpenAI calls. No Notion schema changes.");
  console.log(`Run ID: ${runId}\n`);

  const schemaBody = await requestJson(baseUrl, "/api/diagnostics/notion-schemas");
  const databases = getSchemaDatabases(schemaBody);
  const mealsDatabase = databases.find((database) => database.key === "meals");
  const ingredientsDatabase = databases.find(
    (database) => database.key === "ingredients"
  );
  const feedbackDatabase = databases.find((database) => database.key === "feedback");
  const mealsDatabaseId = expectString(mealsDatabase?.id, "Meals database ID");
  const ingredientRelationExists = hasRelationToMeals(
    ingredientsDatabase,
    mealsDatabaseId
  );
  const feedbackRelationExists = hasRelationToMeals(
    feedbackDatabase,
    mealsDatabaseId
  );

  console.log(
    `Schema: Ingredients -> Meals relation ${
      ingredientRelationExists ? "detected" : "not detected"
    }.`
  );
  console.log(
    `Schema: Feedback -> Meals relation ${
      feedbackRelationExists ? "detected" : "not detected"
    }.\n`
  );

  const mealOneName = `${prefix} Meal A`;
  const mealTwoName = `${prefix} Meal B`;
  const overlappingIngredient = `${prefix} Ingredient Overlap`;
  const firstOnlyIngredient = `${prefix} Ingredient First Only`;
  const secondOnlyIngredient = `${prefix} Ingredient Second Only`;
  const feedbackName = `${prefix} Feedback`;

  const mealOne = await createMeal(baseUrl, mealOneName, runId);
  records.push({
    database: "Meals",
    name: mealOneName,
    id: mealOne.notionPageId,
    url: mealOne.notionUrl,
    action: "created"
  });
  console.log(`PASS Created Meal A (${mealOne.notionPageId})`);

  const mealTwo = await createMeal(baseUrl, mealTwoName, runId);
  records.push({
    database: "Meals",
    name: mealTwoName,
    id: mealTwo.notionPageId,
    url: mealTwo.notionUrl,
    action: "created"
  });
  console.log(`PASS Created Meal B (${mealTwo.notionPageId})`);

  const firstIngredientBody = await saveIngredients(baseUrl, {
    mealName: mealOneName,
    ingredients: [overlappingIngredient, firstOnlyIngredient],
    mealPageId: mealOne.notionPageId
  });
  const firstIngredientResult = validateSaveIngredientsResponse(
    firstIngredientBody,
    {
      createdCount: 2,
      duplicateCount: 0,
      skippedCount: 0,
      relatedCountWhenRelationExists: 2,
      relationExists: ingredientRelationExists
    }
  );
  records.push(
    {
      database: "Ingredients",
      name: overlappingIngredient,
      action: "created-or-touched"
    },
    {
      database: "Ingredients",
      name: firstOnlyIngredient,
      action: "created-or-touched"
    }
  );
  console.log(
    `PASS Saved first ingredient batch (${JSON.stringify(firstIngredientResult)})`
  );

  const secondIngredientBody = await saveIngredients(baseUrl, {
    mealName: mealTwoName,
    ingredients: [overlappingIngredient, secondOnlyIngredient],
    mealPageId: mealTwo.notionPageId
  });
  const secondIngredientResult = validateSaveIngredientsResponse(
    secondIngredientBody,
    {
      createdCount: 1,
      duplicateCount: 1,
      skippedCount: 1,
      relatedCountWhenRelationExists: 2,
      relationExists: ingredientRelationExists
    }
  );
  records.push({
    database: "Ingredients",
    name: secondOnlyIngredient,
    action: "created-or-touched"
  });
  console.log(
    `PASS Saved duplicate/update ingredient batch (${JSON.stringify(secondIngredientResult)})`
  );

  const feedbackBody = await createFeedback(
    baseUrl,
    feedbackName,
    mealOne.notionPageId,
    runId
  );
  const feedback = validateFeedbackResponse(feedbackBody, feedbackRelationExists);
  records.push({
    database: "Meal Feedback",
    name: feedbackName,
    id: feedback.notionPageId,
    url: feedback.notionUrl,
    action: "created"
  });
  console.log(`PASS Created Meal Feedback (${feedback.notionPageId})`);

  console.log("\nWrite-flow smoke test complete: all checks passed.");
  printCleanup(records, prefix);
}

main().catch((error) => {
  console.error("\nFAIL Write-flow smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
