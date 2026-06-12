import assert from "node:assert/strict";
import test from "node:test";
import { POST as createSession } from "@/src/app/api/auth/session/route";

const AUTH_ENV_KEYS = [
  "APP_AUTH_TOKEN",
  "ALLOW_UNAUTHENTICATED",
  "PRIVATE_DEPLOYMENT_MODE"
] as const;

async function withEnv(
  overrides: Partial<Record<(typeof AUTH_ENV_KEYS)[number], string>>,
  run: () => Promise<void>
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

function loginRequest(body: unknown) {
  return new Request("https://example.test/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("session route sets HttpOnly cookie on correct token", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, async () => {
    const response = await createSession(loginRequest({ token: "test-token" }));

    assert.equal(response.status, 200);

    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /app_auth_token=test-token/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /Max-Age=2592000/i);

    const body = (await response.json()) as { ok: boolean; redirectTo: string };
    assert.equal(body.ok, true);
    assert.equal(body.redirectTo, "/today");
  }));

test("session route returns 401 on wrong token without a cookie", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, async () => {
    const response = await createSession(loginRequest({ token: "wrong-token" }));

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  }));

test("session route returns 401 on missing token field", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, async () => {
    const response = await createSession(loginRequest({}));

    assert.equal(response.status, 401);
  }));

test("session route returns 503 when server token missing and no opt-out", () =>
  withEnv({}, async () => {
    const response = await createSession(loginRequest({ token: "anything" }));

    assert.equal(response.status, 503);
  }));

test("session route allows through when server token missing but opt-out set", () =>
  withEnv({ ALLOW_UNAUTHENTICATED: "true" }, async () => {
    const response = await createSession(loginRequest({ token: "anything" }));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("set-cookie"), null);
  }));

test("session route allows through when ALLOW_UNAUTHENTICATED=true and server token is set", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token", ALLOW_UNAUTHENTICATED: "true" }, async () => {
    const response = await createSession(loginRequest({ token: "wrong-token" }));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("set-cookie"), null);
  }));
