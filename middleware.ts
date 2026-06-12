import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthorizedRequest,
  isExplicitUnauthenticatedMode
} from "@/src/lib/server/auth";

export function middleware(request: NextRequest) {
  const appAuthDecision = isAuthorizedRequest(request, { allowCookie: true });
  if (appAuthDecision.ok) {
    return NextResponse.next();
  }

  // Allow the iOS Shortcut intake endpoint to authenticate with its own dedicated token.
  if (
    request.nextUrl.pathname === "/api/intake/share" &&
    isAuthorizedRequest(request, {
      expectedToken: process.env.IOS_SHORTCUT_TOKEN,
      allowCookie: false,
      allowUnauthenticatedBypass: false
    }).ok
  ) {
    return NextResponse.next();
  }

  if (appAuthDecision.reason === "missing_server_token") {
    if (isExplicitUnauthenticatedMode()) {
      return NextResponse.next();
    }

    // Fail closed: an unset APP_AUTH_TOKEN must never expose the deployment.
    return NextResponse.json(
      {
        error:
          "Metabolic Meal OS is private by default. Set APP_AUTH_TOKEN, or set ALLOW_UNAUTHENTICATED=true to explicitly opt out for trusted family/beta testing."
      },
      { status: 503 }
    );
  }

  // API callers get JSON, never an HTML redirect.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (request.headers.get("accept")?.includes("text/html")) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|login|api/auth/session).*)"
  ]
};
