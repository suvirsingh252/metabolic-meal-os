import { NextResponse } from "next/server";
import { queryMealSummaries } from "@/src/lib/notion/meals-query";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

function parseListParams(request: Request) {
  const url = new URL(request.url);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize") ?? 25), 1),
    100
  );

  return {
    pageSize,
    cursor: url.searchParams.get("cursor") ?? undefined,
    search: url.searchParams.get("search")?.trim().toLowerCase() ?? ""
  };
}

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "notion-meals-list",
    rateLimit: 60
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const params = parseListParams(request);
    const result = await queryMealSummaries(params);

    return NextResponse.json({
      meals: result.meals,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error("Notion meals query failure", error);

    return NextResponse.json(
      { error: "Unable to load meals from Notion right now." },
      { status: 500 }
    );
  }
}
