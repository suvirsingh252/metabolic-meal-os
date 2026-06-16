import { and, desc, eq } from "drizzle-orm";
import { getDbClient, type DbClient } from "@/src/lib/db/client";
import { dinnerFeedback } from "@/src/lib/db/schema";
import type {
  FeedbackChip,
  FeedbackChipEvent
} from "@/src/lib/domain/feedback/chips";

export interface SaveDinnerFeedbackInput {
  householdId: string;
  mealId: string;
  chipType: FeedbackChip;
  createdBy?: string | null;
  createdAt?: Date;
}

export interface QueryDinnerFeedbackInput {
  householdId: string;
  mealId?: string;
}

export async function saveDinnerFeedbackChip(
  input: SaveDinnerFeedbackInput,
  db: DbClient = getDbClient()
) {
  const [saved] = await db
    .insert(dinnerFeedback)
    .values({
      householdId: input.householdId,
      mealId: input.mealId,
      chipType: input.chipType,
      createdBy: input.createdBy ?? null,
      createdAt: input.createdAt
    })
    .returning();

  return saved;
}

export async function queryDinnerFeedbackEvents(
  input: QueryDinnerFeedbackInput,
  db: DbClient = getDbClient()
): Promise<FeedbackChipEvent[]> {
  const where = input.mealId
    ? and(
        eq(dinnerFeedback.householdId, input.householdId),
        eq(dinnerFeedback.mealId, input.mealId)
      )
    : eq(dinnerFeedback.householdId, input.householdId);
  const rows = await db
    .select({
      mealId: dinnerFeedback.mealId,
      chipType: dinnerFeedback.chipType,
      createdAt: dinnerFeedback.createdAt
    })
    .from(dinnerFeedback)
    .where(where)
    .orderBy(desc(dinnerFeedback.createdAt));

  return rows.map((row) => ({
    mealId: row.mealId,
    chipType: row.chipType as FeedbackChip,
    createdAt: row.createdAt.toISOString()
  }));
}
