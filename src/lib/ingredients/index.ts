import type { RecipeIngredient } from "@/src/lib/types/recipe";

export interface NormalizedIngredient {
  name: string;
  key: string;
  rawText?: string;
}

export interface NormalizedIngredientList {
  ingredients: NormalizedIngredient[];
  duplicateCount: number;
  malformedCount: number;
}

export interface ParsedRecipeIngredientText {
  rawText: string;
  name: string;
  quantity: string | null;
  unit: string | null;
}

const leadingListMarkerPattern = /^[-*•\d.)\s]+/;
const whitespacePattern = /\s+/g;
const unicodeFractionToken = "[¼½¾⅓⅔⅛⅜⅝⅞]";
const quantityToken =
  `(?:\\d+\\s+(?:\\d+\\/\\d+|${unicodeFractionToken})|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|\\.\\d+|${unicodeFractionToken})`;
const quantityPattern = new RegExp(
  `^(${quantityToken}(?:\\s*(?:-|–|—|to)\\s*${quantityToken})?)\\s*([^\\s]+)\\s+(.+)$`,
  "i"
);
const devanagariPattern = /[\u0900-\u097F]/;
const units = new Set([
  "cup",
  "cups",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "lbs",
  "can",
  "cans",
  "clove",
  "cloves",
  "pinch",
  "inch",
  "inches",
  "no",
  "no.",
  "number",
  "numbers",
  "sprig",
  "sprigs",
  "medium",
  "small",
  "large"
]);

function cleanIngredientName(value: string) {
  return value
    .trim()
    .replace(leadingListMarkerPattern, "")
    .replace(whitespacePattern, " ")
    .trim();
}

function cleanDisplayIngredientName(value: string) {
  const withoutInlineTranslation = value.replace(/[\u0900-\u097F].*$/g, "");

  return withoutInlineTranslation
    .split(",")
    .filter((part) => !devanagariPattern.test(part))
    .join(",")
    .replace(/^of\s+/i, "")
    .replace(whitespacePattern, " ")
    .trim()
    .replace(/\s+,/g, ",")
    .replace(/,+$/g, "")
    .trim();
}

export function parseRecipeIngredientText(
  value: string
): ParsedRecipeIngredientText | null {
  const line = normalizeIngredientLine(value);

  if (!line) {
    return null;
  }

  const toTasteMatch = line.match(/^(.+?)\s+to taste(?:\s*,\s*.*)?$/i);

  if (toTasteMatch) {
    return {
      rawText: line,
      name: cleanDisplayIngredientName(toTasteMatch[1]) || line,
      quantity: "to taste",
      unit: null
    };
  }

  const match = line.match(quantityPattern);

  if (!match) {
    return {
      rawText: line,
      name: cleanDisplayIngredientName(line) || line,
      quantity: null,
      unit: null
    };
  }

  const possibleUnit = match[2].toLowerCase();
  const hasUnit = units.has(possibleUnit);
  const quantity = match[1].trim();
  const unit = hasUnit ? match[2] : null;
  const nameSource = hasUnit ? match[3] : `${match[2]} ${match[3]}`;
  const name = cleanDisplayIngredientName(nameSource) || line;

  return {
    rawText: line,
    name,
    quantity,
    unit
  };
}

export function mergeIngredientWithParsedRawText(
  ingredient: RecipeIngredient
): RecipeIngredient {
  const parsed = parseRecipeIngredientText(ingredient.rawText);

  if (!parsed) {
    return ingredient;
  }

  return {
    ...ingredient,
    rawText: parsed.rawText,
    name: ingredient.name ?? parsed.name,
    quantity: ingredient.quantity ?? parsed.quantity,
    unit: ingredient.unit ?? parsed.unit
  };
}

export function normalizeIngredientLine(value: string) {
  return value
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(whitespacePattern, " ")
    .trim();
}

export function normalizeIngredientKey(value: string) {
  const cleaned = cleanIngredientName(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(whitespacePattern, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .map(normalizeIngredientWord)
    .join(" ");
}

function normalizeIngredientWord(word: string) {
  if (word.length <= 3) {
    return word;
  }

  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith("oes") && word.length > 4) {
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

  if (word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }

  return word;
}

function isRecipeIngredient(value: unknown): value is RecipeIngredient {
  return (
    typeof value === "object" &&
    value !== null &&
    "rawText" in value &&
    typeof value.rawText === "string"
  );
}

export function normalizeIngredient(value: unknown): NormalizedIngredient | null {
  if (isRecipeIngredient(value)) {
    const name = cleanIngredientName(value.name || value.rawText);
    const key = normalizeIngredientKey(name);

    if (!name || !key) {
      return null;
    }

    return {
      name,
      key,
      rawText: value.rawText
    };
  }

  if (typeof value !== "string") {
    return null;
  }

  const name = cleanIngredientName(value);
  const key = normalizeIngredientKey(name);

  if (!name || !key) {
    return null;
  }

  return {
    name,
    key
  };
}

export function normalizeIngredientList(
  values: unknown[]
): NormalizedIngredient[] {
  return normalizeIngredientListWithStats(values).ingredients;
}

export function normalizeIngredientListWithStats(
  values: unknown[]
): NormalizedIngredientList {
  const seen = new Set<string>();
  const ingredients: NormalizedIngredient[] = [];
  let duplicateCount = 0;
  let malformedCount = 0;

  for (const value of values) {
    const ingredient = normalizeIngredient(value);

    if (!ingredient) {
      malformedCount += 1;
      continue;
    }

    if (seen.has(ingredient.key)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(ingredient.key);
    ingredients.push(ingredient);
  }

  return {
    ingredients,
    duplicateCount,
    malformedCount
  };
}
