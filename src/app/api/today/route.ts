import { NextResponse } from "next/server";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";
import { queryMealFeedbackSummaries } from "@/src/lib/notion/feedback-summary";
import { queryMealSummaries } from "@/src/lib/notion/meals-query";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "today",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const mealResult = await queryMealSummaries({ pageSize: 100 });
    let feedbackByMealId: MealFeedbackSummaryByMealId = {};

    try {
      feedbackByMealId = await queryMealFeedbackSummaries({ pageSize: 100 });
    } catch (error) {
      console.error("Today feedback summary query failure", error);
    }

    return NextResponse.json({
      meals: mealResult.meals,
      feedbackByMealId
    });
  } catch (error) {
    console.error("Today API failure", error);

    return NextResponse.json(
      { error: "Unable to load Today right now." },
      { status: 500 }
    );
  }
}
