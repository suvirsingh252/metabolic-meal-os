import {
  formatCookbookIngredientAmount,
  type CookbookIngredient
} from "@/src/lib/domain/meals/cookbook";
import {
  mergeIngredientWithParsedRawText,
  normalizeIngredientKey
} from "@/src/lib/ingredients";
import type { RecipeIngredient } from "@/src/lib/types/recipe";

export const ingredientBackfillClassifications = [
  "SAFE_AUTO_REPAIR",
  "NEEDS_MANUAL_REVIEW",
  "NO_SOURCE_URL",
  "PARSE_FAILED",
  "NO_IMPROVEMENT"
] as const;

export type IngredientBackfillClassification =
  (typeof ingredientBackfillClassifications)[number];

export interface IngredientBackfillRow {
  rawText: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  amount: string;
  key: string;
  wouldShowAsNeeded: boolean;
}

export interface IngredientBackfillComparisonInput {
  mealName: string;
  sourceUrl: string | null;
  currentIngredients: CookbookIngredient[];
  reparsedMealName?: string | null;
  reparsedSourceUrl?: string | null;
  reparsedIngredients?: RecipeIngredient[];
  parseError?: string | null;
}

export interface IngredientBackfillComparison {
  classification: IngredientBackfillClassification;
  reason: string;
  currentRows: IngredientBackfillRow[];
  reparsedRows: IngredientBackfillRow[];
  beforeAsNeededCount: number;
  afterAsNeededCount: number;
  currentQuantifiedCount: number;
  reparsedQuantifiedCount: number;
  nameOverlapRatio: number;
  currentNameCoverage: number;
  ingredientCountDelta: number;
  orderDiffers: boolean;
  titleMismatch: boolean;
  sourceMismatch: boolean;
}

export interface IngredientBackfillReviewMeal {
  id: string;
  mealName: string;
  sourceUrl: string | null;
}

export interface IngredientBackfillReviewItem {
  meal: IngredientBackfillReviewMeal;
  comparison: IngredientBackfillComparison;
}

export interface IngredientBackfillReplacementPayload {
  mealId: string;
  mealName: string;
  sourceUrl: string | null;
  replaceIngredientsWith: Array<{
    rawText: string;
    name: string;
    quantity: string | null;
    unit: string | null;
  }>;
}

function toText(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

function isBareAsNeededRow(row: { rawText: string; name: string; amount: string }) {
  return (
    !row.amount &&
    row.rawText.trim().toLowerCase() === row.name.trim().toLowerCase()
  );
}

function recipeIngredientToRow(ingredient: RecipeIngredient): IngredientBackfillRow {
  const merged = mergeIngredientWithParsedRawText(ingredient);
  const rawText = merged.rawText.trim();
  const name = toText(merged.name) ?? rawText;
  const quantity = toText(merged.quantity);
  const unit = toText(merged.unit);
  const amount = [quantity, unit].filter(Boolean).join(" ").trim();
  const key = normalizeIngredientKey(name);

  return {
    rawText,
    name,
    quantity,
    unit,
    amount,
    key,
    wouldShowAsNeeded: isBareAsNeededRow({ rawText, name, amount })
  };
}

export function cookbookIngredientToBackfillRow(
  ingredient: CookbookIngredient
): IngredientBackfillRow {
  const amount = formatCookbookIngredientAmount(ingredient);
  const key = normalizeIngredientKey(ingredient.name);

  return {
    rawText: ingredient.rawText,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    amount,
    key,
    wouldShowAsNeeded: isBareAsNeededRow({
      rawText: ingredient.rawText,
      name: ingredient.name,
      amount
    })
  };
}

function uniqueKeys(rows: IngredientBackfillRow[]) {
  return Array.from(new Set(rows.map((row) => row.key).filter(Boolean)));
}

function getOverlap(currentRows: IngredientBackfillRow[], reparsedRows: IngredientBackfillRow[]) {
  const currentKeys = uniqueKeys(currentRows);
  const reparsedKeys = uniqueKeys(reparsedRows);
  const reparsedSet = new Set(reparsedKeys);
  const union = new Set([...currentKeys, ...reparsedKeys]);
  const overlap = currentKeys.filter((key) => reparsedSet.has(key));

  return {
    overlapCount: overlap.length,
    nameOverlapRatio: union.size > 0 ? overlap.length / union.size : 0,
    currentNameCoverage: currentKeys.length > 0 ? overlap.length / currentKeys.length : 0
  };
}

function tokenizeTitle(value: string | null | undefined) {
  return new Set(
    normalizeIngredientKey(value ?? "")
      .split(" ")
      .filter((token) => token.length > 2)
  );
}

function hasTitleMismatch(mealName: string, reparsedMealName: string | null | undefined) {
  if (!reparsedMealName) {
    return false;
  }

  const mealTokens = tokenizeTitle(mealName);
  const reparsedTokens = tokenizeTitle(reparsedMealName);

  if (mealTokens.size === 0 || reparsedTokens.size === 0) {
    return false;
  }

  const overlap = Array.from(mealTokens).filter((token) => reparsedTokens.has(token));
  const smallerSize = Math.min(mealTokens.size, reparsedTokens.size);

  return overlap.length / smallerSize < 0.35;
}

function normalizeUrlForCompare(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function hasSourceMismatch(sourceUrl: string | null, reparsedSourceUrl: string | null | undefined) {
  const current = normalizeUrlForCompare(sourceUrl);
  const reparsed = normalizeUrlForCompare(reparsedSourceUrl);

  return Boolean(current && reparsed && current !== reparsed);
}

function hasCloseIngredientCount(currentCount: number, reparsedCount: number) {
  if (currentCount === 0 || reparsedCount === 0) {
    return false;
  }

  const delta = Math.abs(reparsedCount - currentCount);
  const ratio = reparsedCount / currentCount;

  return delta <= 2 || (ratio >= 0.75 && ratio <= 1.5);
}

function getOrderDiffers(currentRows: IngredientBackfillRow[], reparsedRows: IngredientBackfillRow[]) {
  const reparsedIndexByKey = new Map<string, number>();

  reparsedRows.forEach((row, index) => {
    if (row.key && !reparsedIndexByKey.has(row.key)) {
      reparsedIndexByKey.set(row.key, index);
    }
  });

  const matchedIndexes = currentRows
    .map((row) => (row.key ? reparsedIndexByKey.get(row.key) : undefined))
    .filter((index): index is number => typeof index === "number");

  return matchedIndexes.some((index, position) => {
    const previous = matchedIndexes[position - 1];

    return typeof previous === "number" && index < previous;
  });
}

export function compareIngredientBackfill(
  input: IngredientBackfillComparisonInput
): IngredientBackfillComparison {
  const currentRows = input.currentIngredients.map(cookbookIngredientToBackfillRow);
  const reparsedRows = (input.reparsedIngredients ?? []).map(recipeIngredientToRow);
  const beforeAsNeededCount = currentRows.filter((row) => row.wouldShowAsNeeded).length;
  const afterAsNeededCount = reparsedRows.filter((row) => row.wouldShowAsNeeded).length;
  const currentQuantifiedCount = currentRows.filter((row) => row.amount).length;
  const reparsedQuantifiedCount = reparsedRows.filter((row) => row.amount).length;
  const { nameOverlapRatio, currentNameCoverage } = getOverlap(currentRows, reparsedRows);
  const ingredientCountDelta = reparsedRows.length - currentRows.length;
  const orderDiffers = getOrderDiffers(currentRows, reparsedRows);
  const titleMismatch = hasTitleMismatch(input.mealName, input.reparsedMealName);
  const sourceMismatch = hasSourceMismatch(input.sourceUrl, input.reparsedSourceUrl);

  const base = {
    currentRows,
    reparsedRows,
    beforeAsNeededCount,
    afterAsNeededCount,
    currentQuantifiedCount,
    reparsedQuantifiedCount,
    nameOverlapRatio,
    currentNameCoverage,
    ingredientCountDelta,
    orderDiffers,
    titleMismatch,
    sourceMismatch
  };

  if (beforeAsNeededCount === 0) {
    return {
      ...base,
      classification: "NO_IMPROVEMENT",
      reason: "Current meal has no As needed ingredient rows."
    };
  }

  if (!input.sourceUrl) {
    return {
      ...base,
      classification: "NO_SOURCE_URL",
      reason: "Meal has As needed ingredient rows but no sourceUrl to reparse."
    };
  }

  if (input.parseError) {
    return {
      ...base,
      classification: "PARSE_FAILED",
      reason: input.parseError
    };
  }

  if (reparsedRows.length === 0) {
    return {
      ...base,
      classification: "PARSE_FAILED",
      reason: "Parser returned no ingredient rows."
    };
  }

  if (
    reparsedQuantifiedCount <= currentQuantifiedCount ||
    afterAsNeededCount >= beforeAsNeededCount
  ) {
    return {
      ...base,
      classification: "NO_IMPROVEMENT",
      reason: "Reparse did not reduce As needed rows or increase quantified ingredients."
    };
  }

  const reasons: string[] = [];

  if (sourceMismatch) {
    reasons.push("reparsed source URL differs from saved sourceUrl");
  }

  if (titleMismatch) {
    reasons.push("reparsed title does not clearly match saved meal name");
  }

  if (!hasCloseIngredientCount(currentRows.length, reparsedRows.length)) {
    reasons.push(
      `ingredient count changed from ${currentRows.length} to ${reparsedRows.length}`
    );
  }

  if (currentNameCoverage < 0.7 || nameOverlapRatio < 0.5) {
    reasons.push(
      `ingredient name overlap is too low (${Math.round(
        currentNameCoverage * 100
      )}% current coverage, ${Math.round(nameOverlapRatio * 100)}% overall overlap)`
    );
  }

  if (reasons.length > 0) {
    return {
      ...base,
      classification: "NEEDS_MANUAL_REVIEW",
      reason: reasons.join("; ")
    };
  }

  return {
    ...base,
    classification: "SAFE_AUTO_REPAIR",
    reason: orderDiffers
      ? "Reparse improves quantified ingredients with strong name overlap; ingredient order differs."
      : "Reparse improves quantified ingredients with strong name overlap and close ingredient count."
  };
}

function markdownCell(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function displayAmount(row: IngredientBackfillRow) {
  return row.amount || (row.wouldShowAsNeeded ? "As needed" : "");
}

function rowsTable(rows: IngredientBackfillRow[]) {
  if (rows.length === 0) {
    return "_No ingredient rows._";
  }

  return [
    "| # | Amount | Name | Raw text |",
    "|---:|---|---|---|",
    ...rows.map(
      (row, index) =>
        `| ${index + 1} | ${markdownCell(displayAmount(row))} | ${markdownCell(
          row.name
        )} | ${markdownCell(row.rawText)} |`
    )
  ].join("\n");
}

export function buildIngredientReplacementPayload(
  item: IngredientBackfillReviewItem
): IngredientBackfillReplacementPayload {
  return {
    mealId: item.meal.id,
    mealName: item.meal.mealName,
    sourceUrl: item.meal.sourceUrl,
    replaceIngredientsWith: item.comparison.reparsedRows.map((row) => ({
      rawText: row.rawText,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit
    }))
  };
}

export function renderIngredientBackfillReviewMarkdown(
  items: IngredientBackfillReviewItem[],
  options: { generatedAt?: string } = {}
) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const lines = [
    "# Ingredient Backfill Manual Review",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "> REVIEW ONLY: this artifact does not mutate Notion or Postgres. Approving a",
    "> checkbox here is only a human decision record for a future, separately",
    "> reviewed mutation script.",
    "",
    "Included classifications: `NEEDS_MANUAL_REVIEW` only.",
    "",
    `Meals included: ${items.length}`,
    ""
  ];

  if (items.length === 0) {
    lines.push("_No manual review candidates were found._", "");
    return lines.join("\n");
  }

  items.forEach((item, index) => {
    const { meal, comparison } = item;
    const payload = buildIngredientReplacementPayload(item);

    lines.push(
      `## ${index + 1}. ${meal.mealName}`,
      "",
      `- Meal ID: \`${meal.id}\``,
      `- Source URL: ${meal.sourceUrl ?? "(none)"}`,
      `- Classification: \`${comparison.classification}\``,
      `- Reason: ${comparison.reason}`,
      `- As Needed rows: ${comparison.beforeAsNeededCount} -> ${comparison.afterAsNeededCount}`,
      `- Quantified rows: ${comparison.currentQuantifiedCount} -> ${comparison.reparsedQuantifiedCount}`,
      `- Ingredient count delta: ${comparison.ingredientCountDelta}`,
      `- Name overlap: ${Math.round(
        comparison.currentNameCoverage * 100
      )}% current coverage, ${Math.round(comparison.nameOverlapRatio * 100)}% overall`,
      `- Order differs: ${comparison.orderDiffers ? "yes" : "no"}`,
      "",
      "### Approval",
      "",
      "- [ ] Approve this exact replacement payload",
      "- [ ] Needs edits before replacement",
      "- [ ] Reject replacement",
      "",
      "Reviewer notes:",
      "",
      "> ",
      "",
      "### Current Saved Ingredient Rows",
      "",
      rowsTable(comparison.currentRows),
      "",
      "### Newly Reparsed Ingredient Rows",
      "",
      rowsTable(comparison.reparsedRows),
      "",
      "### Exact Proposed Replacement JSON",
      "",
      "```json",
      JSON.stringify(payload, null, 2),
      "```",
      ""
    );
  });

  return lines.join("\n");
}
