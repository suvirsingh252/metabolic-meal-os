import type { MealAnalysisResult } from "@/src/lib/types/meal";

// Notion rich_text blocks are capped at 2000 characters per chunk.
const NOTION_RICH_TEXT_LIMIT = 2000;

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

/**
 * Builds the plain-text content written to the Notion "Notes" property.
 * Combines the original notes with a concise Analysis Framework v2 summary
 * so the existing Notion schema needs no changes.
 */
export function buildMealNotesSummary(meal: MealAnalysisResult): string {
  const parts: string[] = [];

  if (meal.notes.trim()) {
    parts.push(`Original Notes:\n${meal.notes.trim()}`);
  }

  const scorecardLines = [
    `- Metabolic: ${meal.metabolicScore}/10`,
    `- Protein: ${meal.proteinScore}/10`,
    `- Fiber: ${meal.fiberScore}/10`,
    `- Satiety: ${meal.satietyScoreNumeric}/10`,
    `- Blood Sugar Risk: ${meal.bloodSugarRiskScore}/10`
  ].join("\n");

  const v2Sections: string[] = ["Analysis Framework v2 Summary:"];

  if (meal.quickVerdict.trim()) {
    v2Sections.push(`Quick Verdict:\n${meal.quickVerdict.trim()}`);
  }

  v2Sections.push(`Scorecard:\n${scorecardLines}`);

  if (meal.mainConcerns.length > 0) {
    v2Sections.push(`Main Concerns:\n${bulletList(meal.mainConcerns)}`);
  }

  if (meal.plateStrategy.trim()) {
    v2Sections.push(`Plate Strategy:\n${meal.plateStrategy.trim()}`);
  }

  if (meal.cautions.length > 0) {
    v2Sections.push(`Cautions:\n${bulletList(meal.cautions)}`);
  }

  parts.push(v2Sections.join("\n\n"));

  const summary = parts.join("\n\n");

  if (summary.length <= NOTION_RICH_TEXT_LIMIT) {
    return summary;
  }

  return summary.slice(0, NOTION_RICH_TEXT_LIMIT - 3) + "...";
}
