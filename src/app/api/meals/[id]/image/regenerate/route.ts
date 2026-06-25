import { NextResponse } from "next/server";
import { buildAiRecipeImageMetadata } from "@/src/lib/images/recipe-image-pipeline";
import { updateMealImageMetadata } from "@/src/lib/images/meal-image-persistence";
import { getMealDetail } from "@/src/lib/notion/meal-detail";
import { guardApiRequest, readJsonWithLimit } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

function parseAllowManual(body: unknown) {
  return (
    typeof body === "object" &&
    body !== null &&
    "allowManual" in body &&
    body.allowManual === true
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "meal-image-regenerate",
    rateLimit: 10
  });

  if (guardResponse) {
    return guardResponse;
  }

  const { id } = await params;
  const body = await readJsonWithLimit(request, 10_000);

  if (body instanceof NextResponse) {
    return body;
  }

  const allowManual = parseAllowManual(body);
  const detail = await getMealDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }

  if (detail.meal.imageSource === "manual" && !allowManual) {
    return NextResponse.json(
      {
        error:
          "This meal has a manual image. Pass allowManual=true to replace it."
      },
      { status: 409 }
    );
  }

  const metadata = await buildAiRecipeImageMetadata({
    title: detail.meal.mealName,
    cuisine: detail.meal.cuisine,
    ingredients: detail.cookbook.ingredients.map((ingredient) => ({
      rawText: ingredient.rawText,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    })),
    instructions: detail.cookbook.instructions.map((step) => step.text),
    dietaryTags: [
      detail.meal.mealType ?? "",
      detail.meal.proteinLevel ? `${detail.meal.proteinLevel} protein` : "",
      detail.meal.weeknightFriendly ? "weeknight friendly" : "",
      detail.meal.comfortMeal ? "comfort meal" : ""
    ].filter(Boolean),
    platingContext: detail.meal.optimizedVersion ?? detail.meal.notes
  });
  const updatedMeal = await updateMealImageMetadata(detail.meal, metadata);

  return NextResponse.json({
    imageUrl: updatedMeal.imageUrl ?? null,
    imageSource: updatedMeal.imageSource ?? null,
    imageStatus: updatedMeal.imageStatus ?? null,
    imageLastUpdated: updatedMeal.imageLastUpdated ?? null
  });
}
