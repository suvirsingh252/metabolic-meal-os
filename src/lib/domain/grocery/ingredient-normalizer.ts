import { parseRecipeIngredientText } from "@/src/lib/ingredients";

export interface GroceryIngredientNormalization {
  canonicalName: string;
  key: string;
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
  ["garbanzo bean", "chickpeas"]
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

const leadingQuantityPattern =
  /^(?:about\s+)?(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s+/i;
const unitPattern =
  /^(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|grams?|g|kg|ml|l|oz|lbs?|pounds?|cans?|cloves?|pinch|sprigs?)\s+/i;

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

  return normalizeWhitespace(
    source
      .toLowerCase()
      .replace(/\([^)]*\)/g, " ")
      .split(",")[0] ?? ""
  )
    .replace(/^of\s+/i, "")
    .replace(leadingQuantityPattern, "")
    .replace(unitPattern, "")
    .replace(/[^a-z0-9\s-]/g, " ");
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
