import type { MealFeedbackSummary } from "@/src/lib/domain/feedback";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import {
  normalizeIngredientLine,
  parseRecipeIngredientText
} from "@/src/lib/ingredients";

export const familyAdjustmentMarker = "[Family cookbook adjustment]";

export interface CookbookIngredient {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  rawText: string;
}

export interface CookbookStep {
  id: string;
  text: string;
}

export interface FamilyAdjustment {
  id: string;
  text: string;
  source: "family-adjustment" | "existing-note" | "optimized-version";
}

export interface MealCookbook {
  familyAdjustments: FamilyAdjustment[];
  ingredients: CookbookIngredient[];
  instructions: CookbookStep[];
  originalRecipeUrl: string | null;
  originalRecipeLabel: string;
  hasOriginalRecipe: boolean;
}

export function formatCookbookIngredientAmount(
  ingredient: Pick<CookbookIngredient, "quantity" | "unit">
) {
  return [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ").trim();
}

const sectionAliases = new Map([
  ["ingredients", "ingredients"],
  ["ingredient suggestions", "ingredients"],
  ["instructions", "instructions"],
  ["directions", "instructions"],
  ["method", "instructions"],
  ["steps", "instructions"],
  ["original notes", "original"],
  ["analysis framework v2 summary", "analysis"],
  ["evidence-aware v3 summary", "analysis"],
  ["quick verdict", "analysis"],
  ["scorecard", "analysis"],
  ["main concerns", "analysis"],
  ["plate strategy", "analysis"],
  ["cautions", "analysis"]
]);

function getSectionKey(line: string) {
  const normalized = line.replace(/:$/, "").trim().toLowerCase();

  return sectionAliases.get(normalized) ?? null;
}

function extractSectionLines(notes: string | null, wantedSection: string) {
  if (!notes) {
    return [];
  }

  const lines = notes.split(/\r?\n/);
  const collected: string[] = [];
  let active = false;

  for (const line of lines) {
    const key = getSectionKey(line);

    if (key) {
      if (active && key !== wantedSection) {
        break;
      }

      active = key === wantedSection;
      continue;
    }

    if (active && line.trim()) {
      collected.push(line);
    }
  }

  return collected.map(normalizeIngredientLine).filter(Boolean);
}

function parseIngredient(line: string, index: number): CookbookIngredient {
  const parsed = parseRecipeIngredientText(line);

  return {
    id: `ingredient-${index + 1}`,
    name: parsed?.name || line,
    quantity: parsed?.quantity ?? null,
    unit: parsed?.unit ?? null,
    rawText: parsed?.rawText ?? line
  };
}

function parseAdjustmentNote(note: string) {
  const markerIndex = note.indexOf(familyAdjustmentMarker);

  if (markerIndex < 0) {
    return null;
  }

  return note
    .slice(markerIndex + familyAdjustmentMarker.length)
    .replace(/^[:\s-]+/, "")
    .trim();
}

function isUsefulExistingNote(note: string) {
  const normalized = note.toLowerCase();

  if (
    normalized.includes("logged from meal detail") ||
    normalized.startsWith("ate this") ||
    normalized.startsWith("loved it") ||
    normalized.startsWith("would make again") ||
    normalized.startsWith("did not like")
  ) {
    return false;
  }

  return /less|more|extra|double|longer|shorter|instead|prefer|air fryer|oven|salt|spice|cook|rice|vegetable|protein/.test(
    normalized
  );
}

function uniqueAdjustments(adjustments: FamilyAdjustment[]) {
  const seen = new Set<string>();
  const result: FamilyAdjustment[] = [];

  for (const adjustment of adjustments) {
    const key = adjustment.text.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(adjustment);
    }
  }

  return result;
}

function splitDedicatedFieldLines(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|;/)
    .map(normalizeIngredientLine)
    .filter(Boolean);
}

export function buildMealCookbook(
  meal: MealSummary,
  feedbackSummary: MealFeedbackSummary
): MealCookbook {
  // Dedicated Notion properties (written by save-meal when the database has
  // them) are preferred; the Notes-section fallback keeps older meals and
  // schema-minimal databases working.
  const ingredientLines = splitDedicatedFieldLines(meal.ingredientsText);
  const instructionLines = splitDedicatedFieldLines(meal.instructionsText);
  const ingredients = (
    ingredientLines.length > 0
      ? ingredientLines
      : extractSectionLines(meal.notes, "ingredients")
  ).map(parseIngredient);

  if (process.env.TABLEWISE_INGREDIENT_DIAGNOSTICS === "1") {
    console.info("Ingredient pipeline diagnostics: meal detail cookbook", {
      mealId: meal.id,
      mealName: meal.mealName,
      sourceUrl: meal.sourceUrl,
      persistedIngredientPayload: meal.ingredientsText,
      normalized: ingredients.map((ingredient) => ({
        rawText: ingredient.rawText,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      }))
    });
  }

  const instructions = (
    instructionLines.length > 0
      ? instructionLines
      : extractSectionLines(meal.notes, "instructions")
  ).map((text, index) => ({
    id: `step-${index + 1}`,
    text
  }));
  const explicitAdjustments = [
    ...(feedbackSummary.familyAdjustments ?? []),
    ...feedbackSummary.recentNotes
      .map(parseAdjustmentNote)
      .filter((value): value is string => Boolean(value))
  ]
    .map((text, index) => ({
      id: `family-adjustment-${index + 1}`,
      text,
      source: "family-adjustment" as const
    }));
  const existingNoteAdjustments = feedbackSummary.recentNotes
    .filter((note) => !parseAdjustmentNote(note) && isUsefulExistingNote(note))
    .map((text, index) => ({
      id: `existing-note-${index + 1}`,
      text,
      source: "existing-note" as const
    }));
  const optimizedAdjustment = meal.optimizedVersion?.trim()
    ? [
        {
          id: "optimized-version",
          text: meal.optimizedVersion.trim(),
          source: "optimized-version" as const
        }
      ]
    : [];

  return {
    familyAdjustments: uniqueAdjustments([
      ...explicitAdjustments,
      ...existingNoteAdjustments,
      ...optimizedAdjustment
    ]),
    ingredients,
    instructions,
    originalRecipeUrl: meal.sourceUrl ?? meal.url,
    originalRecipeLabel: meal.sourceUrl ? "Open Original Recipe" : "Open saved record",
    hasOriginalRecipe: Boolean(meal.sourceUrl)
  };
}
