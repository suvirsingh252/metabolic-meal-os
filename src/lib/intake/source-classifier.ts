export const sourceClassifications = [
  "recipe_page",
  "tiktok",
  "instagram",
  "youtube",
  "pinterest",
  "facebook",
  "unknown_social",
  "plain_text"
] as const;

export type SourceClassification = (typeof sourceClassifications)[number];

const SOCIAL_HOSTS: Record<string, SourceClassification> = {
  "tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "vt.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "pinterest.com": "pinterest",
  "pin.it": "pinterest",
  "facebook.com": "facebook",
  "fb.watch": "facebook",
  "threads.net": "unknown_social",
  "x.com": "unknown_social",
  "twitter.com": "unknown_social"
};

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

function bareHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function readSocialHost(hostname: string): SourceClassification | null {
  const host = bareHost(hostname);
  const exact = SOCIAL_HOSTS[host];

  if (exact) {
    return exact;
  }

  const parent = Object.entries(SOCIAL_HOSTS).find(([domain]) =>
    host.endsWith(`.${domain}`)
  );

  return parent?.[1] ?? null;
}

export function classifySourceInput(value: string): SourceClassification {
  const trimmed = value.trim();

  if (!trimmed) {
    return "plain_text";
  }

  const parsed = parseUrl(trimmed);

  if (!parsed) {
    return "plain_text";
  }

  const social = readSocialHost(parsed.hostname);

  if (social) {
    return social;
  }

  // Current callers use this behind URL-ish input checks; any non-social URL
  // is treated as a recipe candidate for downstream parsing/fallback.
  return "recipe_page";
}

export function isSocialSource(source: SourceClassification) {
  return source !== "recipe_page" && source !== "plain_text";
}
