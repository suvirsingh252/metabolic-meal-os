import { parseRecipeIngredientText } from "@/src/lib/ingredients";

export interface GroceryIngredientNormalization {
  canonicalName: string;
  key: string;
  rawName: string;
}

export interface GroceryIngredientCandidate {
  name: string;
  rawName: string;
}

const aliasByName = new Map<string, string>([
  ["boneless chicken thighs", "chicken thighs"],
  ["boneless skinless chicken thigh", "chicken thighs"],
  ["boneless skinless chicken thighs", "chicken thighs"],
  ["chicken thigh", "chicken thighs"],
  ["chicken thighs", "chicken thighs"],
  ["cuke", "cucumber"],
  ["cukes", "cucumber"],
  ["english cucumber", "cucumber"],
  ["red onions", "red onion"],
  ["yellow onions", "yellow onion"],
  ["white onions", "white onion"],
  ["extra virgin olive oil", "olive oil"],
  ["evoo", "olive oil"],
  ["feta", "feta cheese"],
  ["greek feta", "feta cheese"],
  ["scallions", "green onions"],
  ["green onion", "green onions"],
  ["garbanzo beans", "chickpeas"],
  ["garbanzo bean", "chickpeas"],
  ["fresh garlic", "garlic"],
  ["garlic clove", "garlic"],
  ["garlic cloves", "garlic"],
  ["clove garlic", "garlic"],
  ["cloves garlic", "garlic"],
  ["fresh ginger", "ginger"],
  ["ginger root", "ginger"],
  ["ground beef or lamb", "lean beef or lamb"],
  ["lean ground beef or lamb", "lean beef or lamb"],
  ["corn tortillas", "corn tortilla"],
  ["flour tortillas", "flour tortilla"]
]);

const descriptors = new Set([
  "boneless",
  "skinless",
  "fresh",
  "large",
  "medium",
  "small",
  "chopped",
  "diced",
  "sliced",
  "minced",
  "grated",
  "shredded",
  "crushed",
  "ground",
  "whole",
  "ripe",
  "raw",
  "cooked",
  "optional"
]);

const groceryIngredientPhrases = [
  "buffalo chicken breast",
  "lean beef or lamb",
  "boneless skinless chicken thighs",
  "boneless skinless chicken thigh",
  "chicken thighs",
  "chicken thigh",
  "chicken breast",
  "corn tortilla",
  "flour tortilla",
  "soy sauce",
  "oyster sauce",
  "sesame oil",
  "olive oil",
  "lean beef",
  "ground beef",
  "beef",
  "lamb",
  "broccoli",
  "garlic cloves",
  "garlic clove",
  "garlic",
  "ginger",
  "cornstarch",
  "rice",
  "parsley",
  "onion",
  "allspice",
  "cumin",
  "cinnamon",
  "tahini",
  "lemon",
  "cucumber",
  "tomato",
  "lettuce",
  "cheese",
  "feta cheese",
  "feta"
].sort((first, second) => second.split(" ").length - first.split(" ").length);

const groceryIngredientPhraseTokens = groceryIngredientPhrases.map((phrase) => ({
  phrase,
  tokens: phrase.split(" ")
}));

const leadingQuantityPattern =
  /^(?:about\s+)?(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s+/i;
const unitPattern =
  /^(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|grams?|g|kg|ml|l|oz|lbs?|pounds?|cans?|cloves?|pinch|sprigs?)\s+/i;
const separatorPattern = /(?:\r?\n|[;•]+|(?:\s[-*]\s)|,+)/g;
const shoppingNotePatterns = [
  /\boptional\b/gi,
  /\bas needed\b/gi,
  /\bto taste\b/gi,
  /\bfor garnish\b/gi,
  /\bfor serving\b/gi,
  /\bdivided\b/gi,
  /\broom temperature\b/gi,
  /\bsoftened\b/gi,
  /\bfrom costco\b/gi,
  /\bfrom trader joe(?:'|\u2019)s\b/gi,
  /\bfinely chopped\b/gi,
  /\broughly chopped\b/gi,
  /\bchopped\b/gi,
  /\bdiced\b/gi,
  /\bsliced\b/gi,
  /\bminced\b/gi
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function singularizeForKey(value: string) {
  return value
    .split(" ")
    .map((word) => {
      if (word.length <= 3 || word.endsWith("ss")) {
        return word;
      }

      if (word.endsWith("ies")) {
        return `${word.slice(0, -3)}y`;
      }

      if (word.endsWith("oes")) {
        return word.slice(0, -2);
      }

      if (
        word.endsWith("es") &&
        (word.endsWith("ches") ||
          word.endsWith("shes") ||
          word.endsWith("xes") ||
          word.endsWith("zes") ||
          word.endsWith("ses"))
      ) {
        return word.slice(0, -2);
      }

      if (word.endsWith("s")) {
        return word.slice(0, -1);
      }

      return word;
    })
    .join(" ");
}

function baseIngredientName(value: string) {
  const parsed = parseRecipeIngredientText(value);
  const source = parsed?.name ?? value;

  return cleanShoppingNotes(
    normalizeWhitespace(
      source
        .toLowerCase()
        .replace(/\([^)]*\)/g, " ")
        .split(",")[0] ?? ""
    )
      .replace(/^of\s+/i, "")
      .replace(leadingQuantityPattern, "")
      .replace(unitPattern, "")
      .replace(/[^a-z0-9\s-]/g, " ")
  );
}

function cleanShoppingNotes(value: string) {
  let cleaned = normalizeWhitespace(value);

  for (const pattern of shoppingNotePatterns) {
    cleaned = cleaned.replace(pattern, " ");
  }

  return normalizeWhitespace(
    cleaned
      .replace(/\([^)]*\)/g, " ")
      .replace(/\s+(?:and|with)\s*$/i, " ")
      .replace(/^[,\s-]+|[,\s-]+$/g, " ")
  );
}

function cleanCandidate(value: string) {
  return cleanShoppingNotes(value.toLowerCase().replace(/[^a-z0-9\s,;•*-]/g, " "));
}

function splitByExplicitSeparators(value: string) {
  return value
    .split(separatorPattern)
    .map(cleanCandidate)
    .filter(Boolean);
}

function tokenMatchesAt(
  tokens: string[],
  startIndex: number,
  phraseTokens: string[]
) {
  return phraseTokens.every(
    (token, offset) => tokens[startIndex + offset] === token
  );
}

function scanIngredientBlob(value: string) {
  const tokens = cleanCandidate(value).split(" ").filter(Boolean);
  const matches: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const match = groceryIngredientPhraseTokens.find((candidate) =>
      tokenMatchesAt(tokens, index, candidate.tokens)
    );

    if (match) {
      matches.push(match.phrase);
      index += match.tokens.length;
      continue;
    }

    index += 1;
  }

  return matches;
}

function splitBlobSegment(value: string) {
  const matches = scanIngredientBlob(value);

  if (/\bor\b/i.test(value) && matches.length <= 2) {
    return [cleanCandidate(value)].filter(Boolean);
  }

  return matches.length >= 2 ? matches : [cleanCandidate(value)].filter(Boolean);
}

export function extractGroceryIngredientCandidates(
  value: string
): GroceryIngredientCandidate[] {
  const rawName = normalizeWhitespace(value);
  const explicitParts = splitByExplicitSeparators(rawName);
  const parts = explicitParts.length > 0 ? explicitParts : [cleanCandidate(rawName)];

  return parts.flatMap((part) =>
    splitBlobSegment(part).map((name) => ({
      name,
      rawName
    }))
  );
}

function removeSoftDescriptors(value: string) {
  const words = normalizeWhitespace(value).split(" ");
  const filtered = words.filter((word, index) => {
    if (index > 1) {
      return true;
    }

    return !descriptors.has(word);
  });

  return normalizeWhitespace(filtered.join(" "));
}

function applyAliases(value: string) {
  const direct = aliasByName.get(value);

  if (direct) {
    return direct;
  }

  const withoutDescriptors = removeSoftDescriptors(value);

  return aliasByName.get(withoutDescriptors) ?? withoutDescriptors;
}

export function normalizeGroceryIngredient(
  value: string
): GroceryIngredientNormalization | null {
  const rawName = normalizeWhitespace(value);
  const cleaned = baseIngredientName(rawName);
  const canonicalName = applyAliases(cleaned);
  const key = singularizeForKey(canonicalName);

  if (!canonicalName || !key) {
    return null;
  }

  return {
    canonicalName,
    key,
    rawName
  };
}
