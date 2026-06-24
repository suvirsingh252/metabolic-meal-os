import { desc, eq } from "drizzle-orm";
import { getDbClient, type DbClient } from "@/src/lib/db/client";
import { groceryLists } from "@/src/lib/db/schema";

export interface SaveGroceryListHistoryInput {
  householdId: string;
  createdBy?: string | null;
  mealIds: string[];
  itemCount: number;
  db?: DbClient;
}

export interface GroceryListHistorySummary {
  id: string;
  createdAt: string;
  mealIds: string[];
  itemCount: number;
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

function mapHistoryRecord(record: {
  id: string;
  createdAt: Date;
  mealIds: string[];
  itemCount: unknown;
}): GroceryListHistorySummary {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    mealIds: record.mealIds,
    itemCount: normalizeItemCount(record.itemCount)
  };
}

export async function saveGroceryListHistory(
  input: SaveGroceryListHistoryInput
): Promise<GroceryListHistorySummary> {
  const db = input.db ?? getDbClient();
  const [record] = await db
    .insert(groceryLists)
    .values({
      householdId: input.householdId,
      createdBy: input.createdBy,
      mealIds: input.mealIds,
      itemCount: String(input.itemCount)
    })
    .returning();

  if (!record) {
    throw new Error("Grocery list history insert did not return a record.");
  }

  return mapHistoryRecord(record);
}

export async function queryGroceryListHistory(input: {
  householdId: string;
  limit?: number;
  db?: DbClient;
}): Promise<GroceryListHistorySummary[]> {
  const db = input.db ?? getDbClient();
  const records = await db
    .select()
    .from(groceryLists)
    .where(eq(groceryLists.householdId, input.householdId))
    .orderBy(desc(groceryLists.createdAt))
    .limit(input.limit ?? 20);

  return records.map(mapHistoryRecord);
}
