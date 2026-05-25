import type {
  RecipeIngredient,
  RecipeSourceClassification,
  RecipeSourceMetadata
} from "@/src/lib/types/recipe";
import type { IntegrationAdapterStatus } from "@/src/lib/integrations/shared";
import { urlParserVersion } from "@/src/lib/types/recipe";

export interface ParsedRecipeDraft {
  name?: string | null;
  source: RecipeSourceMetadata;
  ingredients: RecipeIngredient[];
  instructions?: string[];
  notes?: string;
  extractionConfidence?: "high" | "medium" | "low";
  extractionNotes?: string[];
}

export interface RecipeParserAdapter {
  status(): IntegrationAdapterStatus;
  parseFromUrl(url: string): Promise<ParsedRecipeDraft>;
  parseFromText(text: string): Promise<ParsedRecipeDraft>;
}

export const recipeParserAdapterStatus: IntegrationAdapterStatus = {
  name: "recipe-parser",
  enabled: true,
  reason: "Basic server-side URL parser. Uses recipe JSON-LD when available and readable page text as fallback."
};

const maxHtmlBytes = 2_000_000;
const minParsedTextLength = 80;
const maxAnalysisTextCharacters = 12_000;
const trackingParamPrefixes = ["utm_"];
const trackingParams = [
  "fbclid",
  "gclid",
  "igsh",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mibextid",
  "si",
  "spm",
  "src",
  "srsltid"
];
const shortLinkHosts = new Set([
  "bit.ly",
  "cutt.ly",
  "goo.gl",
  "is.gd",
  "lnkd.in",
  "pin.it",
  "rebrand.ly",
  "t.co",
  "tinyurl.com",
  "trib.al",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "youtu.be"
]);
const socialVideoHosts = [
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be"
];
const videoHosts = ["vimeo.com"];
const recipeSignals = [
  "ingredient",
  "ingredients",
  "recipe",
  "cook",
  "cooking",
  "bake",
  "baking",
  "tbsp",
  "tsp",
  "cup",
  "cups",
  "gram",
  "grams",
  "salt",
  "pepper",
  "oil",
  "garlic",
  "onion",
  "instructions",
  "method",
  "directions",
  "serves",
  "prep",
  "minutes"
];
const htmlEntityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " "
};

export class RecipeParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeParserError";
  }
}

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const bareSharedUrl = parseBareSharedUrl(trimmed);

  if (bareSharedUrl) {
    return bareSharedUrl;
  }

  return trimmed;
}

function parseBareSharedUrl(value: string) {
  if (/\s/.test(value)) {
    return null;
  }

  const withoutLeadingWww = value.replace(/^www\./i, "");
  const host = withoutLeadingWww.split(/[/?#]/)[0]?.toLowerCase();

  if (!host || !host.includes(".") || host.includes("@")) {
    return null;
  }

  const knownBareHost =
    shortLinkHosts.has(host) ||
    socialVideoHosts.some(
      (socialHost) => host === socialHost || host.endsWith(`.${socialHost}`)
    ) ||
    videoHosts.some(
      (videoHost) => host === videoHost || host.endsWith(`.${videoHost}`)
    );

  if (!knownBareHost && !/^www\./i.test(value)) {
    return null;
  }

  return `https://${value}`;
}

export function isProbablyUrl(value: string) {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }

  return parseBareSharedUrl(trimmed) !== null;
}

export function validateRecipeUrl(value: string) {
  let url: URL;
  const normalizedValue = normalizeUrlInput(value);

  try {
    url = new URL(normalizedValue);
  } catch {
    throw new RecipeParserError("Recipe URL must be a valid http or https URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RecipeParserError("Recipe URL must use http or https.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new RecipeParserError("Recipe URL host is not allowed.");
  }

  return stripTrackingParams(url);
}

export function formatParsedRecipeForAnalysis(recipe: ParsedRecipeDraft) {
  const sections = [
    recipe.name ? `Recipe: ${recipe.name}` : null,
    recipe.source.sourceUrl ? `Source URL: ${recipe.source.sourceUrl}` : null,
    recipe.source.sourceName ? `Source: ${recipe.source.sourceName}` : null,
    recipe.source.sourceClassification
      ? `Source type: ${recipe.source.sourceClassification}`
      : null,
    recipe.source.sourceNotes?.length
      ? `Source notes:\n${recipe.source.sourceNotes
          .map((note) => `- ${note}`)
          .join("\n")}`
      : null,
    recipe.ingredients.length
      ? `Ingredients:\n${recipe.ingredients
          .map((ingredient) => `- ${ingredient.rawText}`)
          .join("\n")}`
      : null,
    recipe.instructions?.length
      ? `Instructions:\n${recipe.instructions
          .map((instruction, index) => `${index + 1}. ${instruction}`)
          .join("\n")}`
      : null,
    recipe.notes ? `Additional page text:\n${recipe.notes}` : null
  ];

  return sections.filter(Boolean).join("\n\n");
}

export const basicRecipeParserAdapter: RecipeParserAdapter = {
  status() {
    return recipeParserAdapterStatus;
  },
  async parseFromUrl(urlValue) {
    const url = validateRecipeUrl(urlValue);
    const initialClassification = classifyRecipeUrl(url);
    const { html, finalUrl } = await fetchRecipeHtml(url);
    const sourceUrl = stripTrackingParams(finalUrl);
    const sourceClassification =
      initialClassification === "short-link"
        ? classifyRecipeUrl(sourceUrl, "short-link")
        : classifyRecipeUrl(sourceUrl);
    const parsedFromJsonLd = parseRecipeJsonLd(
      html,
      sourceUrl,
      sourceClassification
    );

    if (parsedFromJsonLd) {
      return parsedFromJsonLd;
    }

    return parseFallbackHtml(html, sourceUrl, sourceClassification);
  },
  async parseFromText(text) {
    const cleaned = normalizeWhitespace(text);

    if (cleaned.length < minParsedTextLength) {
      throw new RecipeParserError("Recipe text was too short to parse.");
    }

    return {
      source: {
        sourceType: "manual",
        sourceClassification: "manual-text",
        parserVersion: "text-parser-basic-v1"
      },
      ingredients: [],
      notes: cleaned
    };
  }
};

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::1"
  ) {
    return true;
  }

  if (/^127\./.test(normalized) || /^10\./.test(normalized)) {
    return true;
  }

  if (/^192\.168\./.test(normalized)) {
    return true;
  }

  if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) {
    return true;
  }

  return false;
}

async function fetchRecipeHtml(url: URL) {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-CA,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; MetabolicMealOS/0.1; +https://metabolic-meal-os.local)"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    throw new RecipeParserError(
      "I could not reach that link. Paste the caption, transcript, ingredient list, or recipe text instead."
    );
  }

  const finalUrl = validateFinalResponseUrl(response.url, url);

  if (!response.ok) {
    throw new RecipeParserError(
      `That link returned ${response.status}. Paste the caption, transcript, ingredient list, or recipe text instead.`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    throw new RecipeParserError(
      "That link did not return a readable web page. Paste the caption, transcript, ingredient list, or recipe text instead."
    );
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxHtmlBytes) {
    throw new RecipeParserError("That page is too large to import safely.");
  }

  const html = await response.text();

  if (html.length > maxHtmlBytes) {
    throw new RecipeParserError("That page is too large to import safely.");
  }

  return { html, finalUrl };
}

function validateFinalResponseUrl(responseUrl: string, fallbackUrl: URL) {
  let finalUrl = fallbackUrl;

  if (responseUrl) {
    try {
      finalUrl = new URL(responseUrl);
    } catch {
      finalUrl = fallbackUrl;
    }
  }

  if (finalUrl.protocol !== "http:" && finalUrl.protocol !== "https:") {
    throw new RecipeParserError("Recipe URL must use http or https.");
  }

  if (isBlockedHostname(finalUrl.hostname)) {
    throw new RecipeParserError("Recipe URL host is not allowed.");
  }

  return finalUrl;
}

function stripTrackingParams(url: URL) {
  const cleaned = new URL(url.toString());

  for (const key of Array.from(cleaned.searchParams.keys())) {
    const normalizedKey = key.toLowerCase();

    if (
      trackingParams.includes(normalizedKey) ||
      trackingParamPrefixes.some((prefix) => normalizedKey.startsWith(prefix))
    ) {
      cleaned.searchParams.delete(key);
    }
  }

  return cleaned;
}

export function classifyRecipeUrl(
  url: URL,
  previousClassification?: RecipeSourceClassification
): RecipeSourceClassification {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = url.pathname.toLowerCase();

  if (shortLinkHosts.has(host)) {
    return "short-link";
  }

  if (
    host === "tiktok.com" ||
    host.endsWith(".tiktok.com") ||
    host === "instagram.com" ||
    host.endsWith(".instagram.com") ||
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com")
  ) {
    return "social-video";
  }

  if (videoHosts.some((videoHost) => host === videoHost || host.endsWith(`.${videoHost}`))) {
    return "video-page";
  }

  if (
    previousClassification === "short-link" &&
    (pathname.includes("/reel/") ||
      pathname.includes("/shorts/") ||
      pathname.includes("/video/"))
  ) {
    return "social-video";
  }

  if (
    pathname.includes("recipe") ||
    pathname.includes("recipes") ||
    pathname.includes("cookbook")
  ) {
    return "recipe-page";
  }

  return previousClassification === "short-link" ? "short-link" : "unknown-url";
}

function parseRecipeJsonLd(
  html: string,
  url: URL,
  sourceClassification: RecipeSourceClassification
): ParsedRecipeDraft | null {
  const scriptPattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    const rawJson = decodeHtmlEntities(match[1]).trim();
    const parsed = safeParseJson(rawJson);
    const recipeNode = findRecipeNode(parsed);

    if (!recipeNode) {
      continue;
    }

    const ingredients = readStringArray(recipeNode.recipeIngredient).map(
      (rawText) => ({ rawText })
    );
    const instructions = readInstructions(recipeNode.recipeInstructions);
    const name = readString(recipeNode.name) ?? readTitle(html);

    if (ingredients.length === 0 && instructions.length === 0) {
      continue;
    }

    return {
      name,
      source: buildUrlSource(url, {
        sourceName: readSiteName(html) ?? name,
        sourceClassification: "recipe-page",
        sourceNotes: buildExtractionNotes("high", sourceClassification)
      }),
      ingredients,
      instructions,
      notes: readString(recipeNode.description) ?? undefined,
      extractionConfidence: "high",
      extractionNotes: buildExtractionNotes("high", sourceClassification)
    };
  }

  return null;
}

function parseFallbackHtml(
  html: string,
  url: URL,
  sourceClassification: RecipeSourceClassification
): ParsedRecipeDraft {
  const title = readTitle(html);
  const siteName = readSiteName(html) ?? domainName(url);
  const description = readMetaContent(html, "description");
  const ogTitle = readMetaContent(html, "og:title");
  const ogDescription = readMetaContent(html, "og:description");
  const text = htmlToReadableText(html);
  const usefulSections = extractUsefulRecipeSections(text);
  const metadataText = [ogTitle, title, ogDescription, description]
    .filter(Boolean)
    .join("\n");
  const sourceNotes = buildFallbackSourceNotes(
    sourceClassification,
    metadataText,
    usefulSections,
    text
  );

  if (
    sourceClassification === "social-video" ||
    sourceClassification === "video-page"
  ) {
    const socialMetadataOnly = [ogTitle ?? title, ogDescription ?? description]
      .filter(Boolean)
      .join("\n");

    if (!hasEnoughRecipeSignal(socialMetadataOnly)) {
      throw new RecipeParserError(
        "I could not read enough recipe detail from this link. Paste the caption, transcript, ingredient list, or spoken recipe summary below and I can analyze it."
      );
    }

    const socialText = buildSocialMetadataText({
      title: ogTitle ?? title,
      description: ogDescription ?? description,
      siteName,
      url
    });

    return {
      name: ogTitle ?? title ?? siteName,
      source: buildUrlSource(url, {
        sourceName: siteName,
        sourceClassification,
        sourceNotes
      }),
      ingredients: [],
      notes: socialText.slice(0, 4_000),
      extractionConfidence: "low",
      extractionNotes: sourceNotes
    };
  }

  const fallbackText = [
    metadataText ? `Page metadata:\n${metadataText}` : null,
    usefulSections || null,
    text ? `Page excerpt:\n${text.slice(0, 8_000)}` : null
  ]
    .filter(Boolean)
    .join("\n\n");

  if (fallbackText.length < minParsedTextLength) {
    throw new RecipeParserError(
      "I could not read enough recipe detail from this link. Paste the caption, transcript, ingredient list, or recipe text below and I can analyze it."
    );
  }

  return {
    name: title,
    source: buildUrlSource(url, {
      sourceName: siteName,
      sourceClassification:
        sourceClassification === "unknown-url" && looksRecipeLike(fallbackText)
          ? "recipe-page"
          : sourceClassification,
      sourceNotes
    }),
    ingredients: [],
    notes: fallbackText.slice(0, maxAnalysisTextCharacters),
    extractionConfidence: usefulSections ? "medium" : "low",
    extractionNotes: sourceNotes
  };
}

function buildUrlSource(
  url: URL,
  options: {
    sourceName?: string | null;
    sourceClassification: RecipeSourceClassification;
    sourceNotes?: string[];
  }
): RecipeSourceMetadata {
  return {
    sourceType: "url",
    sourceUrl: url.toString(),
    sourceName: options.sourceName || domainName(url),
    sourceClassification: options.sourceClassification,
    sourceNotes: options.sourceNotes ?? null,
    importedAt: new Date().toISOString(),
    lastParsedAt: new Date().toISOString(),
    parserVersion: urlParserVersion
  };
}

function domainName(url: URL) {
  return url.hostname.replace(/^www\./, "");
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

function readSiteName(html: string) {
  return (
    readMetaContent(html, "og:site_name") ??
    readMetaContent(html, "application-name") ??
    null
  );
}

function extractUsefulRecipeSections(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+|\s{2,}/)
    .map(normalizeWhitespace)
    .filter(Boolean);
  const usefulSentences = sentences.filter((sentence) =>
    recipeSignals.some((signal) => sentence.toLowerCase().includes(signal))
  );
  const usefulText = usefulSentences.slice(0, 80).join(" ");

  return usefulText.length >= minParsedTextLength
    ? `Likely recipe details:\n${usefulText}`
    : "";
}

function buildSocialMetadataText({
  title,
  description,
  siteName,
  url
}: {
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  url: URL;
}) {
  return [
    title ? `Title: ${title}` : null,
    siteName ? `Platform/source: ${siteName}` : `Platform/source: ${domainName(url)}`,
    description ? `Accessible caption/description: ${description}` : null,
    "Source note: This is a social/video link. Only accessible page metadata was available, so confidence is lower. If the caption, transcript, ingredients, or spoken method has more detail, paste it for a better analysis."
  ]
    .filter(Boolean)
    .join("\n");
}

function buildExtractionNotes(
  confidence: "high" | "medium" | "low",
  originalClassification: RecipeSourceClassification
) {
  const notes = [`Extraction confidence: ${confidence}.`];

  if (originalClassification === "short-link") {
    notes.push("The submitted link redirected from a short/shared URL.");
  }

  if (confidence === "high") {
    notes.push("Recipe JSON-LD was found on the page.");
  }

  return notes;
}

function buildFallbackSourceNotes(
  sourceClassification: RecipeSourceClassification,
  metadataText: string,
  usefulSections: string,
  pageText: string
) {
  const notes = buildExtractionNotes(
    usefulSections ? "medium" : "low",
    sourceClassification
  );

  if (metadataText) {
    notes.push("Used accessible title and page metadata.");
  }

  if (usefulSections) {
    notes.push("Used recipe-like text found in the page body.");
  }

  if (
    (sourceClassification === "social-video" ||
      sourceClassification === "video-page") &&
    !usefulSections
  ) {
    notes.push(
      "Social/video platforms may hide captions or transcripts from server-side page fetches."
    );
  }

  if (pageText.length > maxAnalysisTextCharacters) {
    notes.push("Page text was truncated before analysis.");
  }

  return notes;
}

function hasEnoughRecipeSignal(value: string) {
  if (value.length < minParsedTextLength) {
    return false;
  }

  return looksRecipeLike(value);
}

function looksRecipeLike(value: string) {
  const normalized = value.toLowerCase();
  const signalCount = recipeSignals.filter((signal) =>
    normalized.includes(signal)
  ).length;

  return signalCount >= 2;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function findRecipeNode(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const type = value["@type"];

  if (
    type === "Recipe" ||
    (Array.isArray(type) && type.some((item) => item === "Recipe"))
  ) {
    return value;
  }

  if (Array.isArray(value["@graph"])) {
    return findRecipeNode(value["@graph"]);
  }

  return null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = normalizeWhitespace(value);

  return cleaned || null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readString)
    .filter((item): item is string => Boolean(item));
}

function readInstructions(value: unknown): string[] {
  if (typeof value === "string") {
    return [normalizeWhitespace(value)].filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return [item];
      }

      if (!isRecord(item)) {
        return [];
      }

      if (typeof item.text === "string") {
        return [item.text];
      }

      if (typeof item.name === "string") {
        return [item.name];
      }

      if (Array.isArray(item.itemListElement)) {
        return readInstructions(item.itemListElement);
      }

      return [];
    })
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!match) {
    return null;
  }

  return normalizeWhitespace(decodeHtmlEntities(stripTags(match[1])));
}

function htmlToReadableText(html: string) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");

  return normalizeWhitespace(decodeHtmlEntities(stripTags(withoutNoise)));
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const normalized = code.toLowerCase();

    if (normalized.startsWith("#x")) {
      return String.fromCharCode(Number.parseInt(normalized.slice(2), 16));
    }

    if (normalized.startsWith("#")) {
      return String.fromCharCode(Number.parseInt(normalized.slice(1), 10));
    }

    return htmlEntityMap[normalized] ?? entity;
  });
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
