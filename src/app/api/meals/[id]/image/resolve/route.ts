import { NextResponse } from "next/server";
import {
  resolveMealImageForMeal,
  shouldResolveMealImage
} from "@/src/lib/images/meal-image-resolver";
import { getMealDetail } from "@/src/lib/notion/meal-detail";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "meal-image-resolve",
    rateLimit: 20
  });

  if (guardResponse) {
    return guardResponse;
  }

  const { id } = await params;
  const detail = await getMealDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }

  if (!shouldResolveMealImage(detail.meal)) {
    return NextResponse.json({
      imageUrl: detail.meal.imageUrl ?? null,
      imageSource: detail.meal.imageSource ?? null,
      imageStatus: detail.meal.imageStatus ?? null,
      imageLastUpdated: detail.meal.imageLastUpdated ?? null,
      skipped: true
    });
  }

  const { metadata, strategy } = await resolveMealImageForMeal(detail.meal);

  return NextResponse.json({
    imageUrl: metadata.imageUrl,
    imageSource: metadata.imageSource,
    imageStatus: metadata.imageStatus,
    imageLastUpdated: metadata.imageLastUpdated,
    strategy,
    skipped: false
  });
}
