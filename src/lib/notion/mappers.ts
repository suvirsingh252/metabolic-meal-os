import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { scoreMealQuality } from "@/src/lib/domain/analytics";
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

// Notion caps each rich_text block at 2000 characters but allows up to 100
// blocks per property. Reads join block plain_text with no separator, so
// slicing on raw character boundaries is lossless on reload.
const RICH_TEXT_BLOCK_LIMIT = 2000;
const RICH_TEXT_MAX_BLOCKS = 100;

function richTextChunks(content: string) {
  const chunks: Array<{ text: { content: string } }> = [];

  for (
    let offset = 0;
    offset < content.length && chunks.length < RICH_TEXT_MAX_BLOCKS;
    offset += RICH_TEXT_BLOCK_LIMIT
  ) {
    chunks.push({
      text: { content: content.slice(offset, offset + RICH_TEXT_BLOCK_LIMIT) }
    });
  }

  return {
    rich_text: chunks.length > 0 ? chunks : [{ text: { content: "" } }]
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

function number(value: number) {
  return {
    number: value
  };
}

export interface MealSourcePropertySchema {
  sourceType?: { name: string; type: "select" | "rich_text" };
  sourceUrl?: { name: string; type: "url" | "rich_text" };
  sourceName?: { name: string; type: "select" | "rich_text" };
  sourceClassification?: { name: string; type: "select" | "rich_text" };
  sourceNotes?: { name: string; type: "rich_text" };
  ingredients?: { name: string; type: "rich_text" };
  instructions?: { name: string; type: "rich_text" };
  importedAt?: { name: string; type: "date" };
  lastParsedAt?: { name: string; type: "date" };
  parserVersion?: { name: string; type: "select" | "rich_text" };
  analysisVersion?: { name: string; type: "select" | "rich_text" };
  analysisModel?: { name: string; type: "select" | "rich_text" };
  householdId?: { name: string; type: "rich_text" | "select" };
  createdBy?: { name: string; type: "rich_text" | "select" };
  visibility?: { name: string; type: "select" | "rich_text" };
  schemaVersion?: { name: string; type: "select" | "rich_text" };
  calories?: { name: string; type: "number" };
  proteinG?: { name: string; type: "number" };
  carbohydratesG?: { name: string; type: "number" };
  fatG?: { name: string; type: "number" };
  fiberG?: { name: string; type: "number" };
  sodiumMg?: { name: string; type: "number" };
  sugarG?: { name: string; type: "number" };
  nutritionConfidence?: { name: string; type: "select" | "rich_text" | "number" };
  nutritionProvenance?: { name: string; type: "select" | "rich_text" };
  nutritionSource?: { name: string; type: "select" | "rich_text" };
  mealQualityScore?: { name: string; type: "number" };
  metabolicScore?: { name: string; type: "number" };
  proteinScore?: { name: string; type: "number" };
  fiberScore?: { name: string; type: "number" };
  satietyScoreNumeric?: { name: string; type: "number" };
  bloodSugarRiskScore?: { name: string; type: "number" };
  mealDate?: { name: string; type: "date" };
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
    Notes: richTextChunks(buildMealNotesSummary(meal))
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
  applyTextLikeProperty(
    properties,
    schema.sourceClassification,
    meal.sourceClassification
  );
  applyTextLikeProperty(properties, schema.parserVersion, meal.parserVersion);
  applyTextLikeProperty(
    properties,
    schema.analysisVersion,
    meal.analysisVersion
  );
  applyTextLikeProperty(properties, schema.analysisModel, meal.analysisModel);
  applyTextLikeProperty(properties, schema.householdId, meal.householdId);
  applyTextLikeProperty(properties, schema.createdBy, meal.createdBy);
  applyTextLikeProperty(properties, schema.visibility, meal.visibility);
  applyTextLikeProperty(properties, schema.schemaVersion, meal.schemaVersion);

  if (schema.sourceNotes && meal.sourceNotes?.length) {
    properties[schema.sourceNotes.name] = richText(meal.sourceNotes.join("\n"));
  }

  if (schema.ingredients && meal.ingredients?.length) {
    if (process.env.TABLEWISE_INGREDIENT_DIAGNOSTICS === "1") {
      console.info("Ingredient pipeline diagnostics: Notion persistence", {
        mealName: meal.mealName,
        sourceUrl: meal.sourceUrl,
        persistedIngredientPayload: meal.ingredients.map((ingredient) => ({
          rawText: ingredient.rawText,
          name: ingredient.name ?? null,
          quantity: ingredient.quantity ?? null,
          unit: ingredient.unit ?? null
        }))
      });
    }

    properties[schema.ingredients.name] = richTextChunks(
      meal.ingredients
        .map((ingredient) => ingredient.rawText.trim())
        .filter(Boolean)
        .join("\n")
    );
  }

  if (schema.instructions && meal.instructions?.length) {
    properties[schema.instructions.name] = richTextChunks(
      meal.instructions
        .map((step, index) => `${index + 1}. ${step.trim()}`)
        .join("\n")
    );
  }

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

  if (schema.mealDate) {
    properties[schema.mealDate.name] = date(meal.importedAt ?? new Date().toISOString());
  }

  if (meal.nutritionEstimate) {
    applyNumberProperty(
      properties,
      schema.calories,
      meal.nutritionEstimate.totals.calories
    );
    applyNumberProperty(
      properties,
      schema.proteinG,
      meal.nutritionEstimate.totals.protein
    );
    applyNumberProperty(
      properties,
      schema.carbohydratesG,
      meal.nutritionEstimate.totals.carbs
    );
    applyNumberProperty(properties, schema.fatG, meal.nutritionEstimate.totals.fat);
    applyNumberProperty(
      properties,
      schema.fiberG,
      meal.nutritionEstimate.totals.fiber
    );
    applyNumberProperty(
      properties,
      schema.sodiumMg,
      meal.nutritionEstimate.totals.sodium
    );
    applyNumberProperty(
      properties,
      schema.sugarG,
      meal.nutritionEstimate.totals.sugar
    );
    applyConfidenceProperty(
      properties,
      schema.nutritionConfidence,
      meal.nutritionEstimate.confidence
    );
    applyTextLikeProperty(
      properties,
      schema.nutritionProvenance,
      meal.nutritionEstimate.provenance
    );
    applyTextLikeProperty(
      properties,
      schema.nutritionSource,
      meal.nutritionEstimate.source
    );
  }

  applyNumberProperty(properties, schema.metabolicScore, meal.metabolicScore);
  applyNumberProperty(properties, schema.proteinScore, meal.proteinScore);
  applyNumberProperty(properties, schema.fiberScore, meal.fiberScore);
  applyNumberProperty(
    properties,
    schema.satietyScoreNumeric,
    meal.satietyScoreNumeric
  );
  applyNumberProperty(
    properties,
    schema.bloodSugarRiskScore,
    meal.bloodSugarRiskScore
  );

  const quality = scoreMealQuality({
    id: "pending",
    name: meal.mealName,
    loggedAt: new Date().toISOString(),
    nutrition: meal.nutritionEstimate?.totals ?? {},
    qualitySignals: {
      metabolicScore: meal.metabolicScore,
      proteinScore: meal.proteinScore,
      fiberScore: meal.fiberScore,
      satietyScoreNumeric: meal.satietyScoreNumeric,
      bloodSugarRiskScore: meal.bloodSugarRiskScore
    },
    ingredientCount: meal.ingredientSuggestions.length
  });
  applyNumberProperty(properties, schema.mealQualityScore, quality.score);
}

function applyNumberProperty(
  properties: PageProperties,
  property: { name: string; type: "number" } | undefined,
  value: number | null | undefined
) {
  if (!property || typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }

  properties[property.name] = number(value);
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

function applyConfidenceProperty(
  properties: PageProperties,
  property: { name: string; type: "select" | "rich_text" | "number" } | undefined,
  value: string | null | undefined
) {
  if (!property || !value) {
    return;
  }

  if (property.type !== "number") {
    applyTextLikeProperty(
      properties,
      { name: property.name, type: property.type },
      value
    );
    return;
  }

  const normalizedValue = value.toLowerCase();
  const confidenceNumber =
    normalizedValue === "high" ? 3 : normalizedValue === "medium" ? 2 : 1;

  properties[property.name] = number(confidenceNumber);
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
