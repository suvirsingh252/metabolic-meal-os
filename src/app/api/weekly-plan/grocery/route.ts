import { NextResponse } from "next/server";
import {
  queryActiveWeeklyGroceryList,
  saveGeneratedGroceryList
} from "@/src/lib/db/grocery-list-items";
import { queryWeeklyDinnerPlan } from "@/src/lib/db/weekly-dinner-plans";
import { generateGroceryList } from "@/src/lib/domain/grocery";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { getCurrentDinnerPlanWeek } from "@/src/lib/domain/weekly-planning";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "weekly-plan-grocery-write",
    rateLimit: 30
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const { householdId, createdBy } = getConfiguredHouseholdMetadata();
    const week = getCurrentDinnerPlanWeek();
    const [{ meals }, selections, activeList] = await Promise.all([
      queryAllMealSummaries(),
      queryWeeklyDinnerPlan({
        householdId,
        weekStartDate: week.weekStartDate
      }),
      queryActiveWeeklyGroceryList({
        householdId,
        weekStartDate: week.weekStartDate
      })
    ]);
    const mealIds = selections.map((selection) => selection.mealId);

    if (mealIds.length === 0) {
      return NextResponse.json(
        { error: "Plan at least one dinner before generating groceries." },
        { status: 400 }
      );
    }

    const generated = generateGroceryList({ meals, mealIds });
    const list = await saveGeneratedGroceryList({
      householdId,
      createdBy,
      generated,
      sourceType: "weekly_plan",
      weekStartDate: week.weekStartDate,
      reuseListId: activeList?.id ?? null
    });

    return NextResponse.json({ list });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate weekly grocery list.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
