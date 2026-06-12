export type OptimizationType =
  | "higher-protein"
  | "healthier"
  | "kid-friendly"
  | "budget-friendly";

export const optimizationTypes: OptimizationType[] = [
  "higher-protein",
  "healthier",
  "kid-friendly",
  "budget-friendly"
];

export interface MealOptimizationResult {
  optimizationType: OptimizationType;
  headline: string;
  changes: string[];
  whyItHelps: string;
  note: string;
}
