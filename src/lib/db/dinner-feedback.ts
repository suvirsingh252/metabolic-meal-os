import { and, desc, eq } from "drizzle-orm";
import { getDbClient, type DbClient } from "@/src/lib/db/client";
import { dinnerFeedback, meals } from "@/src/lib/db/schema";
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

/**
 * Resolve a Notion meal page id to its Postgres mirror `meals.id` (uuid).
 * Returns null when the meal has not been mirrored into Postgres yet, which the
 * feedback endpoint surfaces as a 422 "meal not in store" rather than letting
 * the FK insert fail.
 */
export async function resolveMirrorMealId(
  notionPageId: string,
  db: DbClient = getDbClient()
): Promise<string | null> {
  const [row] = await db
    .select({ id: meals.id })
    .from(meals)
    .where(eq(meals.notionPageId, notionPageId))
    .limit(1);

  return row?.id ?? null;
}

/**
 * Load chip feedback for a household joined through the Postgres meals mirror so
 * each event is keyed by the meal's Notion page id. This lets feedback summaries
 * line up with the Notion-backed meals used by the recommendation view model.
 */
export async function queryDinnerFeedbackEventsByNotionId(
  input: { householdId: string },
  db: DbClient = getDbClient()
): Promise<FeedbackChipEvent[]> {
  const rows = await db
    .select({
      notionPageId: meals.notionPageId,
      chipType: dinnerFeedback.chipType,
      createdAt: dinnerFeedback.createdAt
    })
    .from(dinnerFeedback)
    .innerJoin(meals, eq(dinnerFeedback.mealId, meals.id))
    .where(eq(dinnerFeedback.householdId, input.householdId))
    .orderBy(desc(dinnerFeedback.createdAt));

  return rows
    .filter((row): row is typeof row & { notionPageId: string } =>
      Boolean(row.notionPageId)
    )
    .map((row) => ({
      mealId: row.notionPageId,
      chipType: row.chipType as FeedbackChip,
      createdAt: row.createdAt.toISOString()
    }));
}
