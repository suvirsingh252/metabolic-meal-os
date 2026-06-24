/**
 * Usage:
 *   npm run backfill:ingredients:apply -- --meal <meal-id-or-slug> --payload <approved.json>
 *   npm run backfill:ingredients:apply -- --meal <meal-id-or-slug> --payload <approved.json> --write
 *
 * Dry-run is the default. This script mutates exactly one meal only when
 * --write is passed and the typed confirmation phrase matches.
 */
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import {
  applyIngredientBackfill,
  formatIngredientBackfillDiff,
  ingredientBackfillConfirmationPhrase,
  parseApprovedIngredientBackfillPayloadSource,
  type IngredientBackfillApplyDeps
} from "@/src/lib/domain/meals/ingredient-backfill-apply";
import type { IngredientBackfillReplacementPayload } from "@/src/lib/domain/meals/ingredient-backfill";
import { upsertMirrorMealFromSummary } from "@/src/lib/db/dinner-feedback";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";

const richTextBlockLimit = 2000;
const richTextMaxBlocks = 100;

function loadEnvLocal() {
  if (!existsSync(".env.local")) {
    return;
  }

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

function richTextChunks(content: string) {
  const chunks: Array<{ text: { content: string } }> = [];

  for (
    let offset = 0;
    offset < content.length && chunks.length < richTextMaxBlocks;
    offset += richTextBlockLimit
  ) {
    chunks.push({
      text: { content: content.slice(offset, offset + richTextBlockLimit) }
    });
  }

  return {
    rich_text: chunks.length > 0 ? chunks : [{ text: { content: "" } }]
  };
}

function parseArgs(argv: string[]) {
  const args = {
    mealIdentifier: null as string | null,
    payloadPath: null as string | null,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--meal") {
      args.mealIdentifier = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--payload") {
      args.payloadPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--write") {
      args.write = true;
    }
  }

  return args;
}

function readPayload(path: string | null): IngredientBackfillReplacementPayload | null {
  if (!path) {
    return null;
  }

  return parseApprovedIngredientBackfillPayloadSource(readFileSync(path, "utf8"));
}

async function readConfirmation(write: boolean) {
  if (!write) {
    return null;
  }

  const rl = createInterface({ input, output });

  try {
    return await rl.question(
      `Type ${ingredientBackfillConfirmationPhrase} to update this one meal: `
    );
  } finally {
    rl.close();
  }
}

function makeDeps(): IngredientBackfillApplyDeps {
  return {
    async queryMeals() {
      const { meals } = await queryAllMealSummaries();

      return meals;
    },
    async updateNotionIngredients({ meal, ingredients }) {
      const { NOTION_API_KEY } = getNotionMealsEnv();
      const notion = getNotionClient(NOTION_API_KEY);
      const ingredientsText = ingredients
        .map((ingredient) => ingredient.rawText.trim())
        .filter(Boolean)
        .join("\n");

      await notion.pages.update({
        page_id: meal.id,
        properties: {
          Ingredients: richTextChunks(ingredientsText)
        }
      });

      return {
        ...meal,
        ingredientsText
      };
    },
    async refreshPostgresMirror({ meal }) {
      const household = getConfiguredHouseholdMetadata();

      await upsertMirrorMealFromSummary({
        householdId: household.householdId,
        createdBy: household.createdBy,
        meal
      });
    }
  };
}

async function main() {
  loadEnvLocal();

  const args = parseArgs(process.argv.slice(2));
  const payload = readPayload(args.payloadPath);
  const confirmation = await readConfirmation(args.write);
  const result = await applyIngredientBackfill(
    {
      mealIdentifier: args.mealIdentifier,
      payload,
      write: args.write,
      confirmation
    },
    makeDeps()
  );

  console.log(formatIngredientBackfillDiff(result));

  if (result.status === "aborted") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Ingredient backfill apply failed:", error);
  process.exit(1);
});
