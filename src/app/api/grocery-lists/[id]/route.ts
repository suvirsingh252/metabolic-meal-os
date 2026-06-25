import { NextResponse } from "next/server";
import {
  queryGroceryListDetail,
  updateGroceryListItemCompletion
} from "@/src/lib/db/grocery-list-items";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface GroceryListPatchBody {
  itemId?: unknown;
  completed?: unknown;
}

export async function GET(request: Request, context: RouteContext) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "grocery-list-detail-read",
    rateLimit: 90
  });

  if (guardResponse) {
    return guardResponse;
  }

  const { id } = await context.params;
  const { householdId } = getConfiguredHouseholdMetadata();
  const list = await queryGroceryListDetail({ householdId, groceryListId: id });

  if (!list) {
    return NextResponse.json({ error: "Grocery list not found." }, { status: 404 });
  }

  return NextResponse.json({ list });
}

export async function PATCH(request: Request, context: RouteContext) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "grocery-list-detail-write",
    rateLimit: 120
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = await readJsonWithLimit<GroceryListPatchBody>(request, 5_000);

    if (body instanceof NextResponse) {
      return body;
    }

    if (typeof body.itemId !== "string" || body.itemId.trim().length === 0) {
      throw new Error("itemId is required.");
    }

    if (typeof body.completed !== "boolean") {
      throw new Error("completed must be true or false.");
    }

    const { id } = await context.params;
    const { householdId } = getConfiguredHouseholdMetadata();
    const list = await updateGroceryListItemCompletion({
      householdId,
      groceryListId: id,
      itemId: body.itemId,
      completed: body.completed
    });

    return NextResponse.json({ list });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update grocery list.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
