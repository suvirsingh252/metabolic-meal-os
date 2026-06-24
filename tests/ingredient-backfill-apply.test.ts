import assert from "node:assert/strict";
import test from "node:test";
import {
  applyIngredientBackfill,
  ingredientBackfillConfirmationPhrase,
  parseApprovedIngredientBackfillPayloadSource,
  type IngredientBackfillApplyDeps
} from "@/src/lib/domain/meals/ingredient-backfill-apply";
import type { IngredientBackfillReplacementPayload } from "@/src/lib/domain/meals/ingredient-backfill";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

const meal: MealSummary = {
  id: "meal-1",
  url: "https://notion.so/meal-1",
  mealName: "Chettinad Chicken Curry",
  createdAt: "2026-06-01T12:00:00.000Z",
  sourceUrl: "https://example.com/chettinad",
  sourceName: "Example",
  cuisine: "Indian",
  mealType: "Dinner",
  proteinLevel: null,
  satietyLevel: null,
  bloodSugarImpact: null,
  effortLevel: null,
  familyApproved: false,
  weeknightFriendly: false,
  comfortMeal: false,
  optimizedVersion: null,
  notes: null,
  ingredientsText: "cashew nuts\nfresh coconut",
  instructionsText: null,
  calories: null,
  proteinG: null,
  carbohydratesG: null,
  fatG: null,
  fiberG: null,
  sodiumMg: null,
  sugarG: null,
  nutritionConfidence: null,
  nutritionSource: null,
  nutritionProvenance: null,
  qualityScore: null,
  metabolicScore: null,
  proteinScore: null,
  fiberScore: null,
  energyDensityScore: null,
  processingScore: null,
  satietyScoreNumeric: null,
  bloodSugarRiskScore: null
};

function payload(overrides: Partial<IngredientBackfillReplacementPayload> = {}) {
  return {
    approved: true,
    mealId: "meal-1",
    mealName: "Chettinad Chicken Curry",
    sourceUrl: "https://example.com/chettinad",
    expectedCurrentIngredients: [
      {
        rawText: "cashew nuts",
        name: "cashew nuts",
        quantity: null,
        unit: null
      },
      {
        rawText: "fresh coconut",
        name: "fresh coconut",
        quantity: null,
        unit: null
      }
    ],
    replaceIngredientsWith: [
      {
        rawText: "4-5 no. Cashew Nuts, काजू",
        name: "Cashew Nuts",
        quantity: "4-5",
        unit: "no."
      },
      {
        rawText: "¾ cup fresh Coconut, scraped",
        name: "fresh Coconut, scraped",
        quantity: "¾",
        unit: "cup"
      }
    ],
    ...overrides
  } satisfies IngredientBackfillReplacementPayload;
}

function deps(options: {
  meals?: MealSummary[];
  failNotion?: boolean;
  calls?: string[];
} = {}): IngredientBackfillApplyDeps {
  const calls = options.calls ?? [];

  return {
    async queryMeals() {
      calls.push("query");
      return options.meals ?? [meal];
    },
    async updateNotionIngredients({ meal: currentMeal, ingredients }) {
      calls.push("notion");

      if (options.failNotion) {
        throw new Error("notion failed");
      }

      return {
        ...currentMeal,
        ingredientsText: ingredients.map((ingredient) => ingredient.rawText).join("\n")
      };
    },
    async refreshPostgresMirror() {
      calls.push("postgres");
    }
  };
}

test("applyIngredientBackfill dry-run prints diff state and does not mutate", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "meal-1",
      payload: payload()
    },
    deps({ calls })
  );

  assert.equal(result.status, "dry_run");
  assert.equal(result.before.length, 2);
  assert.equal(result.after.length, 2);
  assert.deepEqual(calls, ["query"]);
});

test("applyIngredientBackfill aborts missing approval", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "meal-1",
      payload: payload({ approved: false })
    },
    deps({ calls })
  );

  assert.equal(result.status, "aborted");
  assert.match(result.reason, /not approved/);
  assert.deepEqual(calls, []);
});

test("applyIngredientBackfill aborts partial approved payloads", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "meal-1",
      payload: {
        approved: true,
        mealId: "meal-1",
        mealName: "Chettinad Chicken Curry",
        sourceUrl: "https://example.com/chettinad",
        replaceIngredientsWith: []
      } as unknown as IngredientBackfillReplacementPayload
    },
    deps({ calls })
  );

  assert.equal(result.status, "aborted");
  assert.match(result.reason, /missing expected before or after/);
  assert.deepEqual(calls, []);
});

test("applyIngredientBackfill aborts before payload mismatch", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "meal-1",
      payload: payload({
        expectedCurrentIngredients: [
          {
            rawText: "stale cashew nuts",
            name: "stale cashew nuts",
            quantity: null,
            unit: null
          }
        ]
      })
    },
    deps({ calls })
  );

  assert.equal(result.status, "aborted");
  assert.match(result.reason, /no longer matches/);
  assert.deepEqual(calls, ["query"]);
});

test("applyIngredientBackfill aborts sourceUrl mismatch", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "meal-1",
      payload: payload({ sourceUrl: "https://example.com/other" })
    },
    deps({ calls })
  );

  assert.equal(result.status, "aborted");
  assert.match(result.reason, /sourceUrl/);
  assert.deepEqual(calls, ["query"]);
});

test("applyIngredientBackfill --write with confirmation updates exactly one meal", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "meal-1",
      payload: payload(),
      write: true,
      confirmation: ingredientBackfillConfirmationPhrase
    },
    deps({ calls })
  );

  assert.equal(result.status, "applied");
  assert.equal(result.meal?.ingredientsText, "4-5 no. Cashew Nuts, काजू\n¾ cup fresh Coconut, scraped");
  assert.deepEqual(calls, ["query", "notion", "postgres"]);
});

test("applyIngredientBackfill refreshes Postgres only after Notion success", async () => {
  const calls: string[] = [];

  await assert.rejects(
    () =>
      applyIngredientBackfill(
        {
          mealIdentifier: "meal-1",
          payload: payload(),
          write: true,
          confirmation: ingredientBackfillConfirmationPhrase
        },
        deps({ calls, failNotion: true })
      ),
    /notion failed/
  );

  assert.deepEqual(calls, ["query", "notion"]);
});

test("applyIngredientBackfill aborts more than one meal match", async () => {
  const calls: string[] = [];
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: "chettinad-chicken-curry",
      payload: payload({ mealId: "other", mealName: "chettinad-chicken-curry" })
    },
    deps({
      calls,
      meals: [
        meal,
        {
          ...meal,
          id: "meal-2"
        }
      ]
    })
  );

  assert.equal(result.status, "aborted");
  assert.match(result.reason, /More than one/);
  assert.deepEqual(calls, ["query"]);
});

test("parseApprovedIngredientBackfillPayloadSource reads approved JSON files", () => {
  const parsed = parseApprovedIngredientBackfillPayloadSource(
    JSON.stringify(payload())
  );

  assert.equal(parsed?.approved, true);
  assert.equal(parsed?.mealId, "meal-1");
});

test("parseApprovedIngredientBackfillPayloadSource extracts one checked Markdown section", () => {
  const parsed = parseApprovedIngredientBackfillPayloadSource(`---
## 1. Chettinad Chicken Curry

### Approval

- [x] Approve this exact replacement payload
- [ ] Needs edits before replacement
- [ ] Reject replacement

### Exact Proposed Replacement JSON

\`\`\`json
${JSON.stringify(payload({ approved: false }), null, 2)}
\`\`\`
`);

  assert.equal(parsed?.approved, true);
  assert.equal(parsed?.mealId, "meal-1");
});

test("parseApprovedIngredientBackfillPayloadSource ignores unchecked Markdown sections", () => {
  const parsed = parseApprovedIngredientBackfillPayloadSource(`---
## 1. Chettinad Chicken Curry

### Approval

- [ ] Approve this exact replacement payload

### Exact Proposed Replacement JSON

\`\`\`json
${JSON.stringify(payload(), null, 2)}
\`\`\`
`);

  assert.equal(parsed, null);
});

test("parseApprovedIngredientBackfillPayloadSource rejects multiple checked Markdown sections", () => {
  assert.throws(
    () =>
      parseApprovedIngredientBackfillPayloadSource(`---
## 1. Chettinad Chicken Curry

- [x] Approve this exact replacement payload

\`\`\`json
${JSON.stringify(payload(), null, 2)}
\`\`\`

## 2. Palak Paneer

- [x] Approve this exact replacement payload

\`\`\`json
${JSON.stringify(payload({ mealId: "meal-2" }), null, 2)}
\`\`\`
`),
    /More than one approved/
  );
});
