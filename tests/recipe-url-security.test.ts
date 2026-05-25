import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeRedirectUrl,
  isPrivateOrReservedIp,
  validateRecipeUrl
} from "@/src/lib/integrations/recipe-parser";

test("validateRecipeUrl blocks localhost and http URLs", () => {
  assert.throws(() => validateRecipeUrl("http://example.com/recipe"));
  assert.throws(() => validateRecipeUrl("https://localhost/recipe"));
  assert.throws(() => validateRecipeUrl("https://127.0.0.1/recipe"));
});

test("isPrivateOrReservedIp blocks private, loopback, link-local, multicast, and reserved ranges", () => {
  assert.equal(isPrivateOrReservedIp("10.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("169.254.10.20"), true);
  assert.equal(isPrivateOrReservedIp("224.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("::1"), true);
  assert.equal(isPrivateOrReservedIp("fd00::1"), true);
});

test("getSafeRedirectUrl rejects redirects to blocked hosts", () => {
  assert.throws(() =>
    getSafeRedirectUrl("https://127.0.0.1/private", new URL("https://example.com"))
  );
});
