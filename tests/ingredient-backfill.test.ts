import assert from "node:assert/strict";
import test from "node:test";
import {
  compareIngredientBackfill,
  renderIngredientBackfillReviewMarkdown,
  type IngredientBackfillComparisonInput
} from "@/src/lib/domain/meals/ingredient-backfill";
import type { CookbookIngredient } from "@/src/lib/domain/meals/cookbook";
import type { RecipeIngredient } from "@/src/lib/types/recipe";

function current(names: string[]): CookbookIngredient[] {
  return names.map((name, index) => ({
    id: `ingredient-${index + 1}`,
    name,
    rawText: name,
    quantity: null,
    unit: null
  }));
}

function reparsed(lines: Array<[string, string, string | null, string | null]>): RecipeIngredient[] {
  return lines.map(([rawText, name, quantity, unit]) => ({
    rawText,
    name,
    quantity,
    unit
  }));
}

function compare(overrides: Partial<IngredientBackfillComparisonInput>) {
  return compareIngredientBackfill({
    mealName: "Chana masala",
    sourceUrl: "https://example.com/chana",
    currentIngredients: current(["chickpeas", "tomatoes", "onion"]),
    reparsedMealName: "Chana masala",
    reparsedSourceUrl: "https://example.com/chana",
    reparsedIngredients: reparsed([
      ["1 can chickpeas", "chickpeas", "1", "can"],
      ["1 cup tomatoes", "tomatoes", "1", "cup"],
      ["1 onion", "onion", "1", null]
    ]),
    ...overrides
  });
}

test("compareIngredientBackfill classifies strong same-count improvements as safe", () => {
  const result = compare({});

  assert.equal(result.classification, "SAFE_AUTO_REPAIR");
  assert.equal(result.beforeAsNeededCount, 3);
  assert.equal(result.afterAsNeededCount, 0);
  assert.equal(result.currentNameCoverage, 1);
  assert.equal(result.ingredientCountDelta, 0);
});

test("compareIngredientBackfill sends large count changes to manual review", () => {
  const result = compare({
    mealName: "Chettinad Chicken Curry",
    currentIngredients: current([
      "cashew nuts",
      "Chicken legs",
      "curry leaves",
      "Dry kashmiri red chilies",
      "fresh coconut",
      "shallots"
    ]),
    reparsedMealName: "Chettinad Chicken Curry",
    reparsedIngredients: reparsed([
      ["1 tbsp Black peppercorns", "Black peppercorns", "1", "tbsp"],
      ["4-5 no. Cashew Nuts", "Cashew Nuts", "4-5", "no."],
      ["¾ cup fresh Coconut", "fresh Coconut", "¾", "cup"],
      ["1 kg Chicken legs", "Chicken legs", "1", "kg"],
      ["2-3 sprig Curry leaves", "Curry leaves", "2-3", "sprig"],
      ["½ cup Shallots", "Shallots", "½", "cup"],
      ["1 cup Hot water", "Hot water", "1", "cup"],
      ["2 medium Tomatoes", "Tomatoes", "2", "medium"],
      ["1 tsp Fennel seeds", "Fennel seeds", "1", "tsp"],
      ["1-2 tbsp Oil", "Oil", "1-2", "tbsp"]
    ])
  });

  assert.equal(result.classification, "NEEDS_MANUAL_REVIEW");
  assert.match(result.reason, /ingredient count changed from 6 to 10/);
  assert.equal(result.currentNameCoverage >= 0.6, true);
});

test("compareIngredientBackfill reports no source URL before parsing", () => {
  const result = compare({
    sourceUrl: null,
    reparsedIngredients: undefined
  });

  assert.equal(result.classification, "NO_SOURCE_URL");
});

test("compareIngredientBackfill reports parser failures", () => {
  const result = compare({
    reparsedIngredients: undefined,
    parseError: "HTTP 403"
  });

  assert.equal(result.classification, "PARSE_FAILED");
  assert.equal(result.reason, "HTTP 403");
});

test("compareIngredientBackfill reports no improvement when quantities do not improve", () => {
  const result = compare({
    reparsedIngredients: reparsed([
      ["chickpeas", "chickpeas", null, null],
      ["tomatoes", "tomatoes", null, null],
      ["onion", "onion", null, null]
    ])
  });

  assert.equal(result.classification, "NO_IMPROVEMENT");
});

test("compareIngredientBackfill sends title mismatches to manual review", () => {
  const result = compare({
    reparsedMealName: "Chocolate cake"
  });

  assert.equal(result.classification, "NEEDS_MANUAL_REVIEW");
  assert.match(result.reason, /title/);
});

test("compareIngredientBackfill permits order differences but reports them", () => {
  const result = compare({
    reparsedIngredients: reparsed([
      ["1 onion", "onion", "1", null],
      ["1 can chickpeas", "chickpeas", "1", "can"],
      ["1 cup tomatoes", "tomatoes", "1", "cup"]
    ])
  });

  assert.equal(result.classification, "SAFE_AUTO_REPAIR");
  assert.equal(result.orderDiffers, true);
  assert.match(result.reason, /order differs/);
});

test("renderIngredientBackfillReviewMarkdown includes approval checklist and exact payload", () => {
  const comparison = compare({
    mealName: "Chettinad Chicken Curry",
    currentIngredients: current(["cashew nuts", "fresh coconut", "Chicken legs"]),
    reparsedMealName: "Chettinad Chicken Curry",
    reparsedIngredients: reparsed([
      ["4-5 no. Cashew Nuts, काजू", "Cashew Nuts", "4-5", "no."],
      ["¾ cup fresh Coconut, scraped", "fresh Coconut, scraped", "¾", "cup"],
      ["1 kg Chicken legs", "Chicken legs", "1", "kg"],
      ["Salt to taste", "Salt", "to taste", null],
      ["1 tsp Fennel seeds", "Fennel seeds", "1", "tsp"],
      ["1 cup Hot water", "Hot water", "1", "cup"]
    ])
  });
  const markdown = renderIngredientBackfillReviewMarkdown(
    [
      {
        meal: {
          id: "meal-1",
          mealName: "Chettinad Chicken Curry",
          sourceUrl: "https://example.com/chicken"
        },
        comparison
      }
    ],
    { generatedAt: "2026-06-24T12:00:00.000Z" }
  );

  assert.match(markdown, /# Ingredient Backfill Manual Review/);
  assert.match(markdown, /REVIEW ONLY: this artifact does not mutate Notion or Postgres/);
  assert.match(markdown, /Included classifications: `NEEDS_MANUAL_REVIEW` only/);
  assert.match(markdown, /- \[ \] Approve this exact replacement payload/);
  assert.match(markdown, /- \[ \] Needs edits before replacement/);
  assert.match(markdown, /- \[ \] Reject replacement/);
  assert.match(markdown, /Current Saved Ingredient Rows/);
  assert.match(markdown, /Newly Reparsed Ingredient Rows/);
  assert.match(markdown, /As needed \| cashew nuts/);
  assert.match(markdown, /4-5 no\. \| Cashew Nuts/);
  assert.match(markdown, /"mealId": "meal-1"/);
  assert.match(markdown, /"rawText": "4-5 no. Cashew Nuts, काजू"/);
  assert.match(markdown, /"quantity": "¾"/);
});

test("renderIngredientBackfillReviewMarkdown handles an empty review set", () => {
  const markdown = renderIngredientBackfillReviewMarkdown([], {
    generatedAt: "2026-06-24T12:00:00.000Z"
  });

  assert.match(markdown, /Meals included: 0/);
  assert.match(markdown, /No manual review candidates were found/);
});
