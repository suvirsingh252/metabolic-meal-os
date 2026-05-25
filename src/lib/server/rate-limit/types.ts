export interface RateLimitRequest {
  key: string;
  windowMs: number;
  maxRequests: number;
  action: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
  action: string;
}

export interface RateLimiter {
  check(request: RateLimitRequest): RateLimitResult;
}
