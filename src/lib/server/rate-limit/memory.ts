import type {
  RateLimiter,
  RateLimitRequest,
  RateLimitResult
} from "@/src/lib/server/rate-limit/types";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(request: RateLimitRequest): RateLimitResult {
    const now = Date.now();
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
}
