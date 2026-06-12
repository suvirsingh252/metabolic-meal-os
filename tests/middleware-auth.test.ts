import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware, config as middlewareConfig } from "@/middleware";

const AUTH_ENV_KEYS = [
  "APP_AUTH_TOKEN",
  "IOS_SHORTCUT_TOKEN",
  "ALLOW_UNAUTHENTICATED",
  "PRIVATE_DEPLOYMENT_MODE"
] as const;

async function withEnv(
  overrides: Partial<Record<(typeof AUTH_ENV_KEYS)[number], string>>,
  run: () => void | Promise<void>
) {
  const saved = AUTH_ENV_KEYS.map((key) => [key, process.env[key]] as const);

  for (const key of AUTH_ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }

  try {
    await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function pageRequest(path: string, headers?: HeadersInit) {
  return new NextRequest(`https://example.test${path}`, {
    headers: { accept: "text/html,application/xhtml+xml", ...headers }
  });
}

function apiRequest(path: string, headers?: HeadersInit) {
  return new NextRequest(`https://example.test${path}`, {
    headers: { accept: "application/json", ...headers }
  });
}

test("middleware: missing token with no opt-out fails closed with 503", () =>
  withEnv({}, () => {
    const response = middleware(pageRequest("/today"));
    assert.equal(response.status, 503);
  }));

test("middleware: missing token with ALLOW_UNAUTHENTICATED=true passes", () =>
  withEnv({ ALLOW_UNAUTHENTICATED: "true" }, () => {
    const response = middleware(pageRequest("/today"));
    assert.equal(response.status, 200);
  }));

test("middleware: ALLOW_UNAUTHENTICATED=true passes page requests even when APP_AUTH_TOKEN is set", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token", ALLOW_UNAUTHENTICATED: "true" }, () => {
    const response = middleware(pageRequest("/today"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }));

test("middleware: ALLOW_UNAUTHENTICATED=true passes app API requests without token", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token", ALLOW_UNAUTHENTICATED: "true" }, async () => {
    const response = middleware(apiRequest("/api/today"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }));

test("middleware: missing token with legacy PRIVATE_DEPLOYMENT_MODE=false passes", () =>
  withEnv({ PRIVATE_DEPLOYMENT_MODE: "false" }, () => {
    const response = middleware(pageRequest("/today"));
    assert.equal(response.status, 200);
  }));

test("middleware: unauthenticated HTML page request redirects to /login", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const response = middleware(pageRequest("/today"));
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://example.test/login"
    );
  }));

test("middleware: unauthenticated API request returns JSON 401, no redirect", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, async () => {
    const response = middleware(apiRequest("/api/today"));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("location"), null);
    assert.deepEqual(await response.json(), {
      error: "Authentication required."
    });
  }));

test("middleware: valid bearer token passes", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const response = middleware(
      apiRequest("/api/today", { authorization: "Bearer test-token" })
    );
    assert.equal(response.status, 200);
  }));

test("middleware: valid auth cookie passes", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const response = middleware(
      pageRequest("/today", { cookie: "app_auth_token=test-token" })
    );
    assert.equal(response.status, 200);
  }));

test("middleware: invalid auth cookie on page request redirects to /login", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const response = middleware(
      pageRequest("/today", { cookie: "app_auth_token=wrong-token" })
    );
    assert.equal(response.status, 307);
  }));

test("middleware: iOS Shortcut token accepted only on /api/intake/share", () =>
  withEnv(
    { APP_AUTH_TOKEN: "app-token", IOS_SHORTCUT_TOKEN: "ios-token" },
    async () => {
      const intakeResponse = middleware(
        apiRequest("/api/intake/share", { authorization: "Bearer ios-token" })
      );
      assert.equal(intakeResponse.status, 200);

      const otherResponse = middleware(
        apiRequest("/api/today", { authorization: "Bearer ios-token" })
      );
      assert.equal(otherResponse.status, 401);
    }
  ));

test("middleware: matcher excludes login, auth session, and static assets", () => {
  const [matcher] = middlewareConfig.matcher;
  for (const excluded of [
    "login",
    "api/auth/session",
    "_next/static",
    "_next/image",
    "favicon.ico",
    "icons/"
  ]) {
    assert.ok(
      matcher.includes(excluded),
      `matcher must exclude ${excluded}`
    );
  }
});
