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

const leadingListMarkerPattern = /^[-*•\d.)\s]+/;
const whitespacePattern = /\s+/g;

function cleanIngredientName(value: string) {
  return value
    .trim()
    .replace(leadingListMarkerPattern, "")
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
