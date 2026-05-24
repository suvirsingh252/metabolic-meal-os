import type {
  RecipeIngredient,
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

export function isProbablyUrl(value: string) {
  const trimmed = value.trim();

  return /^https?:\/\//i.test(trimmed);
}

export function validateRecipeUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new RecipeParserError("Recipe URL must be a valid http or https URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RecipeParserError("Recipe URL must use http or https.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new RecipeParserError("Recipe URL host is not allowed.");
  }

  return url;
}

export function formatParsedRecipeForAnalysis(recipe: ParsedRecipeDraft) {
  const sections = [
    recipe.name ? `Recipe: ${recipe.name}` : null,
    recipe.source.sourceUrl ? `Source URL: ${recipe.source.sourceUrl}` : null,
    recipe.source.sourceName ? `Source: ${recipe.source.sourceName}` : null,
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
    const html = await fetchRecipeHtml(url);
    const parsedFromJsonLd = parseRecipeJsonLd(html, url);

    if (parsedFromJsonLd) {
      return parsedFromJsonLd;
    }

    return parseFallbackHtml(html, url);
  },
  async parseFromText(text) {
    const cleaned = normalizeWhitespace(text);

    if (cleaned.length < minParsedTextLength) {
      throw new RecipeParserError("Recipe text was too short to parse.");
    }

    return {
      source: {
        sourceType: "manual",
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
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MetabolicMealOS/0.1 recipe-url-parser"
      },
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    throw new RecipeParserError(
      "Recipe page could not be reached. Paste the recipe text instead."
    );
  }

  if (!response.ok) {
    throw new RecipeParserError(
      `Recipe page returned ${response.status}. Paste the recipe text instead.`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    throw new RecipeParserError("Recipe URL did not return an HTML page.");
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxHtmlBytes) {
    throw new RecipeParserError("Recipe page is too large to import safely.");
  }

  const html = await response.text();

  if (html.length > maxHtmlBytes) {
    throw new RecipeParserError("Recipe page is too large to import safely.");
  }

  return html;
}

function parseRecipeJsonLd(html: string, url: URL): ParsedRecipeDraft | null {
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
      source: buildUrlSource(url, name),
      ingredients,
      instructions,
      notes: readString(recipeNode.description) ?? undefined
    };
  }

  return null;
}

function parseFallbackHtml(html: string, url: URL): ParsedRecipeDraft {
  const title = readTitle(html);
  const text = htmlToReadableText(html);

  if (text.length < minParsedTextLength) {
    throw new RecipeParserError(
      "Could not extract enough recipe text from that page. Paste the recipe text instead."
    );
  }

  return {
    name: title,
    source: buildUrlSource(url, title),
    ingredients: [],
    notes: text.slice(0, 12_000)
  };
}

function buildUrlSource(url: URL, sourceName?: string | null): RecipeSourceMetadata {
  return {
    sourceType: "url",
    sourceUrl: url.toString(),
    sourceName: sourceName || url.hostname.replace(/^www\./, ""),
    importedAt: new Date().toISOString(),
    lastParsedAt: new Date().toISOString(),
    parserVersion: urlParserVersion
  };
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
