import type { MealAnalysisResult } from "@/src/lib/types/meal";

// Notion rich_text blocks are capped at 2000 characters per chunk. The Notes
// property is written as multiple chunks (see richTextChunks in mappers), so
// the summary cap below only bounds total payload size, not a single block.
const NOTES_TOTAL_CHARACTER_LIMIT = 20_000;

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function guidanceBasisList(
  guidanceBasis: MealAnalysisResult["guidanceBasis"]
): string {
  return guidanceBasis
    .map(
      (basis) =>
        `- ${basis.sourceId} / ${basis.principleId}: ${basis.relevance}`
    )
    .join("\n");
}

function formatIngredientLine(
  ingredient: NonNullable<MealAnalysisResult["ingredients"]>[number]
): string {
  return ingredient.rawText.trim();
}

/**
 * Builds the plain-text content written to the Notion "Notes" property.
 * Combines the original notes, verbatim cookbook sections (Ingredients /
 * Instructions), and a concise Analysis Framework v2 summary so the existing
 * Notion schema needs no changes. The section headers are intentionally the
 * ones buildMealCookbook parses back out at read time.
 */
export function buildMealNotesSummary(meal: MealAnalysisResult): string {
  const parts: string[] = [];

  if (meal.notes.trim()) {
    parts.push(`Original Notes:\n${meal.notes.trim()}`);
  }

  const ingredientLines = (meal.ingredients ?? [])
    .map(formatIngredientLine)
    .filter(Boolean);

  if (ingredientLines.length > 0) {
    parts.push(`Ingredients:\n${bulletList(ingredientLines)}`);
  }

  const instructionLines = (meal.instructions ?? [])
    .map((step) => step.trim())
    .filter(Boolean);

  if (instructionLines.length > 0) {
    parts.push(
      `Instructions:\n${instructionLines
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n")}`
    );
  }

  if (meal.imageUrl || meal.imageStatus || meal.imageSource) {
    parts.push(
      [
        "Image Metadata:",
        meal.imageUrl ? `Image URL: ${meal.imageUrl}` : null,
        meal.imageSource ? `Image Source: ${meal.imageSource}` : null,
        meal.imageOriginalUrl
          ? `Original Image URL: ${meal.imageOriginalUrl}`
          : null,
        meal.imageAttribution
          ? `Image Attribution: ${meal.imageAttribution}`
          : null,
        meal.imageStatus ? `Image Status: ${meal.imageStatus}` : null,
        meal.imageLastUpdated
          ? `Image Last Updated: ${meal.imageLastUpdated}`
          : null,
        meal.imagePrompt ? `Image Prompt: ${meal.imagePrompt}` : null
      ]
        .filter(Boolean)
        .join("\n")
    );
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

  const v3Sections: string[] = ["Evidence-Aware v3 Summary:"];

  if (meal.safetyDisclaimer.trim()) {
    v3Sections.push(`Safety:\n${meal.safetyDisclaimer.trim()}`);
  }

  if (meal.evidenceNotes.length > 0) {
    v3Sections.push(
      `Evidence Notes:\n${bulletList(meal.evidenceNotes.slice(0, 3))}`
    );
  }

  if (meal.confidenceNotes.length > 0) {
    v3Sections.push(
      `Confidence Notes:\n${bulletList(meal.confidenceNotes.slice(0, 3))}`
    );
  }

  if (meal.guidanceBasis.length > 0) {
    v3Sections.push(
      `Guidance Basis:\n${guidanceBasisList(meal.guidanceBasis.slice(0, 3))}`
    );
  }

  if (v3Sections.length > 1) {
    parts.push(v3Sections.join("\n\n"));
  }

  const summary = parts.join("\n\n");

  if (summary.length <= NOTES_TOTAL_CHARACTER_LIMIT) {
    return summary;
  }

  return `${summary.slice(
    0,
    NOTES_TOTAL_CHARACTER_LIMIT - 48
  )}\n[Truncated for Notion rich_text limit]`;
}
