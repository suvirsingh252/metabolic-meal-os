import assert from "node:assert/strict";
import test from "node:test";
import {
  constantTimeEqual,
  getAuthTokenFromRequest,
  isAuthorizedRequest,
  shouldAllowUnauthenticated
} from "@/src/lib/server/auth";
import { enforcePrivateDeployment } from "@/src/lib/server/request-guards";

const AUTH_ENV_KEYS = [
  "APP_AUTH_TOKEN",
  "IOS_SHORTCUT_TOKEN",
  "ALLOW_UNAUTHENTICATED",
  "PRIVATE_DEPLOYMENT_MODE"
] as const;

function withEnv(
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

  const restore = () => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = run();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

function makeRequest(headers?: HeadersInit) {
  return new Request("https://example.test/api/today", { headers });
}

// --- constantTimeEqual ---

test("constantTimeEqual: equal strings match", () => {
  assert.equal(constantTimeEqual("secret-token", "secret-token"), true);
});

test("constantTimeEqual: different strings do not match", () => {
  assert.equal(constantTimeEqual("secret-token", "other-token!"), false);
});

test("constantTimeEqual: partial prefix does not match", () => {
  assert.equal(constantTimeEqual("secret", "secret-token"), false);
  assert.equal(constantTimeEqual("secret-token", "secret"), false);
});

test("constantTimeEqual: empty vs non-empty does not match", () => {
  assert.equal(constantTimeEqual("", "secret"), false);
  assert.equal(constantTimeEqual("", ""), true);
});

// --- shouldAllowUnauthenticated ---

test("shouldAllowUnauthenticated: false by default", () =>
  withEnv({}, () => {
    assert.equal(shouldAllowUnauthenticated(), false);
  }));

test("shouldAllowUnauthenticated: true with ALLOW_UNAUTHENTICATED=true", () =>
  withEnv({ ALLOW_UNAUTHENTICATED: "true" }, () => {
    assert.equal(shouldAllowUnauthenticated(), true);
  }));

test("shouldAllowUnauthenticated: true with legacy PRIVATE_DEPLOYMENT_MODE=false", () =>
  withEnv({ PRIVATE_DEPLOYMENT_MODE: "false" }, () => {
    assert.equal(shouldAllowUnauthenticated(), true);
  }));

test("shouldAllowUnauthenticated: PRIVATE_DEPLOYMENT_MODE=true does not opt out", () =>
  withEnv({ PRIVATE_DEPLOYMENT_MODE: "true" }, () => {
    assert.equal(shouldAllowUnauthenticated(), false);
  }));

// --- getAuthTokenFromRequest ---

test("getAuthTokenFromRequest: reads bearer token", () => {
  const token = getAuthTokenFromRequest(
    makeRequest({ authorization: "Bearer abc123" })
  );
  assert.equal(token, "abc123");
});

test("getAuthTokenFromRequest: reads x-app-auth-token header", () => {
  const token = getAuthTokenFromRequest(
    makeRequest({ "x-app-auth-token": "abc123" })
  );
  assert.equal(token, "abc123");
});

test("getAuthTokenFromRequest: ignores cookie by default", () => {
  const token = getAuthTokenFromRequest(
    makeRequest({ cookie: "app_auth_token=abc123" })
  );
  assert.equal(token, null);
});

test("getAuthTokenFromRequest: reads cookie when allowCookie is true", () => {
  const token = getAuthTokenFromRequest(
    makeRequest({ cookie: "theme=dark; app_auth_token=abc123; other=1" }),
    { allowCookie: true }
  );
  assert.equal(token, "abc123");
});

// --- isAuthorizedRequest ---

test("isAuthorizedRequest: bearer token accepted", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const decision = isAuthorizedRequest(
      makeRequest({ authorization: "Bearer test-token" })
    );
    assert.deepEqual(decision, { ok: true });
  }));

test("isAuthorizedRequest: x-app-auth-token accepted", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const decision = isAuthorizedRequest(
      makeRequest({ "x-app-auth-token": "test-token" })
    );
    assert.deepEqual(decision, { ok: true });
  }));

test("isAuthorizedRequest: cookie accepted only when allowCookie is true", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const headers = { cookie: "app_auth_token=test-token" };

    const withCookie = isAuthorizedRequest(makeRequest(headers), {
      allowCookie: true
    });
    assert.deepEqual(withCookie, { ok: true });

    const withoutCookie = isAuthorizedRequest(makeRequest(headers));
    assert.deepEqual(withoutCookie, {
      ok: false,
      reason: "missing_request_token"
    });
  }));

test("isAuthorizedRequest: invalid token rejected", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const decision = isAuthorizedRequest(
      makeRequest({ authorization: "Bearer wrong-token" })
    );
    assert.deepEqual(decision, { ok: false, reason: "invalid_token" });
  }));

test("isAuthorizedRequest: partial prefix token rejected", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const decision = isAuthorizedRequest(
      makeRequest({ authorization: "Bearer test" })
    );
    assert.deepEqual(decision, { ok: false, reason: "invalid_token" });
  }));

test("isAuthorizedRequest: missing server token reported", () =>
  withEnv({}, () => {
    const decision = isAuthorizedRequest(
      makeRequest({ authorization: "Bearer anything" })
    );
    assert.deepEqual(decision, { ok: false, reason: "missing_server_token" });
  }));

test("isAuthorizedRequest: explicit expectedToken overrides APP_AUTH_TOKEN", () =>
  withEnv({ APP_AUTH_TOKEN: "app-token", IOS_SHORTCUT_TOKEN: "ios-token" }, () => {
    const decision = isAuthorizedRequest(
      makeRequest({ authorization: "Bearer ios-token" }),
      { expectedToken: process.env.IOS_SHORTCUT_TOKEN }
    );
    assert.deepEqual(decision, { ok: true });
  }));

test("isAuthorizedRequest: ALLOW_UNAUTHENTICATED=true bypasses auth even when APP_AUTH_TOKEN is set", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token", ALLOW_UNAUTHENTICATED: "true" }, () => {
    const decision = isAuthorizedRequest(makeRequest());
    assert.deepEqual(decision, { ok: true });
  }));

test("isAuthorizedRequest: legacy PRIVATE_DEPLOYMENT_MODE=false bypasses auth even when APP_AUTH_TOKEN is set", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token", PRIVATE_DEPLOYMENT_MODE: "false" }, () => {
    const decision = isAuthorizedRequest(makeRequest());
    assert.deepEqual(decision, { ok: true });
  }));

test("isAuthorizedRequest: unauthenticated bypass can be disabled for dedicated tokens", () =>
  withEnv({ IOS_SHORTCUT_TOKEN: "ios-token", ALLOW_UNAUTHENTICATED: "true" }, () => {
    const decision = isAuthorizedRequest(makeRequest(), {
      expectedToken: process.env.IOS_SHORTCUT_TOKEN,
      allowUnauthenticatedBypass: false
    });
    assert.deepEqual(decision, {
      ok: false,
      reason: "missing_request_token"
    });
  }));

// --- enforcePrivateDeployment ---

test("enforcePrivateDeployment: missing token with no opt-out fails closed with 503", () =>
  withEnv({}, async () => {
    const response = enforcePrivateDeployment(makeRequest());
    assert.notEqual(response, null);
    assert.equal(response?.status, 503);
  }));

test("enforcePrivateDeployment: missing token with ALLOW_UNAUTHENTICATED=true passes", () =>
  withEnv({ ALLOW_UNAUTHENTICATED: "true" }, () => {
    assert.equal(enforcePrivateDeployment(makeRequest()), null);
  }));

test("enforcePrivateDeployment: ALLOW_UNAUTHENTICATED=true passes when APP_AUTH_TOKEN is set", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token", ALLOW_UNAUTHENTICATED: "true" }, () => {
    assert.equal(enforcePrivateDeployment(makeRequest()), null);
  }));

test("enforcePrivateDeployment: missing token with legacy PRIVATE_DEPLOYMENT_MODE=false passes", () =>
  withEnv({ PRIVATE_DEPLOYMENT_MODE: "false" }, () => {
    assert.equal(enforcePrivateDeployment(makeRequest()), null);
  }));

test("enforcePrivateDeployment: valid bearer token passes", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const response = enforcePrivateDeployment(
      makeRequest({ authorization: "Bearer test-token" })
    );
    assert.equal(response, null);
  }));

test("enforcePrivateDeployment: valid cookie passes", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, () => {
    const response = enforcePrivateDeployment(
      makeRequest({ cookie: "app_auth_token=test-token" })
    );
    assert.equal(response, null);
  }));

test("enforcePrivateDeployment: invalid cookie rejected with 401", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, async () => {
    const response = enforcePrivateDeployment(
      makeRequest({ cookie: "app_auth_token=wrong-token" })
    );
    assert.equal(response?.status, 401);
  }));

test("enforcePrivateDeployment: cookie ignored when cookie auth is disabled", () =>
  withEnv({ APP_AUTH_TOKEN: "test-token" }, async () => {
    const response = enforcePrivateDeployment(
      makeRequest({ cookie: "app_auth_token=test-token" }),
      { allowCookie: false }
    );
    assert.equal(response?.status, 401);
  }));
