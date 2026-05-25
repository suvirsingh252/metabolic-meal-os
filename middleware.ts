import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authToken = process.env.APP_AUTH_TOKEN?.trim();
  const privateMode = process.env.PRIVATE_DEPLOYMENT_MODE?.trim() !== "false";

  if (!authToken) {
    if (privateMode) {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        error:
          "Metabolic Meal OS is configured for private deployment only until authentication is enabled."
      },
      { status: 503 }
    );
  }

  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const headerToken = request.headers.get("x-app-auth-token");
  const cookieToken = request.cookies.get("app_auth_token")?.value;

  if (bearer === authToken || headerToken === authToken || cookieToken === authToken) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"]
};
