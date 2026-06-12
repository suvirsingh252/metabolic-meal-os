import type { IntakeSourcePlatform } from "@/src/lib/intake-v2/types";

const instagramTrackingParams = new Set([
  "igsh",
  "igshid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid"
]);

export interface InstagramCanonicalization {
  originalUrl: string;
  canonicalUrl: string;
  platform: Extract<IntakeSourcePlatform, "instagram">;
  shortcode?: string | null;
  contentType: "reel" | "post" | "story" | "unknown";
}

export function isInstagramUrl(value: string) {
  const parsed = parseHttpUrl(value);

  if (!parsed) {
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  return host === "instagram.com" || host.endsWith(".instagram.com");
}

export function isSupportedInstagramContentUrl(value: string) {
  const canonical = canonicalizeInstagramUrl(value);

  return Boolean(
    canonical &&
      canonical.shortcode &&
      ["reel", "post", "story"].includes(canonical.contentType)
  );
}

export function canonicalizeInstagramUrl(
  value: string
): InstagramCanonicalization | null {
  const parsed = parseHttpUrl(value);

  if (!parsed) {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const markerIndex = segments.findIndex((segment) =>
    ["reel", "p", "stories"].includes(segment.toLowerCase())
  );
  const marker = markerIndex >= 0 ? segments[markerIndex].toLowerCase() : null;
  const shortcode = markerIndex >= 0 ? segments[markerIndex + 1] ?? null : null;
  const canonical = new URL("https://www.instagram.com/");

  if (marker === "reel" && shortcode) {
    canonical.pathname = `/reel/${shortcode}/`;
  } else if (marker === "p" && shortcode) {
    canonical.pathname = `/p/${shortcode}/`;
  } else if (marker === "stories" && shortcode) {
    canonical.pathname = `/stories/${shortcode}/`;
  } else {
    canonical.pathname = parsed.pathname.endsWith("/")
      ? parsed.pathname
      : `${parsed.pathname}/`;
  }

  parsed.searchParams.forEach((valueForKey, key) => {
    if (!instagramTrackingParams.has(key.toLowerCase())) {
      canonical.searchParams.append(key, valueForKey);
    }
  });

  return {
    originalUrl: parsed.toString(),
    canonicalUrl: canonical.toString(),
    platform: "instagram",
    shortcode,
    contentType:
      marker === "reel"
        ? "reel"
        : marker === "p"
          ? "post"
          : marker === "stories"
            ? "story"
            : "unknown"
  };
}

function parseHttpUrl(value: string) {
  const trimmed = value.trim();
  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
