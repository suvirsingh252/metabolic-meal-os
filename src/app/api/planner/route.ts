import { NextResponse } from "next/server";
import { validatePlannerMutation } from "@/src/lib/domain/planner";
import {
  getWeeklyDinnerPlanner,
  writePlannerMutation
} from "@/src/lib/notion/meal-plan";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "planner-read",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const planner = await getWeeklyDinnerPlanner();

    return NextResponse.json(planner);
  } catch (error) {
    console.error("Planner query failure", error);

    return NextResponse.json(
      {
        error: "Unable to load the weekly planner right now."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "planner-write",
    rateLimit: 30
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body: unknown = await request.json();
    const input = validatePlannerMutation(body);
    const result = await writePlannerMutation(input);

    return NextResponse.json({
      ok: true,
      id: result.id
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update the weekly planner.";

    return NextResponse.json(
      {
        error: message
      },
      { status: 400 }
    );
  }
}
