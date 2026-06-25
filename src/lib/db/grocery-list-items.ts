import { and, desc, eq } from "drizzle-orm";
import { getDbClient, type DbClient } from "@/src/lib/db/client";
import { groceryListItems, groceryLists } from "@/src/lib/db/schema";
import type { GroceryList } from "@/src/lib/domain/grocery";
import { mergeGroceryChecklistState } from "@/src/lib/domain/grocery/checklist-state";
import type { GroceryCategory } from "@/src/lib/domain/grocery/grocery-categories";

export interface PersistedGroceryItem {
  id: string;
  ingredient: string;
  category: GroceryCategory;
  completed: boolean;
  sortOrder: number;
}

export interface PersistedGroceryListDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  mealIds: string[];
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
  weekStartDate: string | null;
  sourceType: string | null;
  sections: Array<{
    category: GroceryCategory;
    items: PersistedGroceryItem[];
  }>;
}

export interface GroceryListHistorySummaryWithProgress {
  id: string;
  createdAt: string;
  updatedAt: string;
  mealIds: string[];
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
  weekStartDate: string | null;
  sourceType: string | null;
}

function normalizeItemCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function completionPercentage(completedCount: number, itemCount: number) {
  return itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0;
}

function groupItems(items: PersistedGroceryItem[]) {
  const byCategory = new Map<GroceryCategory, PersistedGroceryItem[]>();

  for (const item of items) {
    const current = byCategory.get(item.category) ?? [];
    current.push(item);
    byCategory.set(item.category, current);
  }

  return Array.from(byCategory.entries()).map(([category, categoryItems]) => ({
    category,
    items: categoryItems.sort((first, second) => first.sortOrder - second.sortOrder)
  }));
}

function mapItemRecord(record: {
  id: string;
  ingredient: string;
  category: string;
  completed: boolean;
  sortOrder: number;
}): PersistedGroceryItem {
  return {
    id: record.id,
    ingredient: record.ingredient,
    category: record.category as GroceryCategory,
    completed: record.completed,
    sortOrder: record.sortOrder
  };
}

export async function queryGroceryListDetail(input: {
  householdId: string;
  groceryListId: string;
  db?: DbClient;
}): Promise<PersistedGroceryListDetail | null> {
  const db = input.db ?? getDbClient();
  const [list] = await db
    .select()
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.householdId, input.householdId),
        eq(groceryLists.id, input.groceryListId)
      )
    )
    .limit(1);

  if (!list) {
    return null;
  }

  const items = (
    await db
      .select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, list.id))
  )
    .map(mapItemRecord)
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const itemCount = normalizeItemCount(list.itemCount);
  const completedCount = items.filter((item) => item.completed).length;

  return {
    id: list.id,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    mealIds: list.mealIds,
    itemCount,
    completedCount,
    completionPercentage: completionPercentage(completedCount, itemCount),
    weekStartDate: list.weekStartDate,
    sourceType: list.sourceType,
    sections: groupItems(items)
  };
}

export async function queryGroceryListHistoryWithProgress(input: {
  householdId: string;
  limit?: number;
  db?: DbClient;
}): Promise<GroceryListHistorySummaryWithProgress[]> {
  const db = input.db ?? getDbClient();
  const lists = await db
    .select()
    .from(groceryLists)
    .where(eq(groceryLists.householdId, input.householdId))
    .orderBy(desc(groceryLists.updatedAt))
    .limit(input.limit ?? 20);
  const summaries: GroceryListHistorySummaryWithProgress[] = [];

  for (const list of lists) {
    const items = await db
      .select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, list.id));
    const itemCount = normalizeItemCount(list.itemCount);
    const completedCount = items.filter((item) => item.completed).length;

    summaries.push({
      id: list.id,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      mealIds: list.mealIds,
      itemCount,
      completedCount,
      completionPercentage: completionPercentage(completedCount, itemCount),
      weekStartDate: list.weekStartDate,
      sourceType: list.sourceType
    });
  }

  return summaries;
}

export async function queryActiveWeeklyGroceryList(input: {
  householdId: string;
  weekStartDate: string;
  db?: DbClient;
}) {
  const db = input.db ?? getDbClient();
  const [list] = await db
    .select()
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.householdId, input.householdId),
        eq(groceryLists.weekStartDate, input.weekStartDate),
        eq(groceryLists.sourceType, "weekly_plan")
      )
    )
    .orderBy(desc(groceryLists.updatedAt))
    .limit(1);

  if (!list) {
    return null;
  }

  return queryGroceryListDetail({
    householdId: input.householdId,
    groceryListId: list.id,
    db
  });
}

export async function saveGeneratedGroceryList(input: {
  householdId: string;
  createdBy?: string | null;
  generated: GroceryList;
  sourceType?: "manual" | "weekly_plan";
  weekStartDate?: string | null;
  reuseListId?: string | null;
  db?: DbClient;
}): Promise<PersistedGroceryListDetail> {
  const db = input.db ?? getDbClient();
  const previousItems = input.reuseListId
    ? await db
        .select()
        .from(groceryListItems)
        .where(eq(groceryListItems.groceryListId, input.reuseListId))
    : [];
  const generatedItems = mergeGroceryChecklistState({
    generated: input.generated,
    previousItems
  });
  const now = new Date();
  let groceryListId = input.reuseListId ?? null;

  if (groceryListId) {
    await db
      .update(groceryLists)
      .set({
        mealIds: input.generated.mealIds,
        itemCount: String(input.generated.itemCount),
        sourceType: input.sourceType ?? "manual",
        weekStartDate: input.weekStartDate ?? null,
        updatedAt: now
      })
      .where(
        and(
          eq(groceryLists.householdId, input.householdId),
          eq(groceryLists.id, groceryListId)
        )
      );
    await db
      .delete(groceryListItems)
      .where(eq(groceryListItems.groceryListId, groceryListId));
  } else {
    const [record] = await db
      .insert(groceryLists)
      .values({
        householdId: input.householdId,
        createdBy: input.createdBy,
        sourceType: input.sourceType ?? "manual",
        weekStartDate: input.weekStartDate ?? null,
        mealIds: input.generated.mealIds,
        itemCount: String(input.generated.itemCount)
      })
      .returning();

    if (!record) {
      throw new Error("Grocery list insert did not return a record.");
    }

    groceryListId = record.id;
  }

  if (!groceryListId) {
    throw new Error("Grocery list id was not available after save.");
  }

  if (generatedItems.length > 0) {
    await db.insert(groceryListItems).values(
      generatedItems.map((item) => ({
        groceryListId,
        ingredient: item.ingredient,
        category: item.category,
        sortOrder: item.sortOrder,
        completed: item.completed
      }))
    );
  }

  const detail = await queryGroceryListDetail({
    householdId: input.householdId,
    groceryListId,
    db
  });

  if (!detail) {
    throw new Error("Saved grocery list could not be reloaded.");
  }

  return detail;
}

export async function updateGroceryListItemCompletion(input: {
  householdId: string;
  groceryListId: string;
  itemId: string;
  completed: boolean;
  db?: DbClient;
}) {
  const db = input.db ?? getDbClient();
  const list = await queryGroceryListDetail({
    householdId: input.householdId,
    groceryListId: input.groceryListId,
    db
  });

  if (!list) {
    throw new Error("Grocery list not found.");
  }

  await db
    .update(groceryListItems)
    .set({ completed: input.completed, updatedAt: new Date() })
    .where(
      and(
        eq(groceryListItems.groceryListId, input.groceryListId),
        eq(groceryListItems.id, input.itemId)
      )
    );

  return queryGroceryListDetail({
    householdId: input.householdId,
    groceryListId: input.groceryListId,
    db
  });
}
