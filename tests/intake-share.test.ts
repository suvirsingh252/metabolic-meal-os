import assert from "node:assert/strict";
import test from "node:test";
import { POST as postIntakeShare } from "@/src/app/api/intake/share/route";
import { classifyInput, normalizeUrl, parseUrl } from "@/src/lib/intake/classify";
import { getIntakeDbId } from "@/src/lib/intake/notion";
import {
  resetRateLimiterForTests,
  setRateLimiterForTests,
  type RateLimitRequest,
  type RateLimitResult
} from "@/src/lib/server/rate-limit";

// --- openUrl construction ---

function buildAnalyzeUrl(origin: string, intakeId?: string): string {
  const base = `${origin}/analyze`;
  return intakeId ? `${base}?intake=${intakeId}` : base;
}

function extractOrigin(requestUrl: string): string {
  try {
    return new URL(requestUrl).origin;
  } catch {
    return "https://metabolic-meal-os.vercel.app";
  }
}

test("openUrl: uses request origin (not hardcoded production URL)", () => {
  const origin = extractOrigin("https://metabolic-meal-os-due4.vercel.app/api/intake/share");
  assert.equal(origin, "https://metabolic-meal-os-due4.vercel.app");
});

test("openUrl: pathname is /analyze without intake id", () => {
  const url = buildAnalyzeUrl("https://metabolic-meal-os-due4.vercel.app");
  assert.equal(new URL(url).pathname, "/analyze");
  assert.equal(new URL(url).search, "");
});

test("openUrl: pathname is /analyze with intake query param", () => {
  const id = "abc123de-f456-789a-bcde-f01234567890";
  const url = buildAnalyzeUrl("https://metabolic-meal-os-due4.vercel.app", id);
  assert.equal(new URL(url).pathname, "/analyze");
  assert.equal(new URL(url).searchParams.get("intake"), id);
});

test("openUrl: does not contain /api/intake or /intake prefix", () => {
  const url = buildAnalyzeUrl("https://example.vercel.app", "some-id");
  assert.ok(!url.includes("/api/intake"), "must not start with /api/intake");
  assert.ok(!url.includes("/intake/analyze"), "must not use /intake/analyze");
  assert.equal(new URL(url).pathname, "/analyze");
});

test("openUrl: production URL fallback when request URL is malformed", () => {
  const origin = extractOrigin("not-a-url");
  assert.equal(origin, "https://metabolic-meal-os.vercel.app");
});

test("openUrl: due4 deployment returns due4 origin (not production)", () => {
  const origin = extractOrigin("https://metabolic-meal-os-due4.vercel.app/api/intake/share");
  const url = buildAnalyzeUrl(origin, "test-id-123");
  assert.ok(url.startsWith("https://metabolic-meal-os-due4.vercel.app"), "must use due4 origin");
  assert.ok(!url.startsWith("https://metabolic-meal-os.vercel.app/"), "must not use prod origin");
});

// --- /analyze page searchParams handling ---

function resolveIntakeId(searchParams: Record<string, string | undefined>): string | undefined {
  const raw = searchParams["intake"];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

test("/analyze: no intake param returns undefined intakeId", () => {
  assert.equal(resolveIntakeId({}), undefined);
});

test("/analyze: intake param extracts correctly", () => {
  const id = "abc123de-f456-789a-bcde-f01234567890";
  assert.equal(resolveIntakeId({ intake: id }), id);
});

test("/analyze: whitespace-only intake param returns undefined", () => {
  assert.equal(resolveIntakeId({ intake: "   " }), undefined);
});

test("/analyze: non-string intake param returns undefined", () => {
  assert.equal(resolveIntakeId({ intake: undefined }), undefined);
});

// --- classifyInput ---

test("classifyInput: recipe URL from allrecipes", () => {
  const result = classifyInput("https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/");
  assert.equal(result, "recipe-url");
});

test("classifyInput: recipe URL from simplyrecipes", () => {
  const result = classifyInput("https://www.simplyrecipes.com/recipes/homemade_pasta/");
  assert.equal(result, "recipe-url");
});

test("classifyInput: social URL from instagram", () => {
  const result = classifyInput("https://www.instagram.com/p/ABC123/");
  assert.equal(result, "social-url");
});

test("classifyInput: social URL from tiktok", () => {
  const result = classifyInput("https://www.tiktok.com/@user/video/123456");
  assert.equal(result, "social-url");
});

test("classifyInput: social URL from youtube", () => {
  const result = classifyInput("https://www.youtube.com/watch?v=abc123");
  assert.equal(result, "social-url");
});

test("classifyInput: social URL from youtu.be", () => {
  const result = classifyInput("https://youtu.be/abc123");
  assert.equal(result, "social-url");
});

test("classifyInput: social URL from pinterest", () => {
  const result = classifyInput("https://pinterest.com/pin/123456/");
  assert.equal(result, "social-url");
});

test("classifyInput: social URL from x.com", () => {
  const result = classifyInput("https://x.com/user/status/123");
  assert.equal(result, "social-url");
});

test("classifyInput: unknown URL (non-recipe, non-social)", () => {
  const result = classifyInput("https://example.com/about");
  assert.equal(result, "unknown-url");
});

test("classifyInput: plain text with no URL", () => {
  const result = classifyInput(undefined, "Boil the pasta for 8 minutes.");
  assert.equal(result, "plain-text");
});

test("classifyInput: plain text takes priority when URL is absent", () => {
  const result = classifyInput(undefined, "Dal tadka recipe: fry cumin...");
  assert.equal(result, "plain-text");
});

test("classifyInput: URL takes priority over text when both present", () => {
  const result = classifyInput(
    "https://www.instagram.com/p/ABC/",
    "Some recipe text here"
  );
  assert.equal(result, "social-url");
});

test("classifyInput: empty text and no URL returns unknown-url", () => {
  const result = classifyInput(undefined, "");
  assert.equal(result, "unknown-url");
});

// --- normalizeUrl ---

test("normalizeUrl: adds https when scheme missing", () => {
  assert.equal(normalizeUrl("example.com/recipe"), "https://example.com/recipe");
});

test("normalizeUrl: leaves https:// URLs unchanged", () => {
  assert.equal(
    normalizeUrl("https://example.com/recipe"),
    "https://example.com/recipe"
  );
});

test("normalizeUrl: trims whitespace", () => {
  assert.equal(
    normalizeUrl("  https://example.com/recipe  "),
    "https://example.com/recipe"
  );
});

// --- parseUrl ---

test("parseUrl: parses valid URL", () => {
  const parsed = parseUrl("https://example.com");
  assert.notEqual(parsed, null);
  assert.equal(parsed?.hostname, "example.com");
});

test("parseUrl: returns null for invalid URL", () => {
  const parsed = parseUrl("not a url at all $$");
  assert.equal(parsed, null);
});

// --- token validation ---

function checkToken(
  envToken: string | undefined,
  bearerToken: string | undefined
): { status: number } {
  // Mirror the validateToken logic from the route
  const token = envToken?.trim();
  if (!token) return { status: 503 };
  if (!bearerToken || bearerToken !== token) return { status: 401 };
  return { status: 200 };
}

test("token validation: valid token accepted", () => {
  assert.equal(checkToken("secret123", "secret123").status, 200);
});

test("token validation: invalid token rejected with 401", () => {
  assert.equal(checkToken("secret123", "wrongtoken").status, 401);
});

test("token validation: missing bearer rejected with 401", () => {
  assert.equal(checkToken("secret123", undefined).status, 401);
});

test("token validation: unconfigured env returns 503", () => {
  assert.equal(checkToken(undefined, "anything").status, 503);
});

// --- payload validation ---

function validatePayload(body: unknown): { ok: boolean; status: number; reason?: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, status: 400, reason: "not-object" };
  }
  const b = body as Record<string, unknown>;
  const input = typeof b.input === "string" ? b.input.trim() : undefined;
  const url = typeof b.url === "string" ? b.url.trim() : undefined;
  const text = typeof b.text === "string" ? b.text.trim() : undefined;
  if (!input && !url && !text) return { ok: false, status: 400, reason: "empty" };
  return { ok: true, status: 200 };
}

function normalizePayloadInput(body: { input?: string; url?: string; text?: string }): {
  rawUrl?: string;
  text?: string;
} {
  if (body.input?.trim()) {
    const parsed = parseUrl(body.input);
    if (parsed) return { rawUrl: body.input.trim() };
    return { text: body.input.trim() };
  }
  return { rawUrl: body.url?.trim(), text: body.text?.trim() };
}

test("payload validation: single input URL accepted", () => {
  const result = validatePayload({ input: "https://instagram.com/p/abc" });
  assert.equal(result.ok, true);
});

test("payload validation: single input plain text accepted", () => {
  const result = validatePayload({ input: "Boil pasta for 8 minutes with salt." });
  assert.equal(result.ok, true);
});

test("payload validation: valid recipe URL accepted", () => {
  const result = validatePayload({ url: "https://allrecipes.com/recipe/123" });
  assert.equal(result.ok, true);
});

test("payload validation: valid social URL accepted", () => {
  const result = validatePayload({ url: "https://instagram.com/p/abc" });
  assert.equal(result.ok, true);
});

test("payload validation: valid plain text accepted", () => {
  const result = validatePayload({ text: "Boil pasta for 8 minutes with salt." });
  assert.equal(result.ok, true);
});

test("payload validation: empty payload rejected", () => {
  const result = validatePayload({});
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("payload validation: whitespace-only text rejected", () => {
  const result = validatePayload({ text: "   " });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("payload validation: whitespace-only input rejected", () => {
  const result = validatePayload({ input: "   " });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("payload validation: non-object body rejected", () => {
  const result = validatePayload("just a string");
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("payload normalization: input URL becomes rawUrl", () => {
  const result = normalizePayloadInput({ input: "instagram.com/p/abc" });
  assert.equal(result.rawUrl, "instagram.com/p/abc");
  assert.equal(result.text, undefined);
});

test("payload normalization: input text becomes text", () => {
  const result = normalizePayloadInput({ input: "A copied recipe paragraph" });
  assert.equal(result.rawUrl, undefined);
  assert.equal(result.text, "A copied recipe paragraph");
});

// --- Notion DB config ---

test("getIntakeDbId: returns undefined when env var missing", () => {
  // In test environment NOTION_MEAL_INTAKE_DATABASE_ID is not set
  const saved = process.env.NOTION_MEAL_INTAKE_DATABASE_ID;
  delete process.env.NOTION_MEAL_INTAKE_DATABASE_ID;
  const result = getIntakeDbId();
  assert.equal(result, undefined);
  if (saved !== undefined) process.env.NOTION_MEAL_INTAKE_DATABASE_ID = saved;
});

// --- POST /api/intake/share route behavior ---

const INTAKE_ENV_KEYS = [
  "IOS_SHORTCUT_TOKEN",
  "ALLOW_UNAUTHENTICATED",
  "PRIVATE_DEPLOYMENT_MODE",
  "NOTION_MEAL_INTAKE_DATABASE_ID"
] as const;

async function withIntakeEnv(
  overrides: Partial<Record<(typeof INTAKE_ENV_KEYS)[number], string>>,
  run: () => Promise<void>
) {
  const saved = INTAKE_ENV_KEYS.map((key) => [key, process.env[key]] as const);

  for (const key of INTAKE_ENV_KEYS) {
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

function intakeRequest(body: unknown, headers?: HeadersInit) {
  return new Request("https://example.test/api/intake/share", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

test("intake share: authorized shortcut request succeeds", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
    const response = await postIntakeShare(
      intakeRequest(
        { input: "https://www.allrecipes.com/recipe/123/" },
        { authorization: "Bearer ios-token" }
      )
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  }));

test("intake share: missing shortcut token rejected with 401", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
    const response = await postIntakeShare(
      intakeRequest({ input: "some recipe text" })
    );

    assert.equal(response.status, 401);
  }));

test("intake share: ALLOW_UNAUTHENTICATED=true still requires shortcut token", () =>
  withIntakeEnv(
    { IOS_SHORTCUT_TOKEN: "ios-token", ALLOW_UNAUTHENTICATED: "true" },
    async () => {
      const response = await postIntakeShare(
        intakeRequest({ input: "some recipe text" })
      );

      assert.equal(response.status, 401);
    }
  ));

test("intake share: ALLOW_UNAUTHENTICATED=true still fails closed when shortcut token is unconfigured", () =>
  withIntakeEnv({ ALLOW_UNAUTHENTICATED: "true" }, async () => {
    const response = await postIntakeShare(
      intakeRequest(
        { input: "some recipe text" },
        { authorization: "Bearer anything" }
      )
    );

    assert.equal(response.status, 503);
  }));

test("intake share: invalid shortcut token rejected with 401", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
    const response = await postIntakeShare(
      intakeRequest(
        { input: "some recipe text" },
        { authorization: "Bearer wrong-token" }
      )
    );

    assert.equal(response.status, 401);
  }));

test("intake share: auth cookie is not accepted for shortcut intake", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
    const response = await postIntakeShare(
      intakeRequest(
        { input: "some recipe text" },
        { cookie: "app_auth_token=ios-token" }
      )
    );

    assert.equal(response.status, 401);
  }));

test("intake share: unconfigured shortcut token returns 503 without opt-out", () =>
  withIntakeEnv({}, async () => {
    const response = await postIntakeShare(
      intakeRequest(
        { input: "some recipe text" },
        { authorization: "Bearer anything" }
      )
    );

    assert.equal(response.status, 503);
  }));

test("intake share: invalid sharedAt returns 400", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
    for (const sharedAt of ["not-a-date", "tomorrow", "2026-13-99T00:00:00Z"]) {
      const response = await postIntakeShare(
        intakeRequest(
          { input: "some recipe text", sharedAt },
          { authorization: "Bearer ios-token" }
        )
      );

      assert.equal(response.status, 400, `sharedAt=${sharedAt}`);
    }
  }));

test("intake share: valid ISO sharedAt accepted", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
    const response = await postIntakeShare(
      intakeRequest(
        { input: "some recipe text", sharedAt: "2026-06-12T08:30:00.000Z" },
        { authorization: "Bearer ios-token" }
      )
    );

    assert.equal(response.status, 200);
  }));

test("intake share: invokes the intake-share rate limit after auth", () =>
  withIntakeEnv({ IOS_SHORTCUT_TOKEN: "ios-token" }, async () => {
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
      const response = await postIntakeShare(
        intakeRequest(
          { input: "some recipe text" },
          {
            authorization: "Bearer ios-token",
            "x-forwarded-for": "203.0.113.20"
          }
        )
      );

      assert.equal(response.status, 429);
      assert.equal(requests.length, 1);
      assert.equal(requests[0]?.key, "intake-share:203.0.113.20");
      assert.equal(requests[0]?.maxRequests, 20);
    } finally {
      resetRateLimiterForTests();
    }
  }));

test("getIntakeDbId: returns value when env var is set", () => {
  const saved = process.env.NOTION_MEAL_INTAKE_DATABASE_ID;
  process.env.NOTION_MEAL_INTAKE_DATABASE_ID = "test-db-id-123";
  const result = getIntakeDbId();
  assert.equal(result, "test-db-id-123");
  if (saved !== undefined) {
    process.env.NOTION_MEAL_INTAKE_DATABASE_ID = saved;
  } else {
    delete process.env.NOTION_MEAL_INTAKE_DATABASE_ID;
  }
});
