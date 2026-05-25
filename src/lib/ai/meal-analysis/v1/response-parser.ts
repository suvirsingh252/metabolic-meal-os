import { validateMealAnalysisResult } from "@/src/lib/domain/meal/validation";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

export function parseMealAnalysisResponse(outputText: string): MealAnalysisResult {
  const parsed = JSON.parse(outputText) as unknown;
  const validated = validateMealAnalysisResult(parsed);

  if (!validated.success || !validated.data) {
    throw new Error(
      `Meal analysis response failed validation: ${validated.errors.join("; ")}`
    );
  }

  return validated.data;
}
