import type {
  RateLimiter,
  RateLimitRequest,
  RateLimitResult
} from "@/src/lib/server/rate-limit/types";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface MemoryRateLimiterOptions {
  maxBuckets?: number;
  sweepIntervalMs?: number;
}

const defaultMaxBuckets = 10_000;
const defaultSweepIntervalMs = 60_000;

// In-memory limiting is per-process and best-effort on Vercel/serverless.
export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly maxBuckets: number;
  private readonly sweepIntervalMs: number;
  private lastSweepAt = 0;

  constructor(options: MemoryRateLimiterOptions = {}) {
    this.maxBuckets = options.maxBuckets ?? defaultMaxBuckets;
    this.sweepIntervalMs = options.sweepIntervalMs ?? defaultSweepIntervalMs;
  }

  check(request: RateLimitRequest): RateLimitResult {
    const now = Date.now();

    this.sweepExpiredBuckets(now);

    const bucket = this.buckets.get(request.key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + request.windowMs;
      this.buckets.set(request.key, {
        count: 1,
        resetAt
      });

      return {
        allowed: true,
        remaining: Math.max(request.maxRequests - 1, 0),
        resetAt,
        action: request.action
      };
    }

    bucket.count += 1;

    const allowed = bucket.count <= request.maxRequests;

    return {
      allowed,
      remaining: Math.max(request.maxRequests - bucket.count, 0),
      resetAt: bucket.resetAt,
      retryAfterSeconds: allowed
        ? undefined
        : Math.ceil((bucket.resetAt - now) / 1000),
      action: request.action
    };
  }

  private sweepExpiredBuckets(now: number) {
    if (
      this.buckets.size <= this.maxBuckets &&
      now - this.lastSweepAt < this.sweepIntervalMs
    ) {
      return;
    }

    this.lastSweepAt = now;

    this.buckets.forEach((bucket, key) => {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    });
  }
}
