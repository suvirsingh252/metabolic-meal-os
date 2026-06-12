import { NextResponse } from "next/server";
import {
  isAuthorizedRequest,
  shouldAllowUnauthenticated
} from "@/src/lib/server/auth";
import {
  checkRateLimit,
  rateLimitErrorResponse
} from "@/src/lib/server/rate-limit";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  action?: string;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function enforcePrivateDeployment(
  request: Request,
  options?: { allowCookie?: boolean }
) {
  const decision = isAuthorizedRequest(request, {
    allowCookie: options?.allowCookie ?? true
  });

  if (decision.ok) {
    return null;
  }

  if (decision.reason === "missing_server_token") {
    if (shouldAllowUnauthenticated()) {
      return null;
    }

    // Fail closed when APP_AUTH_TOKEN is unset and no explicit opt-out exists.
    return NextResponse.json(
      {
        error:
          "Server is private by default. Set APP_AUTH_TOKEN, or set ALLOW_UNAUTHENTICATED=true to explicitly opt out for trusted family/beta testing."
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export function enforceRateLimit(options: RateLimitOptions) {
  const result = checkRateLimit({
    key: options.key,
    windowMs: options.windowMs,
    maxRequests: options.limit,
    action: options.action ?? options.key
  });

  if (result.allowed) {
    return null;
  }

  return rateLimitErrorResponse(result);
}

export async function readJsonWithLimit<T = unknown>(
  request: Request,
  maxBytes: number
): Promise<T | NextResponse> {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(
      { error: `Request body must be ${maxBytes} bytes or fewer.` },
      { status: 413 }
    );
  }

  const bodyText = await request.text();

  if (Buffer.byteLength(bodyText, "utf8") > maxBytes) {
    return NextResponse.json(
      { error: `Request body must be ${maxBytes} bytes or fewer.` },
      { status: 413 }
    );
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
}

export function guardApiRequest(
  request: Request,
  options: {
    rateLimitKey: string;
    rateLimit: number;
    windowMs?: number;
    action?: string;
  }
) {
  const authResponse = enforcePrivateDeployment(request);

  if (authResponse) {
    return authResponse;
  }

  return enforceRateLimit({
    key: `${options.rateLimitKey}:${getClientIp(request)}`,
    limit: options.rateLimit,
    windowMs: options.windowMs ?? 60_000,
    action: options.action ?? options.rateLimitKey
  });
}
