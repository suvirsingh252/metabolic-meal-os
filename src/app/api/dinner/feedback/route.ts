import { NextResponse } from "next/server";
import { submitDinnerFeedback } from "@/src/lib/server/dinner-feedback";
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

  try {
    const result = await submitDinnerFeedback(body);

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Dinner feedback API failure", error);

    return NextResponse.json(
      { error: "Unable to save dinner feedback right now." },
      { status: 500 }
    );
  }
}
