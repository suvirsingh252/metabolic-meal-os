import { NextResponse } from "next/server";
import { queryDinnerFeedbackEventsByNotionId } from "@/src/lib/db/dinner-feedback";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import type { FeedbackChipEvent } from "@/src/lib/domain/feedback";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import {
  buildDinnerConciergeViewModel,
  parseRefinementParams
} from "@/src/lib/server/dinner-concierge";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "dinner",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const refinements = parseRefinementParams(searchParams);
    const mealResult = await queryAllMealSummaries();

    // Chip feedback lives in Postgres and is keyed through the meals mirror.
    // If the mirror/DB is unavailable, fall back to no feedback rather than
    // failing the whole recommendation request.
    let feedbackEvents: FeedbackChipEvent[] = [];
    try {
      const { householdId } = getConfiguredHouseholdMetadata();
      feedbackEvents = await queryDinnerFeedbackEventsByNotionId({ householdId });
    } catch (error) {
      console.error("Dinner concierge feedback query failure", error);
    }

    const viewModel = buildDinnerConciergeViewModel({
      meals: mealResult.meals,
      feedbackEvents,
      refinements
    });

    return NextResponse.json(viewModel);
  } catch (error) {
    console.error("Dinner concierge API failure", error);

    return NextResponse.json(
      { error: "Unable to load tonight's recommendations right now." },
      { status: 500 }
    );
  }
}
