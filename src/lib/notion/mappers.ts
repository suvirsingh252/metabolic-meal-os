import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import type { MealFeedbackRequest } from "@/src/lib/types/feedback";
import type { MealAnalysisResult } from "@/src/lib/types/meal";
import { buildMealNotesSummary } from "@/src/lib/notion/meal-notes";

type PageProperties = CreatePageParameters["properties"];

function title(content: string) {
  return {
    title: [
      {
        text: {
          content
        }
      }
    ]
  };
}

function select(name: string) {
  return {
    select: {
      name
    }
  };
}

function checkbox(checked: boolean) {
  return {
    checkbox: checked
  };
}

function richText(content: string) {
  return {
    rich_text: [
      {
        text: {
          content
        }
      }
    ]
  };
}

function relation(pageId: string) {
  return {
    relation: [
      {
        id: pageId
      }
    ]
  };
}

export function mapMealAnalysisToNotionProperties(
  meal: MealAnalysisResult
): PageProperties {
  return {
    "Meal Name": title(meal.mealName),
    Cuisine: select(meal.cuisine),
    "Meal Type": select(meal.mealType),
    "Protein Level": select(meal.proteinLevel),
    "Satiety Level": select(meal.satietyLevel),
    "Blood Sugar Impact": select(meal.bloodSugarImpact),
    "Effort Level": select(meal.effortLevel),
    "Family Approved": checkbox(meal.familyApproved),
    "Weeknight Friendly": checkbox(meal.weeknightFriendly),
    "Comfort Meal": checkbox(meal.comfortMeal),
    "Optimized Version": richText(meal.optimizedVersion),
    Notes: richText(buildMealNotesSummary(meal))
  };
}

export function mapMealFeedbackToNotionProperties(
  feedback: MealFeedbackRequest,
  options?: {
    includeMealRelation?: boolean;
  }
): PageProperties {
  const properties: PageProperties = {
    "Feedback Entry": title(feedback.feedbackEntry),
    "Energy After": select(feedback.energyAfter),
    "Hunger Later": select(feedback.hungerLater),
    "Cravings Later": checkbox(feedback.cravingsLater),
    "Would Repeat": checkbox(feedback.wouldRepeat),
    Notes: richText(feedback.notes)
  };

  if (options?.includeMealRelation && feedback.selectedMealId) {
    properties.Meal = relation(feedback.selectedMealId);
  }

  return properties;
}
