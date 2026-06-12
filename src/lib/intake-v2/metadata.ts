import {
  RecipeParserError,
  assertSafeRecipeUrl,
  getSafeRedirectUrl
} from "@/src/lib/integrations/recipe-parser";
import { canonicalizeInstagramUrl } from "@/src/lib/intake-v2/instagram";
import type {
  IntakeEvidence,
  IntakeMetadata
} from "@/src/lib/intake-v2/types";

const maxHtmlBytes = 1_000_000;
const maxRedirects = 5;
const recipeSignals = [
  "ingredient",
  "ingredients",
  "recipe",
  "cook",
  "bake",
  "tsp",
  "tbsp",
  "cup",
  "grams",
  "salt",
  "pepper",
  "method",
  "directions",
  "serves"
];
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export async function fetchStaticSocialMetadata(url: string) {
  let currentUrl = validateInstagramMetadataUrl(new URL(url));
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertSafeRecipeUrl(currentUrl);

    try {
      response = await fetch(currentUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-CA,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (compatible; MetabolicMealOS/0.1; +https://metabolic-meal-os.local)"
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw new RecipeParserError("Social link could not be reached safely.");
    }

    if (!redirectStatuses.has(response.status)) {
      break;
    }

    const location = response.headers.get("location");

    if (!location) {
      break;
    }

    currentUrl = validateInstagramMetadataUrl(
      getSafeRedirectUrl(location, currentUrl)
    );
  }

  if (!response) {
    throw new RecipeParserError("Social link could not be reached safely.");
  }

  if (!response.ok) {
    throw new RecipeParserError(`Social link returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    throw new RecipeParserError("Social link did not return readable HTML.");
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxHtmlBytes) {
    throw new RecipeParserError("Social page was too large to inspect safely.");
  }

  const html = await response.text();

  if (html.length > maxHtmlBytes) {
    throw new RecipeParserError("Social page was too large to inspect safely.");
  }

  return extractSocialMetadataFromHtml(html);
}

function validateInstagramMetadataUrl(url: URL) {
  const canonical = canonicalizeInstagramUrl(url.toString());

  if (!canonical || canonical.canonicalUrl !== url.toString()) {
    throw new RecipeParserError("Instagram metadata URL is not supported.");
  }

  return url;
}

export function extractSocialMetadataFromHtml(html: string): {
  metadata: IntakeMetadata;
  evidence: IntakeEvidence[];
} {
  const title = filterBoilerplateText(readTitle(html));
  const ogTitle = filterBoilerplateText(readMetaContent(html, "og:title"));
  const description = filterBoilerplateText(readMetaContent(html, "description"));
  const ogDescription = filterBoilerplateText(
    readMetaContent(html, "og:description")
  );
  const thumbnailUrl = readMetaContent(html, "og:image");
  const authorHandle = readAuthorHandle(html, [title, ogTitle, description, ogDescription]);
  const visibleText = htmlToReadableText(html);
  const captionText = extractCaptionLikeText(visibleText);
  const metadata: IntakeMetadata = {
    title,
    ogTitle,
    description,
    ogDescription,
    authorHandle,
    thumbnailUrl,
    captionText
  };
  const evidence: IntakeEvidence[] = [];

  for (const [field, value] of Object.entries(metadata)) {
    if (!value || field === "thumbnailUrl") {
      continue;
    }

    evidence.push({
      kind: field === "captionText" ? "instagram_metadata" : "open_graph",
      label:
        field === "captionText"
          ? "Caption-like page text"
          : `Social metadata ${field}`,
      text: value,
      field,
      confidence: field === "captionText" ? "medium" : "low"
    });
  }

  if (thumbnailUrl) {
    evidence.push({
      kind: "open_graph",
      label: "Social metadata thumbnail",
      url: thumbnailUrl,
      field: "thumbnailUrl",
      confidence: "low"
    });
  }

  return { metadata, evidence };
}

export function filterBoilerplateText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return isSocialBoilerplateText(value) ? null : value;
}

export function isSocialBoilerplateText(value: string) {
  const normalized = normalizeWhitespace(value).toLowerCase();

  return (
    normalized === "instagram" ||
    normalized === "login • instagram" ||
    normalized === "log in • instagram" ||
    normalized === "log in to instagram" ||
    normalized === "sign up • instagram" ||
    normalized === "sign up for instagram" ||
    /^log in\b.*\binstagram\b/.test(normalized) ||
    /^sign up\b.*\binstagram\b/.test(normalized) ||
    /\b(log in|login|sign up|signup|accept cookies|allow cookies|consent)\b/.test(
      normalized
    )
  );
}

export function extractCaptionLikeText(text: string) {
  const cleaned = normalizeWhitespace(text);

  if (!cleaned) {
    return null;
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+|\n+/)
    .map(normalizeWhitespace)
    .filter(Boolean);
  const captionCandidates = sentences.filter((sentence) =>
    recipeSignals.some((signal) => sentence.toLowerCase().includes(signal))
  );
  const caption = captionCandidates.slice(0, 20).join(" ");

  return caption.length >= 40 ? caption.slice(0, 4_000) : null;
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match ? normalizeWhitespace(decodeHtmlEntities(stripTags(match[1]))) : null;
}

function readMetaContent(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\s+[^>]*(?:name|property)=["']${escapedName}["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);

  if (!match) {
    return null;
  }

  const contentMatch = match[0].match(/\scontent=(["'])([\s\S]*?)\1/i);

  return contentMatch
    ? normalizeWhitespace(decodeHtmlEntities(contentMatch[2]))
    : null;
}

function readAuthorHandle(html: string, values: Array<string | null | undefined>) {
  const author =
    readMetaContent(html, "author") ?? readMetaContent(html, "instapp:owner_user_id");

  if (author) {
    return author.startsWith("@") ? author : `@${author}`;
  }

  const joined = values.filter(Boolean).join(" ");
  const handle = joined.match(/@([A-Za-z0-9_.]{2,30})/);

  return handle ? `@${handle[1]}` : null;
}

function htmlToReadableText(html: string) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      stripTags(
        html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      )
    )
  );
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
