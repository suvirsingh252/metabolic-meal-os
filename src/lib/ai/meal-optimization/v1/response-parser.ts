import {
  optimizationTypes,
  type MealOptimizationResult
} from "@/src/lib/ai/meal-optimization/v1/types";

export function parseOptimizationResponse(outputText: string): MealOptimizationResult {
  const parsed = JSON.parse(outputText) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Optimization response is not an object.");
  }

  const obj = parsed as Record<string, unknown>;

  if (!optimizationTypes.includes(obj.optimizationType as never)) {
    throw new Error(
      `Invalid optimizationType: ${String(obj.optimizationType)}`
    );
  }

  if (typeof obj.headline !== "string" || obj.headline.trim().length === 0) {
    throw new Error("Optimization response missing headline.");
  }

  if (
    !Array.isArray(obj.changes) ||
    obj.changes.length === 0 ||
    !obj.changes.every((c) => typeof c === "string")
  ) {
    throw new Error("Optimization response missing changes array.");
  }

  if (typeof obj.whyItHelps !== "string" || obj.whyItHelps.trim().length === 0) {
    throw new Error("Optimization response missing whyItHelps.");
  }

  if (typeof obj.note !== "string") {
    throw new Error("Optimization response missing note.");
  }

  return {
    optimizationType: obj.optimizationType as MealOptimizationResult["optimizationType"],
    headline: obj.headline,
    changes: obj.changes as string[],
    whyItHelps: obj.whyItHelps,
    note: obj.note
  };
}
