import type { IntakeClassification } from "@/src/lib/intake/types";

const SOCIAL_DOMAINS = new Set([
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "facebook.com",
  "youtube.com",
  "youtu.be",
  "threads.net",
  "x.com",
  "twitter.com"
]);

const RECIPE_PATH_PATTERNS = [
  "/recipe",
  "/recipes",
  "/dish",
  "/food",
  "/meal",
  "/cook",
  "/eating"
];

function isSocialDomain(hostname: string): boolean {
  const bare = hostname.replace(/^www\./, "").toLowerCase();
  return SOCIAL_DOMAINS.has(bare);
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function parseUrl(raw: string): URL | null {
  try {
    return new URL(normalizeUrl(raw));
  } catch {
    return null;
  }
}

export function classifyInput(
  url?: string,
  text?: string
): IntakeClassification {
  const trimmedUrl = url?.trim();
  const trimmedText = text?.trim();

  if (trimmedUrl) {
    const parsed = parseUrl(trimmedUrl);
    if (parsed) {
      if (isSocialDomain(parsed.hostname)) {
        return "social-url";
      }
      const path = parsed.pathname.toLowerCase();
      if (RECIPE_PATH_PATTERNS.some((p) => path.includes(p))) {
        return "recipe-url";
      }
      return "unknown-url";
    }
  }

  if (trimmedText) {
    return "plain-text";
  }

  return "unknown-url";
}
