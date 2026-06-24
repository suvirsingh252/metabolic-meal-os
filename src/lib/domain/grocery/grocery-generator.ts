import { emptyMealFeedbackSummary } from "@/src/lib/domain/feedback";
import { buildMealCookbook } from "@/src/lib/domain/meals/cookbook";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import {
  groceryCategories,
  resolveGroceryCategory,
  type GroceryCategory
} from "@/src/lib/domain/grocery/grocery-categories";
import { normalizeGroceryIngredient } from "@/src/lib/domain/grocery/ingredient-normalizer";

export interface GroceryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  sourceMealIds: string[];
  sourceMealNames: string[];
  rawIngredients: string[];
}

export interface GroceryCategorySection {
  category: GroceryCategory;
  items: GroceryItem[];
}

export interface GroceryList {
  id: string | null;
  createdAt: string;
  mealIds: string[];
  itemCount: number;
  sections: GroceryCategorySection[];
  skippedMeals: string[];
}

export interface GroceryGenerationInput {
  meals: MealSummary[];
  mealIds: string[];
  createdAt?: string;
  id?: string | null;
}

function normalizeMealId(value: string) {
  return decodeURIComponent(value).trim().toLowerCase().replace(/-/g, "");
}

function stableItemId(category: GroceryCategory, key: string) {
  return `${category.toLowerCase()}-${key.replace(/[^a-z0-9]+/g, "-")}`;
}

function selectedMeals(meals: MealSummary[], mealIds: string[]) {
  const mealByNormalizedId = new Map(
    meals.map((meal) => [normalizeMealId(meal.id), meal])
  );

  return mealIds.map((mealId) => ({
    requestedId: mealId,
    meal: mealByNormalizedId.get(normalizeMealId(mealId)) ?? null
  }));
}

export function generateGroceryList(input: GroceryGenerationInput): GroceryList {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const itemByKey = new Map<string, GroceryItem>();
  const skippedMeals: string[] = [];
  const normalizedMealIds: string[] = [];

  for (const selection of selectedMeals(input.meals, input.mealIds)) {
    if (!selection.meal) {
      skippedMeals.push(selection.requestedId);
      continue;
    }

    const { meal } = selection;
    normalizedMealIds.push(meal.id);
    const cookbook = buildMealCookbook(meal, emptyMealFeedbackSummary(meal.id));

    if (cookbook.ingredients.length === 0) {
      skippedMeals.push(meal.id);
      continue;
    }

    for (const ingredient of cookbook.ingredients) {
      const normalized = normalizeGroceryIngredient(ingredient.name);

      if (!normalized) {
        continue;
      }

      const category = resolveGroceryCategory(normalized.canonicalName);
      const mapKey = normalized.key;
      const existing = itemByKey.get(mapKey);

      if (existing) {
        if (!existing.sourceMealIds.includes(meal.id)) {
          existing.sourceMealIds.push(meal.id);
          existing.sourceMealNames.push(meal.mealName);
        }

        if (!existing.rawIngredients.includes(ingredient.rawText)) {
          existing.rawIngredients.push(ingredient.rawText);
        }

        continue;
      }

      itemByKey.set(mapKey, {
        id: stableItemId(category, mapKey),
        name: normalized.canonicalName,
        category,
        sourceMealIds: [meal.id],
        sourceMealNames: [meal.mealName],
        rawIngredients: [ingredient.rawText]
      });
    }
  }

  const sections = groceryCategories
    .map((category) => ({
      category,
      items: Array.from(itemByKey.values())
        .filter((item) => item.category === category)
        .sort((first, second) => first.name.localeCompare(second.name))
    }))
    .filter((section) => section.items.length > 0);

  return {
    id: input.id ?? null,
    createdAt,
    mealIds: Array.from(new Set(normalizedMealIds)),
    itemCount: sections.reduce((count, section) => count + section.items.length, 0),
    sections,
    skippedMeals
  };
}

export function validateGroceryMealIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("mealIds must be an array.");
  }

  const mealIds = Array.from(
    new Set(
      value
        .map((mealId) => (typeof mealId === "string" ? mealId.trim() : ""))
        .filter(Boolean)
    )
  );

  if (mealIds.length === 0) {
    throw new Error("Select at least one meal.");
  }

  if (mealIds.length > 50) {
    throw new Error("Grocery lists can include at most 50 meals.");
  }

  return mealIds;
}

export function summarizeGroceryList(list: GroceryList) {
  return {
    id: list.id,
    createdAt: list.createdAt,
    mealIds: list.mealIds,
    itemCount: list.itemCount
  };
}
