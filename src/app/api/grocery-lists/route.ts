import { NextResponse } from "next/server";
import {
  generateGroceryList,
  summarizeGroceryList,
  validateGroceryMealIds
} from "@/src/lib/domain/grocery";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import {
  queryGroceryListHistory,
  saveGroceryListHistory
} from "@/src/lib/db/grocery-lists";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

interface GroceryListRequestBody {
  mealIds?: unknown;
}

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "grocery-lists-read",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const { householdId } = getConfiguredHouseholdMetadata();
    const history = await queryGroceryListHistory({ householdId, limit: 20 });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Grocery history query failure", error);

    return NextResponse.json({
      history: [],
      warning: "Grocery list history is not available right now."
    });
  }
}

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "grocery-lists-write",
    rateLimit: 30
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = await readJsonWithLimit<GroceryListRequestBody>(request, 10_000);

    if (body instanceof NextResponse) {
      return body;
    }

    const mealIds = validateGroceryMealIds(body.mealIds);
    const mealResult = await queryAllMealSummaries();
    const generated = generateGroceryList({
      meals: mealResult.meals,
      mealIds
    });
    let list = generated;
    let warning: string | undefined;

    try {
      const { householdId, createdBy } = getConfiguredHouseholdMetadata();
      const history = await saveGroceryListHistory({
        householdId,
        createdBy,
        mealIds: generated.mealIds,
        itemCount: generated.itemCount
      });

      list = {
        ...generated,
        id: history.id,
        createdAt: history.createdAt
      };
    } catch (error) {
      console.error("Grocery history save failure", error);
      warning = "Generated list was not saved to grocery history.";
    }

    return NextResponse.json({
      list,
      history: summarizeGroceryList(list),
      warning
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate grocery list.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
