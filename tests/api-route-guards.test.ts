import assert from "node:assert/strict";
import test from "node:test";
import { GET as getNotionDiagnostics } from "@/src/app/api/diagnostics/notion/route";
import { GET as getNotionSchemaDiagnostics } from "@/src/app/api/diagnostics/notion-schemas/route";
import { POST as lookupIngredient } from "@/src/app/api/ingredients/lookup/route";
import {
  resetRateLimiterForTests,
  setRateLimiterForTests,
  type RateLimitRequest,
  type RateLimitResult
} from "@/src/lib/server/rate-limit";

function jsonRequest(body: unknown, headers?: HeadersInit) {
  return new Request("https://example.test/api/ingredients/lookup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function getRequest(url: string, headers?: HeadersInit) {
  return new Request(url, {
    method: "GET",
    headers
  });
}

function restoreEnv(name: string, previousValue: string | undefined) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test("ingredient lookup requires app auth when configured", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";

  try {
    const response = await lookupIngredient(jsonRequest({ ingredient: "oats" }));

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Authentication required." });
  } finally {
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});

test("ingredient lookup enforces the route body size limit", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";

  try {
    const response = await lookupIngredient(
      jsonRequest(
        { ingredient: "oats", padding: "x".repeat(10_000) },
        { authorization: "Bearer test-token" }
      )
    );

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      error: "Request body must be 10000 bytes or fewer."
    });
  } finally {
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});

test("ingredient lookup invokes the ingredients lookup rate limit", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";
  const requests: RateLimitRequest[] = [];

  setRateLimiterForTests({
    check(request): RateLimitResult {
      requests.push(request);

      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
        retryAfterSeconds: 60,
        action: request.action
      };
    }
  });

  try {
    const response = await lookupIngredient(
      jsonRequest(
        { ingredient: "oats" },
        {
          authorization: "Bearer test-token",
          "x-forwarded-for": "203.0.113.9"
        }
      )
    );

    assert.equal(response.status, 429);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.key, "ingredients-lookup:203.0.113.9");
    assert.equal(requests[0]?.maxRequests, 30);
  } finally {
    resetRateLimiterForTests();
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});

test("ingredient lookup accepts the app auth cookie", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";

  // Deny at the rate limiter so the request stops right after auth passes;
  // a 429 (not 401) proves the cookie was accepted.
  setRateLimiterForTests({
    check(request): RateLimitResult {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
        retryAfterSeconds: 60,
        action: request.action
      };
    }
  });

  try {
    const response = await lookupIngredient(
      jsonRequest(
        { ingredient: "oats" },
        { cookie: "app_auth_token=test-token" }
      )
    );

    assert.equal(response.status, 429);
  } finally {
    resetRateLimiterForTests();
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});

test("ingredient lookup rejects an invalid app auth cookie", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";

  try {
    const response = await lookupIngredient(
      jsonRequest(
        { ingredient: "oats" },
        { cookie: "app_auth_token=wrong-token" }
      )
    );

    assert.equal(response.status, 401);
  } finally {
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});

test("notion diagnostics requires app auth when configured", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";

  try {
    const response = await getNotionDiagnostics(
      getRequest("https://example.test/api/diagnostics/notion")
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Authentication required." });
  } finally {
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});

test("notion schema diagnostics uses the diagnostics rate limit", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";
  const requests: RateLimitRequest[] = [];

  setRateLimiterForTests({
    check(request): RateLimitResult {
      requests.push(request);

      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60_000,
        retryAfterSeconds: 60,
        action: request.action
      };
    }
  });

  try {
    const response = await getNotionSchemaDiagnostics(
      getRequest("https://example.test/api/diagnostics/notion-schemas", {
        authorization: "Bearer test-token",
        "x-forwarded-for": "198.51.100.11"
      })
    );

    assert.equal(response.status, 429);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.key, "diagnostics:198.51.100.11");
    assert.equal(requests[0]?.maxRequests, 10);
  } finally {
    resetRateLimiterForTests();
    restoreEnv("APP_AUTH_TOKEN", previousAuthToken);
  }
});
