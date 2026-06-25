import { and, eq } from "drizzle-orm";
import { getDbClient, type DbClient } from "@/src/lib/db/client";
import { weeklyDinnerPlans } from "@/src/lib/db/schema";
import type {
  DinnerPlanDay,
  PersistedWeeklyDinnerSelection,
  WeeklyDinnerSelection
} from "@/src/lib/domain/weekly-planning";

export async function queryWeeklyDinnerPlan(input: {
  householdId: string;
  weekStartDate: string;
  db?: DbClient;
}): Promise<PersistedWeeklyDinnerSelection[]> {
  const db = input.db ?? getDbClient();
  const rows = await db
    .select()
    .from(weeklyDinnerPlans)
    .where(
      and(
        eq(weeklyDinnerPlans.householdId, input.householdId),
        eq(weeklyDinnerPlans.weekStartDate, input.weekStartDate)
      )
    );

  return rows.map((row) => ({
    dayOfWeek: row.dayOfWeek as DinnerPlanDay,
    mealId: row.mealId
  }));
}

export async function saveWeeklyDinnerPlan(input: {
  householdId: string;
  weekStartDate: string;
  selections: WeeklyDinnerSelection[];
  db?: DbClient;
}): Promise<PersistedWeeklyDinnerSelection[]> {
  const db = input.db ?? getDbClient();
  const selected = input.selections.filter(
    (selection): selection is { dayOfWeek: DinnerPlanDay; mealId: string } =>
      Boolean(selection.mealId)
  );

  await db
    .delete(weeklyDinnerPlans)
    .where(
      and(
        eq(weeklyDinnerPlans.householdId, input.householdId),
        eq(weeklyDinnerPlans.weekStartDate, input.weekStartDate)
      )
    );

  if (selected.length > 0) {
    await db.insert(weeklyDinnerPlans).values(
      selected.map((selection) => ({
        householdId: input.householdId,
        weekStartDate: input.weekStartDate,
        dayOfWeek: selection.dayOfWeek,
        mealId: selection.mealId
      }))
    );
  }

  return selected;
}
