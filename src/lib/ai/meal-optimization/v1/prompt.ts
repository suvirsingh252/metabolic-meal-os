import type { MealAnalysisResult } from "@/src/lib/types/meal";
import type { OptimizationType } from "@/src/lib/ai/meal-optimization/v1/types";

export const mealOptimizationSystemPrompt = `
You receive a completed household meal analysis and return one focused optimization suggestion for a specific goal.

Core principle: minimal-change improvement. Suggest the smallest realistic changes that achieve the requested goal without westernizing, moralizing, or removing the dish's identity.

Guidelines:
- Preserve Indian food context and Atlantic Canadian comfort food context when present.
- Do not diagnose, treat, or claim to prevent medical conditions.
- Avoid moralizing food. Use neutral, practical language.
- Frame changes as "could help", "worth trying", or "an easy add". Never call foods "bad".
- Avoid calorie counting or macro obsession.
- Produce family-friendly outputs realistic for household cooking.
- Keep changes to 2-3 specific, immediately actionable items. Fewer is better.
- The headline should be one short plain-English sentence describing what this optimization achieves.
- The note field should cover a cultural, practical, or portion caveat if relevant — keep it to one sentence. Leave it as an empty string if nothing meaningful to add.

Optimization goal definitions:
- higher-protein: Add realistic protein sources or increase existing protein components without overhauling the dish.
- healthier: Improve the overall nutritional quality, satiety, or steadier energy with the single most impactful tweak.
- kid-friendly: Adjust texture, flavour intensity, or presentation to make the meal more appealing for children without a complete overhaul.
- budget-friendly: Substitute ingredients or adjust portions to maintain the meal's character at lower cost.

Return ONLY the JSON object matching the schema. No extra text.
`.trim();

const optimizationGoalDescriptions: Record<OptimizationType, string> = {
  "higher-protein": "higher protein — add realistic protein sources or increase existing protein",
  healthier: "healthier — improve nutritional quality, satiety, or steadier energy",
  "kid-friendly": "kid-friendly — adjust texture, flavour, or presentation for children",
  "budget-friendly": "budget-friendly — maintain the meal's character at lower cost"
};

export function formatOptimizationUserPrompt(
  analysis: MealAnalysisResult,
  optimizationType: OptimizationType
): string {
  const concerns = analysis.mainConcerns.slice(0, 3).join("; ") || "none listed";
  const cultural = analysis.culturalNotes?.trim() || "none";

  return `Optimize this meal for goal: ${optimizationGoalDescriptions[optimizationType]}

Meal: ${analysis.mealName}
Cuisine: ${analysis.cuisine}
Type: ${analysis.mealType}
Current verdict: ${analysis.quickVerdict}
Existing smallest change already suggested: ${analysis.minimalChangeVersion}
Scores — Protein: ${analysis.proteinScore}/10, Fiber: ${analysis.fiberScore}/10, Metabolic: ${analysis.metabolicScore}/10
Main concerns: ${concerns}
Cultural context: ${cultural}

Return JSON matching the schema.`;
}
