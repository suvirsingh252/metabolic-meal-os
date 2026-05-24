import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import type { MealFeedbackRequest } from "@/src/lib/types/feedback";
import type { MealAnalysisResult } from "@/src/lib/types/meal";
import { buildMealNotesSummary } from "@/src/lib/notion/meal-notes";

type PageProperties = NonNullable<CreatePageParameters["properties"]>;

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

function url(content: string) {
  return {
    url: content
  };
}

function date(start: string) {
  return {
    date: {
      start
    }
  };
}

export interface MealSourcePropertySchema {
  sourceType?: { name: string; type: "select" | "rich_text" };
  sourceUrl?: { name: string; type: "url" | "rich_text" };
  sourceName?: { name: string; type: "select" | "rich_text" };
  importedAt?: { name: string; type: "date" };
  lastParsedAt?: { name: string; type: "date" };
  parserVersion?: { name: string; type: "select" | "rich_text" };
}

export function mapMealAnalysisToNotionProperties(
  meal: MealAnalysisResult,
  sourceSchema?: MealSourcePropertySchema
): PageProperties {
  const properties: PageProperties = {
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

  applyMealSourceProperties(properties, meal, sourceSchema);

  return properties;
}

function applyMealSourceProperties(
  properties: PageProperties,
  meal: MealAnalysisResult,
  schema?: MealSourcePropertySchema
) {
  if (!schema) {
    return;
  }

  applyTextLikeProperty(properties, schema.sourceType, meal.sourceType);
  applyTextLikeProperty(properties, schema.sourceName, meal.sourceName);
  applyTextLikeProperty(properties, schema.parserVersion, meal.parserVersion);

  if (schema.sourceUrl && meal.sourceUrl) {
    properties[schema.sourceUrl.name] =
      schema.sourceUrl.type === "url" ? url(meal.sourceUrl) : richText(meal.sourceUrl);
  }

  if (schema.importedAt && meal.importedAt) {
    properties[schema.importedAt.name] = date(meal.importedAt);
  }

  if (schema.lastParsedAt && meal.lastParsedAt) {
    properties[schema.lastParsedAt.name] = date(meal.lastParsedAt);
  }
}

function applyTextLikeProperty(
  properties: PageProperties,
  property: { name: string; type: "select" | "rich_text" } | undefined,
  value: string | null | undefined
) {
  if (!property || !value) {
    return;
  }

  properties[property.name] =
    property.type === "select" ? select(value) : richText(value);
}

export function mapMealFeedbackToNotionProperties(
  feedback: MealFeedbackRequest,
  options?: {
    includeMealRelation?: boolean;
    mealRelationPropertyName?: string;
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

  if (
    options?.includeMealRelation &&
    options.mealRelationPropertyName &&
    feedback.selectedMealId
  ) {
    properties[options.mealRelationPropertyName] = relation(feedback.selectedMealId);
  }

  return properties;
}
