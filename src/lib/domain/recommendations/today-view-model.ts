import { buildDashboardViewModel } from "@/src/lib/domain/analytics";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";
import {
  getSuggestionForCategory,
  rankRecommendationsForCategory
} from "@/src/lib/domain/recommendations/ranking";
import { isDemoReadyRecommendationMeal } from "@/src/lib/domain/recommendations/demo-readiness";
import {
  countMealRepeats,
  countNutritionFields,
  getDaysSinceMeal,
  normalizeMealName
} from "@/src/lib/domain/recommendations/variety";
import {
  todayMealCategories,
  type MealRecommendation,
  type RecommendationMeal
} from "@/src/lib/domain/recommendations/types";

export interface FreshIdea {
  meal: RecommendationMeal;
  reason: string;
}

export interface HealthSnapshotItem {
  id: string;
  text: string;
}

export interface TodayViewModel {
  generatedAt: string;
  suggestions: Partial<Record<string, MealRecommendation>>;
  freshIdeas: FreshIdea[];
  healthSnapshot: HealthSnapshotItem[];
  emptyState: string | null;
}

function mapMealToAnalytics(meal: RecommendationMeal) {
  return {
    id: meal.id,
    name: meal.mealName,
    loggedAt: meal.createdAt,
    imageUrl: meal.imageUrl,
    mealType: meal.mealType,
    qualityScore: meal.qualityScore,
    nutrition: {
      calories: meal.calories,
      protein: meal.proteinG,
      carbs: meal.carbohydratesG,
      fat: meal.fatG,
      fiber: meal.fiberG
    }
  };
}

export function buildFreshIdeas(
  meals: RecommendationMeal[],
  selectedMealIds: string[],
  generatedAt: string
): FreshIdea[] {
  const selected = new Set(selectedMealIds);
  const seenNames = new Set<string>();

  return meals
    .filter((meal) => !selected.has(meal.id))
    .map((meal) => {
      const daysSinceMeal = getDaysSinceMeal(meal, generatedAt);
      const repeatCount = countMealRepeats(meals, meal);
      const isRecent = daysSinceMeal !== null && daysSinceMeal <= 14;
      const hasLittleHistory = repeatCount === 1 && !meal.familyApproved;

      if (!isRecent && !hasLittleHistory) {
        return null;
      }

      return {
        meal,
        reason: isRecent ? "Recently analyzed" : "Little household history"
      };
    })
    .filter((idea): idea is FreshIdea => idea !== null)
    .filter((idea) => {
      const normalizedName = normalizeMealName(idea.meal.mealName);

      if (seenNames.has(normalizedName)) {
        return false;
      }

      seenNames.add(normalizedName);
      return true;
    })
    .sort((left, right) => {
      const leftQuality = left.meal.qualityScore ?? 0;
      const rightQuality = right.meal.qualityScore ?? 0;

      if (rightQuality !== leftQuality) {
        return rightQuality - leftQuality;
      }

      return right.meal.createdAt.localeCompare(left.meal.createdAt);
    })
    .slice(0, 3);
}

export function buildHealthSnapshot(
  meals: RecommendationMeal[],
  generatedAt: string
): HealthSnapshotItem[] {
  if (meals.length === 0) {
    return [{ id: "limited-data", text: "Limited nutrition data available." }];
  }

  const dashboard = buildDashboardViewModel(meals.map(mapMealToAnalytics), {
    generatedAt
  });
  const recentMeals = meals.filter((meal) => {
    const daysSinceMeal = getDaysSinceMeal(meal, generatedAt);
    return daysSinceMeal !== null && daysSinceMeal <= 7;
  });
  const distinctRecentMeals = new Set(recentMeals.map((meal) => normalizeMealName(meal.mealName)));
  const averageProtein =
    dashboard.week.mealCount > 0 && dashboard.week.totals.protein !== null
      ? dashboard.week.totals.protein / dashboard.week.mealCount
      : null;
  const averageFiber =
    dashboard.week.mealCount > 0 && dashboard.week.totals.fiber !== null
      ? dashboard.week.totals.fiber / dashboard.week.mealCount
      : null;
  const nutritionDetailCount = recentMeals.filter(
    (meal) => countNutritionFields(meal) >= 3
  ).length;

  const items: HealthSnapshotItem[] = [];

  if (distinctRecentMeals.size >= 4) {
    items.push({ id: "variety", text: "You're getting good meal variety." });
  }

  if (averageProtein !== null && averageProtein >= 20) {
    items.push({
      id: "protein",
      text: "Protein data looks reasonable this week."
    });
  }

  if (averageFiber !== null && averageFiber < 8) {
    items.push({ id: "fiber", text: "Fiber opportunities exist." });
  }

  if (recentMeals.length < 3 || nutritionDetailCount < Math.ceil(recentMeals.length / 2)) {
    items.push({
      id: "limited-data",
      text: "Limited nutrition data available."
    });
  }

  return items.length > 0
    ? items.slice(0, 3)
    : [{ id: "steady", text: "Recent meals have enough detail to guide today." }];
}

export function buildTodayViewModel(
  meals: RecommendationMeal[],
  options: {
    generatedAt?: string;
    feedbackByMealId?: MealFeedbackSummaryByMealId;
  } = {}
): TodayViewModel {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const recommendationMeals = meals.filter(isDemoReadyRecommendationMeal);
  const suggestions: TodayViewModel["suggestions"] = {};
  const selectedMealIds: string[] = [];
  const selectedMealNames: string[] = [];

  for (const category of todayMealCategories) {
    const suggestion = getSuggestionForCategory(recommendationMeals, category, {
      generatedAt,
      excludedMealNames: selectedMealNames,
      feedbackByMealId: options.feedbackByMealId
    });

    if (suggestion) {
      suggestions[category] = suggestion;
      selectedMealIds.push(suggestion.meal.id);
      selectedMealNames.push(suggestion.meal.mealName);
    }
  }

  return {
    generatedAt,
    suggestions,
    freshIdeas: buildFreshIdeas(recommendationMeals, selectedMealIds, generatedAt),
    healthSnapshot: buildHealthSnapshot(meals, generatedAt),
    emptyState:
      meals.length === 0
        ? "No saved meals found yet. Today will start suggesting meals once the archive has enough real household data."
        : recommendationMeals.length === 0
          ? "Saved meals need images, metadata, ingredients, and nutrition before they appear in demo recommendations."
        : null
  };
}

export { rankRecommendationsForCategory };
