import { and, desc, eq } from "drizzle-orm";
import { getDbClient, type DbClient } from "@/src/lib/db/client";
import { dinnerFeedback, meals } from "@/src/lib/db/schema";
import type {
  FeedbackChip,
  FeedbackChipEvent
} from "@/src/lib/domain/feedback/chips";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

export interface SaveDinnerFeedbackInput {
  householdId: string;
  mealId: string;
  chipType: FeedbackChip;
  createdBy?: string | null;
  createdAt?: Date;
}

export interface QueryDinnerFeedbackInput {
  householdId: string;
  mealId?: string;
}

export interface UpsertMirrorMealInput {
  householdId: string;
  createdBy?: string | null;
  meal: MealSummary;
}

function toNumericText(value: number | null): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
}

export async function saveDinnerFeedbackChip(
  input: SaveDinnerFeedbackInput,
  db: DbClient = getDbClient()
) {
  const [saved] = await db
    .insert(dinnerFeedback)
    .values({
      householdId: input.householdId,
      mealId: input.mealId,
      chipType: input.chipType,
      createdBy: input.createdBy ?? null,
      createdAt: input.createdAt
    })
    .returning();

  return saved;
}

export async function queryDinnerFeedbackEvents(
  input: QueryDinnerFeedbackInput,
  db: DbClient = getDbClient()
): Promise<FeedbackChipEvent[]> {
  const where = input.mealId
    ? and(
        eq(dinnerFeedback.householdId, input.householdId),
        eq(dinnerFeedback.mealId, input.mealId)
      )
    : eq(dinnerFeedback.householdId, input.householdId);
  const rows = await db
    .select({
      mealId: dinnerFeedback.mealId,
      chipType: dinnerFeedback.chipType,
      createdAt: dinnerFeedback.createdAt
    })
    .from(dinnerFeedback)
    .where(where)
    .orderBy(desc(dinnerFeedback.createdAt));

  return rows.map((row) => ({
    mealId: row.mealId,
    chipType: row.chipType as FeedbackChip,
    createdAt: row.createdAt.toISOString()
  }));
}

/**
 * Resolve a Notion meal page id to its Postgres mirror `meals.id` (uuid).
 * Returns null when the meal has not been mirrored into Postgres yet, which the
 * feedback endpoint surfaces as a 422 "meal not in store" rather than letting
 * the FK insert fail.
 */
export async function resolveMirrorMealId(
  notionPageId: string,
  db: DbClient = getDbClient()
): Promise<string | null> {
  const [row] = await db
    .select({ id: meals.id })
    .from(meals)
    .where(eq(meals.notionPageId, notionPageId))
    .limit(1);

  return row?.id ?? null;
}

/**
 * Create or refresh the Postgres meal mirror row for a Notion-backed meal.
 * `notion_page_id` is unique, so concurrent feedback submissions resolve to a
 * single mirror row instead of creating duplicates.
 */
export async function upsertMirrorMealFromSummary(
  input: UpsertMirrorMealInput,
  db: DbClient = getDbClient()
): Promise<string> {
  const meal = input.meal;
  const updatedAt = new Date();
  const values = {
    notionPageId: meal.id,
    notionUrl: meal.url,
    householdId: input.householdId,
    createdBy: input.createdBy ?? null,
    mealName: meal.mealName,
    cuisine: meal.cuisine,
    mealType: meal.mealType,
    proteinLevel: meal.proteinLevel,
    satietyLevel: meal.satietyLevel,
    bloodSugarImpact: meal.bloodSugarImpact,
    effortLevel: meal.effortLevel,
    familyApproved: meal.familyApproved,
    weeknightFriendly: meal.weeknightFriendly,
    comfortMeal: meal.comfortMeal,
    sourceUrl: meal.sourceUrl,
    sourceName: meal.sourceName,
    imageUrl: meal.imageUrl ?? null,
    imageSource: meal.imageSource ?? null,
    imageOriginalUrl: meal.imageOriginalUrl ?? null,
    imagePrompt: meal.imagePrompt ?? null,
    imageAttribution: meal.imageAttribution ?? null,
    imageStatus: meal.imageStatus ?? null,
    imageLastUpdated: meal.imageLastUpdated ? new Date(meal.imageLastUpdated) : null,
    ingredientsText: meal.ingredientsText,
    instructionsText: meal.instructionsText,
    optimizedVersion: meal.optimizedVersion,
    notes: meal.notes,
    calories: toNumericText(meal.calories),
    proteinG: toNumericText(meal.proteinG),
    carbohydratesG: toNumericText(meal.carbohydratesG),
    fatG: toNumericText(meal.fatG),
    fiberG: toNumericText(meal.fiberG),
    sodiumMg: toNumericText(meal.sodiumMg),
    sugarG: toNumericText(meal.sugarG),
    nutritionConfidence: meal.nutritionConfidence,
    nutritionSource: meal.nutritionSource,
    nutritionProvenance: meal.nutritionProvenance,
    qualityScore: toNumericText(meal.qualityScore),
    metabolicScore: toNumericText(meal.metabolicScore),
    proteinScore: toNumericText(meal.proteinScore),
    fiberScore: toNumericText(meal.fiberScore),
    energyDensityScore: toNumericText(meal.energyDensityScore),
    processingScore: toNumericText(meal.processingScore),
    satietyScoreNumeric: toNumericText(meal.satietyScoreNumeric),
    bloodSugarRiskScore: toNumericText(meal.bloodSugarRiskScore),
    updatedAt
  };

  const [row] = await db
    .insert(meals)
    .values(values)
    .onConflictDoUpdate({
      target: meals.notionPageId,
      set: {
        notionUrl: values.notionUrl,
        householdId: values.householdId,
        mealName: values.mealName,
        cuisine: values.cuisine,
        mealType: values.mealType,
        proteinLevel: values.proteinLevel,
        satietyLevel: values.satietyLevel,
        bloodSugarImpact: values.bloodSugarImpact,
        effortLevel: values.effortLevel,
        familyApproved: values.familyApproved,
        weeknightFriendly: values.weeknightFriendly,
        comfortMeal: values.comfortMeal,
        sourceUrl: values.sourceUrl,
        sourceName: values.sourceName,
        imageUrl: values.imageUrl,
        imageSource: values.imageSource,
        imageOriginalUrl: values.imageOriginalUrl,
        imagePrompt: values.imagePrompt,
        imageAttribution: values.imageAttribution,
        imageStatus: values.imageStatus,
        imageLastUpdated: values.imageLastUpdated,
        ingredientsText: values.ingredientsText,
        instructionsText: values.instructionsText,
        optimizedVersion: values.optimizedVersion,
        notes: values.notes,
        calories: values.calories,
        proteinG: values.proteinG,
        carbohydratesG: values.carbohydratesG,
        fatG: values.fatG,
        fiberG: values.fiberG,
        sodiumMg: values.sodiumMg,
        sugarG: values.sugarG,
        nutritionConfidence: values.nutritionConfidence,
        nutritionSource: values.nutritionSource,
        nutritionProvenance: values.nutritionProvenance,
        qualityScore: values.qualityScore,
        metabolicScore: values.metabolicScore,
        proteinScore: values.proteinScore,
        fiberScore: values.fiberScore,
        energyDensityScore: values.energyDensityScore,
        processingScore: values.processingScore,
        satietyScoreNumeric: values.satietyScoreNumeric,
        bloodSugarRiskScore: values.bloodSugarRiskScore,
        updatedAt: values.updatedAt
      }
    })
    .returning({ id: meals.id });

  return row.id;
}

/**
 * Load chip feedback for a household joined through the Postgres meals mirror so
 * each event is keyed by the meal's Notion page id. This lets feedback summaries
 * line up with the Notion-backed meals used by the recommendation view model.
 */
export async function queryDinnerFeedbackEventsByNotionId(
  input: { householdId: string },
  db: DbClient = getDbClient()
): Promise<FeedbackChipEvent[]> {
  const rows = await db
    .select({
      notionPageId: meals.notionPageId,
      chipType: dinnerFeedback.chipType,
      createdAt: dinnerFeedback.createdAt
    })
    .from(dinnerFeedback)
    .innerJoin(meals, eq(dinnerFeedback.mealId, meals.id))
    .where(eq(dinnerFeedback.householdId, input.householdId))
    .orderBy(desc(dinnerFeedback.createdAt));

  return rows
    .filter((row): row is typeof row & { notionPageId: string } =>
      Boolean(row.notionPageId)
    )
    .map((row) => ({
      mealId: row.notionPageId,
      chipType: row.chipType as FeedbackChip,
      createdAt: row.createdAt.toISOString()
    }));
}
