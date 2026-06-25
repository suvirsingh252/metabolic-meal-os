import { NextResponse } from "next/server";
import { getMealDetail } from "@/src/lib/notion/meal-detail";
import { updateMealImageMetadata } from "@/src/lib/images/meal-image-persistence";
import { storeManualRecipeImage } from "@/src/lib/images/recipe-image-storage";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

const maxUploadBytes = 8_000_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "meal-image-upload",
    rateLimit: 20
  });

  if (guardResponse) {
    return guardResponse;
  }

  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload must include an image file." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Uploaded file must be an image." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > maxUploadBytes) {
      return NextResponse.json(
        { error: "Image must be smaller than 8 MB." },
        { status: 400 }
      );
    }

    const stored = await storeManualRecipeImage(
      new Uint8Array(await file.arrayBuffer()),
      file.type
    );
    const now = new Date().toISOString();
    const detail = await getMealDetail(id);

    if (!detail) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    await updateMealImageMetadata(detail.meal, {
      imageUrl: stored.url,
      imageSource: "manual",
      imageOriginalUrl: detail.meal.imageOriginalUrl ?? null,
      imagePrompt: detail.meal.imagePrompt ?? null,
      imageAttribution: "Manual upload",
      imageStatus: "ready",
      imageLastUpdated: now
    });

    return NextResponse.json({
      imageUrl: stored.url,
      imageSource: "manual",
      imageStatus: "ready",
      imageLastUpdated: now
    });
  } catch (error) {
    console.error("Meal image upload failed", error);

    return NextResponse.json(
      { error: "Unable to update this meal image right now." },
      { status: 500 }
    );
  }
}
