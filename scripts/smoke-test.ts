type HttpMethod = "GET" | "POST";

interface SmokeCheck {
  name: string;
  method: HttpMethod;
  path: string;
  body?: unknown;
  validate?: (body: unknown) => string | null;
}

interface SmokeResult {
  name: string;
  ok: boolean;
  status?: number;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireSmokeBaseUrl() {
  const rawBaseUrl = process.env.SMOKE_BASE_URL?.trim();

  if (!rawBaseUrl) {
    throw new Error(
      "SMOKE_BASE_URL is required. Example: SMOKE_BASE_URL=https://example.vercel.app npm run smoke:prod"
    );
  }

  const url = new URL(rawBaseUrl);
  url.pathname = url.pathname.replace(/\/+$/, "");

  return url;
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

async function runCheck(baseUrl: URL, check: SmokeCheck): Promise<SmokeResult> {
  const url = buildUrl(baseUrl, check.path);

  try {
    const response = await fetch(url, {
      method: check.method,
      headers:
        check.method === "POST"
          ? {
              "Content-Type": "application/json"
            }
          : undefined,
      body: check.body === undefined ? undefined : JSON.stringify(check.body)
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      return {
        name: check.name,
        ok: false,
        status: response.status,
        error: `Expected 2xx, received ${response.status}.`
      };
    }

    const validationError = check.validate?.(body);

    if (validationError) {
      return {
        name: check.name,
        ok: false,
        status: response.status,
        error: validationError
      };
    }

    return {
      name: check.name,
      ok: true,
      status: response.status
    };
  } catch (error) {
    return {
      name: check.name,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown request failure."
    };
  }
}

function validateOkBody(body: unknown) {
  if (!isRecord(body) || body.ok !== true) {
    return "Expected JSON response with ok: true.";
  }

  return null;
}

function validateSchemaDiagnostics(body: unknown) {
  const okError = validateOkBody(body);

  if (okError) {
    return okError;
  }

  if (!isRecord(body) || !Array.isArray(body.databases)) {
    return "Expected schema diagnostics to include databases array.";
  }

  const databaseKeys = new Set(
    body.databases
      .filter(isRecord)
      .map((database) => database.key)
      .filter((key): key is string => typeof key === "string")
  );

  for (const key of ["meals", "ingredients", "feedback"]) {
    if (!databaseKeys.has(key)) {
      return `Expected schema diagnostics to include ${key} database.`;
    }
  }

  return null;
}

function validateManifest(body: unknown) {
  if (!isRecord(body) || typeof body.name !== "string") {
    return "Expected manifest JSON with app name.";
  }

  return null;
}

function validateIngredientLookup(body: unknown) {
  if (!isRecord(body)) {
    return "Expected ingredient lookup JSON response.";
  }

  if (typeof body.fdcId !== "number") {
    return "Expected ingredient lookup to return numeric fdcId.";
  }

  if (typeof body.matchedDescription !== "string") {
    return "Expected ingredient lookup to return matchedDescription.";
  }

  if (!isRecord(body.nutrients)) {
    return "Expected ingredient lookup to return nutrients object.";
  }

  return null;
}

const checks: SmokeCheck[] = [
  { name: "Home page", method: "GET", path: "/" },
  { name: "Settings page", method: "GET", path: "/settings" },
  { name: "Analyze page", method: "GET", path: "/analyze" },
  { name: "Meals page", method: "GET", path: "/meals" },
  { name: "Feedback page", method: "GET", path: "/feedback" },
  {
    name: "PWA manifest",
    method: "GET",
    path: "/manifest.webmanifest",
    validate: validateManifest
  },
  {
    name: "Notion diagnostics",
    method: "GET",
    path: "/api/diagnostics/notion",
    validate: validateOkBody
  },
  {
    name: "Notion schema diagnostics",
    method: "GET",
    path: "/api/diagnostics/notion-schemas",
    validate: validateSchemaDiagnostics
  },
  {
    name: "USDA paneer lookup",
    method: "POST",
    path: "/api/ingredients/lookup",
    body: { ingredient: "paneer" },
    validate: validateIngredientLookup
  }
];

async function main() {
  const baseUrl = requireSmokeBaseUrl();

  console.log(`Production smoke test: ${baseUrl.toString()}`);
  console.log("Read-only checks only: no OpenAI calls, no Notion writes.\n");

  const results: SmokeResult[] = [];

  for (const check of checks) {
    const result = await runCheck(baseUrl, check);
    results.push(result);

    const status = result.status ? ` (${result.status})` : "";
    const prefix = result.ok ? "PASS" : "FAIL";
    console.log(`${prefix} ${check.name}${status}`);

    if (result.error) {
      console.log(`     ${result.error}`);
    }
  }

  const failed = results.filter((result) => !result.ok);

  console.log(
    `\nSmoke test complete: ${results.length - failed.length}/${results.length} passed.`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
