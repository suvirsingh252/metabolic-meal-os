import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  constantTimeEqual,
  shouldAllowUnauthenticated
} from "@/src/lib/server/auth";
import {
  enforceRateLimit,
  getClientIp,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2_000;
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit({
    key: `auth-session:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
    action: "auth-session"
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const expectedToken = process.env.APP_AUTH_TOKEN?.trim();

  if (!expectedToken) {
    if (shouldAllowUnauthenticated()) {
      return NextResponse.json({
        ok: true,
        message: "Authentication is disabled on this deployment.",
        redirectTo: "/today"
      });
    }

    return NextResponse.json(
      {
        error:
          "Server is private by default and APP_AUTH_TOKEN is not configured. Login is unavailable."
      },
      { status: 503 }
    );
  }

  const body = await readJsonWithLimit<{ token?: unknown }>(
    request,
    MAX_BODY_BYTES
  );

  if (body instanceof NextResponse) {
    return body;
  }

  const submittedToken =
    typeof body.token === "string" ? body.token.trim() : "";

  if (!submittedToken || !constantTimeEqual(submittedToken, expectedToken)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: "/today" });

  response.cookies.set(AUTH_COOKIE_NAME, submittedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });

  return response;
}
