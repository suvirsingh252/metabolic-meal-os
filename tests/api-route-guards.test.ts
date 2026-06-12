import assert from "node:assert/strict";
import test from "node:test";
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

test("ingredient lookup requires app auth when configured", async () => {
  const previousAuthToken = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = "test-token";

  try {
    const response = await lookupIngredient(jsonRequest({ ingredient: "oats" }));

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Authentication required." });
  } finally {
    if (previousAuthToken === undefined) {
      delete process.env.APP_AUTH_TOKEN;
    } else {
      process.env.APP_AUTH_TOKEN = previousAuthToken;
    }
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
    if (previousAuthToken === undefined) {
      delete process.env.APP_AUTH_TOKEN;
    } else {
      process.env.APP_AUTH_TOKEN = previousAuthToken;
    }
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

    if (previousAuthToken === undefined) {
      delete process.env.APP_AUTH_TOKEN;
    } else {
      process.env.APP_AUTH_TOKEN = previousAuthToken;
    }
  }
});
