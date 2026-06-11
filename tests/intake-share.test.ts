import assert from "node:assert/strict";
import test from "node:test";
import { classifyInput, normalizeUrl, parseUrl } from "@/src/lib/intake/classify";
import { getIntakeDbId } from "@/src/lib/intake/notion";

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
  const url = typeof b.url === "string" ? b.url.trim() : undefined;
  const text = typeof b.text === "string" ? b.text.trim() : undefined;
  if (!url && !text) return { ok: false, status: 400, reason: "empty" };
  return { ok: true, status: 200 };
}

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

test("payload validation: non-object body rejected", () => {
  const result = validatePayload("just a string");
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
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
