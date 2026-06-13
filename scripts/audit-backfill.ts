/**
 * Usage: npm run audit:backfill
 *
 * Dry-run auditor for the Notion -> Postgres meals backfill.
 *
 * It reads Notion (read-only) through queryAllMealSummaries(), maps every meal
 * into the Postgres `meals` insert shape (NewMeal), and prints a report plus a
 * small sample of the transformed objects.
 *
 * It writes NOTHING to Postgres and NOTHING to Notion. It does not even open a
 * database connection — the schema is imported as a type only. Safe to run any
 * time against the live Notion workspace.
 */
import type { NewMeal } from "@/src/lib/db/schema";
import { getConfiguredHouseholdMetadata } from "@/src/lib/domain/household/metadata";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";

type Household = ReturnType<typeof getConfiguredHouseholdMetadata>;

const UNTITLED_SENTINEL = "Untitled meal";
const SAMPLE_SIZE = 3;

// Postgres `numeric` columns infer as `string | null` on insert; convert from
// the MealSummary's `number | null` without losing the null/zero distinction.
function num(value: number | null): string | null {
  return value === null ? null : String(value);
}

// MealSummary.createdAt is an ISO timestamp or date-only string. The Postgres
// `meal_date` column is a DATE, so keep only a valid YYYY-MM-DD prefix.
function toMealDate(createdAt: string): string | null {
  const datePart = createdAt?.trim().slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

function hasMissingName(meal: MealSummary): boolean {
  return meal.mealName.trim().length === 0 || meal.mealName === UNTITLED_SENTINEL;
}

function hasNoNutrition(meal: MealSummary): boolean {
  return (
    meal.calories === null &&
    meal.proteinG === null &&
    meal.carbohydratesG === null &&
    meal.fatG === null &&
    meal.fiberG === null &&
    meal.sodiumMg === null &&
    meal.sugarG === null
  );
}

function toNewMeal(meal: MealSummary, household: Household): NewMeal {
  return {
    // Notion sync anchors
    notionPageId: meal.id,
    notionUrl: meal.url,

    // Tenancy — MealSummary does not carry household tagging, so backfill would
    // assign the configured household to every row (see report household note).
    householdId: household.householdId,
    createdBy: household.createdBy,
    visibility: household.visibility,
    schemaVersion: household.schemaVersion,

    // Identity
    mealName: meal.mealName,
    cuisine: meal.cuisine,
    mealType: meal.mealType,
    proteinLevel: meal.proteinLevel,
    satietyLevel: meal.satietyLevel,
    bloodSugarImpact: meal.bloodSugarImpact,
    effortLevel: meal.effortLevel,

    // Boolean signals
    familyApproved: meal.familyApproved,
    weeknightFriendly: meal.weeknightFriendly,
    comfortMeal: meal.comfortMeal,

    // Source tracking (only the fields MealSummary exposes)
    sourceUrl: meal.sourceUrl,
    sourceName: meal.sourceName,

    // Recipe content
    ingredientsText: meal.ingredientsText,
    instructionsText: meal.instructionsText,
    optimizedVersion: meal.optimizedVersion,
    notes: meal.notes,

    // Nutrition
    calories: num(meal.calories),
    proteinG: num(meal.proteinG),
    carbohydratesG: num(meal.carbohydratesG),
    fatG: num(meal.fatG),
    fiberG: num(meal.fiberG),
    sodiumMg: num(meal.sodiumMg),
    sugarG: num(meal.sugarG),
    nutritionConfidence: meal.nutritionConfidence,
    nutritionSource: meal.nutritionSource,
    nutritionProvenance: meal.nutritionProvenance,

    // Quality scores
    qualityScore: num(meal.qualityScore),
    metabolicScore: num(meal.metabolicScore),
    proteinScore: num(meal.proteinScore),
    fiberScore: num(meal.fiberScore),
    energyDensityScore: num(meal.energyDensityScore),
    processingScore: num(meal.processingScore),
    satietyScoreNumeric: num(meal.satietyScoreNumeric),
    bloodSugarRiskScore: num(meal.bloodSugarRiskScore),

    // Logged date (row created_at/updated_at use DB defaults on insert)
    mealDate: toMealDate(meal.createdAt)
  };
}

interface SkippedRow {
  notionPageId: string;
  mealName: string;
  reasons: string[];
}

async function main() {
  console.log("Notion -> Postgres backfill auditor (DRY RUN — no writes)\n");

  const household = getConfiguredHouseholdMetadata();
  const { meals } = await queryAllMealSummaries();

  // Count notion_page_id occurrences to detect collisions against the UNIQUE
  // constraint on meals.notion_page_id.
  const idCounts = new Map<string, number>();
  for (const meal of meals) {
    idCounts.set(meal.id, (idCounts.get(meal.id) ?? 0) + 1);
  }
  const duplicateIds = Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));

  const seenIds = new Set<string>();
  const convertible: NewMeal[] = [];
  const skipped: SkippedRow[] = [];
  let missingNames = 0;
  let missingNutrition = 0;

  for (const meal of meals) {
    const reasons: string[] = [];
    const missingId = meal.id.trim().length === 0;
    const missingName = hasMissingName(meal);
    const isDuplicate = !missingId && seenIds.has(meal.id);

    if (missingName) {
      missingNames += 1;
    }

    if (hasNoNutrition(meal)) {
      missingNutrition += 1;
    }

    if (missingId) {
      reasons.push("missing notion_page_id");
    }

    if (missingName) {
      reasons.push("missing meal name");
    }

    if (isDuplicate) {
      reasons.push("duplicate notion_page_id (would collide on UNIQUE)");
    }

    if (!missingId) {
      seenIds.add(meal.id);
    }

    if (reasons.length > 0) {
      skipped.push({
        notionPageId: meal.id || "(none)",
        mealName: meal.mealName,
        reasons
      });
      continue;
    }

    convertible.push(toNewMeal(meal, household));
  }

  console.log("== Source ==");
  console.log(`  total Notion meals:        ${meals.length}`);
  console.log("");

  console.log("== Convertibility ==");
  console.log(`  convertible meals:         ${convertible.length}`);
  console.log(`  skipped meals:             ${skipped.length}`);
  for (const row of skipped) {
    console.log(`    - ${row.notionPageId} "${row.mealName}" :: ${row.reasons.join("; ")}`);
  }
  console.log("");

  console.log("== Integrity flags ==");
  console.log(`  duplicate notion_page_ids: ${duplicateIds.length}`);
  for (const dup of duplicateIds) {
    console.log(`    - ${dup.id} appears ${dup.count}x`);
  }
  console.log(`  missing meal names:        ${missingNames}`);
  console.log(`  meals with no nutrition:   ${missingNutrition}`);
  console.log("");

  console.log("== Household ==");
  console.log(`  configured household:      ${household.householdId}`);
  console.log(`  rows assigned via fallback:${" "}${meals.length}`);
  console.log(
    "  NOTE: queryAllMealSummaries() already filters to (Household ID equals\n" +
      "  configured household OR is_empty), and the meal mapper does not surface\n" +
      "  the Household ID property. Legacy/untagged rows therefore cannot be\n" +
      "  distinguished from tagged rows here; every backfilled row would receive\n" +
      "  the configured household. Splitting legacy vs tagged requires reading the\n" +
      "  raw Notion Household ID property, which is out of scope for this dry run."
  );
  console.log("");

  console.log(`== Sample (first ${SAMPLE_SIZE} transformed objects) ==`);
  console.log(JSON.stringify(convertible.slice(0, SAMPLE_SIZE), null, 2));
  console.log("");

  console.log("Dry run complete. No data was written to Postgres or Notion.");
}

main().catch((error) => {
  console.error("Audit failed:", error);
  process.exit(1);
});
