import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";
import {
  buildMealDetailViewModel,
  type MealDetailViewModel
} from "@/src/lib/domain/meals/detail-view-model";
import { getNotionMealsEnv } from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { queryMealFeedbackSummaries } from "@/src/lib/notion/feedback-summary";
import {
  mapNotionPageToMealSummary,
  type MealSummary
} from "@/src/lib/notion/meal-summary";
import { queryMealSummaries } from "@/src/lib/notion/meals-query";

async function queryMealSummaryByPageId(
  mealId: string
): Promise<MealSummary | null> {
  const { NOTION_API_KEY } = getNotionMealsEnv();
  const notion = getNotionClient(NOTION_API_KEY);
  const page = await notion.pages.retrieve({
    page_id: decodeURIComponent(mealId)
  });

  return mapNotionPageToMealSummary(page);
}

export async function getMealDetail(
  mealId: string
): Promise<MealDetailViewModel | null> {
  const mealResult = await queryMealSummaries({ pageSize: 100 });
  let meals = mealResult.meals;
  let feedbackByMealId: MealFeedbackSummaryByMealId = {};

  try {
    feedbackByMealId = await queryMealFeedbackSummaries({ pageSize: 100 });
  } catch (error) {
    console.error("Meal detail feedback summary query failure", error);
  }

  let detail = buildMealDetailViewModel(meals, mealId, {
    feedbackByMealId
  });

  if (!detail) {
    try {
      const directMeal = await queryMealSummaryByPageId(mealId);

      if (directMeal) {
        meals = [directMeal, ...meals.filter((meal) => meal.id !== directMeal.id)];
        detail = buildMealDetailViewModel(meals, directMeal.id, {
          feedbackByMealId
        });
      }
    } catch (error) {
      console.error("Meal detail direct page lookup failure", error);
    }
  }

  return detail;
}
