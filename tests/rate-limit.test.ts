import assert from "node:assert/strict";
import test from "node:test";
import { MemoryRateLimiter } from "@/src/lib/server/rate-limit/memory";

test("MemoryRateLimiter enforces max requests within a window", () => {
  const limiter = new MemoryRateLimiter();
  const first = limiter.check({
    key: "test",
    windowMs: 60_000,
    maxRequests: 1,
    action: "unit-test"
  });
  const second = limiter.check({
    key: "test",
    windowMs: 60_000,
    maxRequests: 1,
    action: "unit-test"
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.equal(second.action, "unit-test");
});
