export type AuthOptions = {
  allowCookie?: boolean;
  expectedToken?: string;
};

export type AuthDecision =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_server_token" | "missing_request_token" | "invalid_token";
    };

export const AUTH_COOKIE_NAME = "app_auth_token";

let warnedLegacyPrivateMode = false;

// XOR accumulation instead of node:crypto so middleware can run on the Edge
// runtime. Length mismatch short-circuits, but match position never does.
export function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let result = a.length ^ b.length;

  for (let index = 0; index < maxLength; index += 1) {
    const aCode = index < a.length ? a.charCodeAt(index) : 0;
    const bCode = index < b.length ? b.charCodeAt(index) : 0;
    result |= aCode ^ bCode;
  }

  return result === 0;
}

export function shouldAllowUnauthenticated(): boolean {
  if (process.env.ALLOW_UNAUTHENTICATED?.trim() === "true") {
    return true;
  }

  if (process.env.PRIVATE_DEPLOYMENT_MODE?.trim() === "false") {
    if (!warnedLegacyPrivateMode) {
      warnedLegacyPrivateMode = true;
      console.warn(
        "PRIVATE_DEPLOYMENT_MODE=false is deprecated. Use ALLOW_UNAUTHENTICATED=true to explicitly opt out of authentication."
      );
    }
    return true;
  }

  return false;
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }

    const value = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function getAuthTokenFromRequest(
  request: Request,
  options?: { allowCookie?: boolean }
): string | null {
  const bearer = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];

  if (bearer) {
    return bearer;
  }

  const headerToken = request.headers.get("x-app-auth-token");

  if (headerToken) {
    return headerToken;
  }

  if (options?.allowCookie) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      return getCookieValue(cookieHeader, AUTH_COOKIE_NAME);
    }
  }

  return null;
}

export function isAuthorizedRequest(
  request: Request,
  options?: AuthOptions
): AuthDecision {
  const expectedToken =
    options && "expectedToken" in options
      ? options.expectedToken?.trim()
      : process.env.APP_AUTH_TOKEN?.trim();

  if (!expectedToken) {
    return { ok: false, reason: "missing_server_token" };
  }

  const requestToken = getAuthTokenFromRequest(request, {
    allowCookie: options?.allowCookie
  });

  if (!requestToken) {
    return { ok: false, reason: "missing_request_token" };
  }

  if (!constantTimeEqual(requestToken, expectedToken)) {
    return { ok: false, reason: "invalid_token" };
  }

  return { ok: true };
}

export function resetLegacyPrivateModeWarningForTests() {
  warnedLegacyPrivateMode = false;
}
