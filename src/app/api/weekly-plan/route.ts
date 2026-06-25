import { NextResponse } from "next/server";
import {
  queryActiveWeeklyGroceryList
} from "@/src/lib/db/grocery-list-items";
import {
  queryWeeklyDinnerPlan,
  saveWeeklyDinnerPlan
} from "@/src/lib/db/weekly-dinner-plans";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import {
  buildWeeklyDinnerPlanViewModel,
  getCurrentDinnerPlanWeek,
  validateWeeklyDinnerSelections
} from "@/src/lib/domain/weekly-planning";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

interface WeeklyPlanRequestBody {
  selections?: unknown;
}

async function buildPlanResponse() {
  const { householdId } = getConfiguredHouseholdMetadata();
  const week = getCurrentDinnerPlanWeek();
  const [{ meals }, selections, activeGroceryList] = await Promise.all([
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

  return buildWeeklyDinnerPlanViewModel({
    ...week,
    selections,
    meals,
    activeGroceryList
  });
}

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "weekly-plan-read",
    rateLimit: 90
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    return NextResponse.json(await buildPlanResponse());
  } catch (error) {
    console.error("Weekly plan query failure", error);

    return NextResponse.json(
      { error: "Unable to load the weekly plan right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "weekly-plan-write",
    rateLimit: 40
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = await readJsonWithLimit<WeeklyPlanRequestBody>(request, 20_000);

    if (body instanceof NextResponse) {
      return body;
    }

    const selections = validateWeeklyDinnerSelections(body.selections);
    const { householdId } = getConfiguredHouseholdMetadata();
    const week = getCurrentDinnerPlanWeek();

    await saveWeeklyDinnerPlan({
      householdId,
      weekStartDate: week.weekStartDate,
      selections
    });

    return NextResponse.json(await buildPlanResponse());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save weekly plan.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
