import { NextResponse } from "next/server";
import {
  resolveMirrorMealId,
  saveDinnerFeedbackChip
} from "@/src/lib/db/dinner-feedback";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import { validateDinnerFeedbackRequest } from "@/src/lib/server/dinner-concierge";
import {
  guardApiRequest,
  readJsonWithLimit
} from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "dinner-feedback",
    rateLimit: 30
  });

  if (guardResponse) {
    return guardResponse;
  }

  const body = await readJsonWithLimit(request, 20_000);

  if (body instanceof NextResponse) {
    return body;
  }

  const validation = validateDinnerFeedbackRequest(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const { mealId, chips, createdBy } = validation.value;

  try {
    const { householdId, createdBy: defaultCreatedBy } =
      getConfiguredHouseholdMetadata();

    // Resolve the Notion meal id to its Postgres mirror uuid. A missing mirror
    // row means the meal has not been synced into Postgres yet (see the meals
    // mirror backfill follow-up), so we surface a clear 422 rather than letting
    // the foreign-key insert blow up.
    const mirrorMealId = await resolveMirrorMealId(mealId);

    if (!mirrorMealId) {
      return NextResponse.json(
        {
          error: "meal not in store",
          detail:
            "This meal has not been synced to the meal store yet, so feedback cannot be saved."
        },
        { status: 422 }
      );
    }

    for (const chipType of chips) {
      await saveDinnerFeedbackChip({
        householdId,
        mealId: mirrorMealId,
        chipType,
        createdBy: createdBy ?? defaultCreatedBy
      });
    }

    return NextResponse.json({ success: true, savedCount: chips.length });
  } catch (error) {
    console.error("Dinner feedback API failure", error);

    return NextResponse.json(
      { error: "Unable to save dinner feedback right now." },
      { status: 500 }
    );
  }
}
