import { scoreMealQuality } from "@/src/lib/domain/analytics/quality";
import type { NutritionTotals } from "@/src/lib/domain/analytics/types";

export interface MealBackfillInput {
  notes: string | null;
  nutrition: Partial<NutritionTotals>;
  nutritionConfidence: string | null;
  nutritionSource: string | null;
  nutritionProvenance: string | null;
  qualityScore: number | null;
  metabolicScore: number | null;
  proteinScore: number | null;
  fiberScore: number | null;
  energyDensityScore: number | null;
  processingScore: number | null;
  satietyScoreNumeric: number | null;
  bloodSugarRiskScore: number | null;
}

export interface MealBackfillResult {
  nutritionConfidence: string | null;
  nutritionSource: string | null;
  nutritionProvenance: string | null;
  qualityScore: number | null;
  metabolicScore: number | null;
  proteinScore: number | null;
  fiberScore: number | null;
  energyDensityScore: number | null;
  processingScore: number | null;
  satietyScoreNumeric: number | null;
  bloodSugarRiskScore: number | null;
}

export const NOTION_BACKFILL_SOURCE = "notion-backfill";

export function backfillMealMetadata(input: MealBackfillInput): MealBackfillResult {
  const notesScores = parseLegacyScorecard(input.notes);
  const hasNutrition = hasAnyNutrition(input.nutrition);
  const hasStructuredNutrition = hasFullStructuredNutrition(input.nutrition);
  const qualityFromNutrition =
    input.qualityScore ?? deriveQualityScoreFromNutrition(input.nutrition);
  const qualityFromScorecard = deriveQualityScoreFromScorecard({
    metabolicScore: input.metabolicScore ?? notesScores.metabolicScore,
    proteinScore: input.proteinScore ?? notesScores.proteinScore,
    fiberScore: input.fiberScore ?? notesScores.fiberScore,
    satietyScoreNumeric:
      input.satietyScoreNumeric ?? notesScores.satietyScoreNumeric,
    bloodSugarRiskScore:
      input.bloodSugarRiskScore ?? notesScores.bloodSugarRiskScore
  });
  const usedBackfill =
    input.qualityScore === null &&
    (qualityFromNutrition !== null || qualityFromScorecard !== null);
  const source = input.nutritionSource ?? inferNutritionSource(input, hasNutrition);
  const provenance =
    input.nutritionProvenance ??
    inferNutritionProvenance(input, hasNutrition, hasStructuredNutrition, usedBackfill);

  return {
    nutritionConfidence:
      input.nutritionConfidence ??
      inferNutritionConfidence(input, hasNutrition, hasStructuredNutrition),
    nutritionSource: source,
    nutritionProvenance: provenance,
    qualityScore: qualityFromNutrition ?? qualityFromScorecard,
    metabolicScore: input.metabolicScore ?? notesScores.metabolicScore,
    proteinScore: input.proteinScore ?? notesScores.proteinScore,
    fiberScore: input.fiberScore ?? notesScores.fiberScore,
    energyDensityScore:
      input.energyDensityScore ?? deriveEnergyDensityScore(input.nutrition),
    processingScore: input.processingScore ?? notesScores.processingScore,
    satietyScoreNumeric:
      input.satietyScoreNumeric ?? notesScores.satietyScoreNumeric,
    bloodSugarRiskScore:
      input.bloodSugarRiskScore ?? notesScores.bloodSugarRiskScore
  };
}

export function parseLegacyScorecard(notes: string | null) {
  return {
    metabolicScore: parseScoreFromNotes(notes, "Metabolic"),
    proteinScore: parseScoreFromNotes(notes, "Protein"),
    fiberScore: parseScoreFromNotes(notes, "Fiber"),
    energyDensityScore: parseScoreFromNotes(notes, "Energy Density"),
    processingScore: parseScoreFromNotes(notes, "Processing"),
    satietyScoreNumeric: parseScoreFromNotes(notes, "Satiety"),
    bloodSugarRiskScore: parseScoreFromNotes(notes, "Blood Sugar Risk")
  };
}

function parseScoreFromNotes(notes: string | null, label: string) {
  if (!notes) {
    return null;
  }

  const pattern = new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)\\/10`, "i");
  const match = notes.match(pattern);
  const value = match ? Number(match[1]) : NaN;

  return Number.isFinite(value) ? value : null;
}

function deriveQualityScoreFromNutrition(nutrition: Partial<NutritionTotals>) {
  const score = scoreMealQuality({
    id: "notion-backfill",
    name: "Notion backfill",
    loggedAt: new Date(0).toISOString(),
    nutrition
  }).score;

  return score;
}

function deriveQualityScoreFromScorecard(signals: {
  metabolicScore: number | null;
  proteinScore: number | null;
  fiberScore: number | null;
  satietyScoreNumeric: number | null;
  bloodSugarRiskScore: number | null;
}) {
  if (
    signals.metabolicScore === null ||
    signals.proteinScore === null ||
    signals.fiberScore === null ||
    signals.satietyScoreNumeric === null ||
    signals.bloodSugarRiskScore === null
  ) {
    return null;
  }

  return scoreMealQuality({
    id: "notion-scorecard-backfill",
    name: "Notion scorecard backfill",
    loggedAt: new Date(0).toISOString(),
    nutrition: {},
    qualitySignals: {
      metabolicScore: signals.metabolicScore,
      proteinScore: signals.proteinScore,
      fiberScore: signals.fiberScore,
      satietyScoreNumeric: signals.satietyScoreNumeric,
      bloodSugarRiskScore: signals.bloodSugarRiskScore
    }
  }).score;
}

function deriveEnergyDensityScore(nutrition: Partial<NutritionTotals>) {
  const calories = nutrition.calories;

  if (typeof calories !== "number" || !Number.isFinite(calories) || calories <= 0) {
    return null;
  }

  if (calories <= 350) return 8;
  if (calories <= 650) return 6;
  if (calories <= 900) return 4;
  return 2;
}

function inferNutritionSource(
  input: MealBackfillInput,
  hasNutrition: boolean
) {
  if (!hasNutrition) {
    return null;
  }

  const evidence = [input.nutritionProvenance, input.nutritionConfidence, input.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (evidence.includes("user-entered") || evidence.includes("manual")) {
    return "user-entered";
  }

  if (evidence.includes("recipe") || evidence.includes("json-ld")) {
    return "recipe";
  }

  if (evidence.includes("estimated") || evidence.includes("free-text")) {
    return "estimated";
  }

  return NOTION_BACKFILL_SOURCE;
}

function inferNutritionProvenance(
  input: MealBackfillInput,
  hasNutrition: boolean,
  hasStructuredNutrition: boolean,
  usedBackfill: boolean
) {
  const details: string[] = [];

  if (hasNutrition) {
    details.push(
      hasStructuredNutrition
        ? "notion-backfill: existing saved nutrition fields"
        : "notion-backfill: partial saved nutrition fields"
    );
  }

  if (usedBackfill || parseLegacyScorecard(input.notes).metabolicScore !== null) {
    details.push("notion-backfill: legacy scorecard metadata");
  }

  return details.length > 0 ? details.join("; ") : null;
}

function inferNutritionConfidence(
  input: MealBackfillInput,
  hasNutrition: boolean,
  hasStructuredNutrition: boolean
) {
  if (!hasNutrition) {
    return null;
  }

  const evidence = [input.nutritionSource, input.nutritionProvenance, input.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (evidence.includes("high")) return "high";
  if (evidence.includes("low")) return "low";
  if (evidence.includes("estimated") || evidence.includes("free-text")) {
    return "medium";
  }

  return hasStructuredNutrition ? "medium" : "low";
}

function hasAnyNutrition(nutrition: Partial<NutritionTotals>) {
  return Object.values(nutrition).some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
}

function hasFullStructuredNutrition(nutrition: Partial<NutritionTotals>) {
  return ["calories", "protein", "fiber"].every((metric) => {
    const value = nutrition[metric as keyof NutritionTotals];
    return typeof value === "number" && Number.isFinite(value);
  });
}
