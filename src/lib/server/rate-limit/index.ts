import { NextResponse } from "next/server";
import { MemoryRateLimiter } from "@/src/lib/server/rate-limit/memory";
import type {
  RateLimiter,
  RateLimitRequest,
  RateLimitResult
} from "@/src/lib/server/rate-limit/types";

const memoryRateLimiter = new MemoryRateLimiter();

let activeRateLimiter: RateLimiter = memoryRateLimiter;

export function getRateLimiter() {
  return activeRateLimiter;
}

export function setRateLimiterForTests(rateLimiter: RateLimiter) {
  activeRateLimiter = rateLimiter;
}

export function resetRateLimiterForTests() {
  activeRateLimiter = memoryRateLimiter;
}

export function checkRateLimit(request: RateLimitRequest): RateLimitResult {
  return activeRateLimiter.check(request);
}

export function rateLimitErrorResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Too many requests. Try again shortly.",
      action: result.action
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds ?? 60)
      }
    }
  );
}

export type { RateLimiter, RateLimitRequest, RateLimitResult };
