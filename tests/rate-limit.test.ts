import assert from "node:assert/strict";
import test from "node:test";
import { MemoryRateLimiter } from "@/src/lib/server/rate-limit/memory";

function bucketKeys(limiter: MemoryRateLimiter) {
  return Array.from(
    (limiter as unknown as { buckets: Map<string, unknown> }).buckets.keys()
  );
}

function withDateNow<T>(now: number, callback: () => T) {
  const originalDateNow = Date.now;
  Date.now = () => now;

  try {
    return callback();
  } finally {
    Date.now = originalDateNow;
  }
}

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

test("MemoryRateLimiter evicts expired buckets when bucket count is high", () => {
  const limiter = new MemoryRateLimiter({ maxBuckets: 2 });

  withDateNow(0, () => {
    limiter.check({
      key: "expired-1",
      windowMs: 10,
      maxRequests: 10,
      action: "unit-test"
    });
    limiter.check({
      key: "expired-2",
      windowMs: 10,
      maxRequests: 10,
      action: "unit-test"
    });
    limiter.check({
      key: "active",
      windowMs: 1_000,
      maxRequests: 10,
      action: "unit-test"
    });
  });

  withDateNow(20, () => {
    limiter.check({
      key: "new",
      windowMs: 1_000,
      maxRequests: 10,
      action: "unit-test"
    });
  });

  assert.deepEqual(bucketKeys(limiter).sort(), ["active", "new"]);
});

test("MemoryRateLimiter evicts expired buckets after sweep interval", () => {
  const limiter = new MemoryRateLimiter({
    maxBuckets: 100,
    sweepIntervalMs: 10
  });

  withDateNow(0, () => {
    limiter.check({
      key: "expired",
      windowMs: 5,
      maxRequests: 10,
      action: "unit-test"
    });
    limiter.check({
      key: "active",
      windowMs: 1_000,
      maxRequests: 10,
      action: "unit-test"
    });
  });

  withDateNow(11, () => {
    limiter.check({
      key: "new",
      windowMs: 1_000,
      maxRequests: 10,
      action: "unit-test"
    });
  });

  assert.deepEqual(bucketKeys(limiter).sort(), ["active", "new"]);
});
