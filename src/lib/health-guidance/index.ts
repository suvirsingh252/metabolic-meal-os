export {
  globalHealthSafetyRules,
  type HealthGuidancePrinciple
} from "@/src/lib/health-guidance/types";
export { diabetesGuidancePrinciples } from "@/src/lib/health-guidance/diabetes";
export { pcosGuidancePrinciples } from "@/src/lib/health-guidance/pcos";
export { canadaFoodGuidePrinciples } from "@/src/lib/health-guidance/canada-food-guide";

import { canadaFoodGuidePrinciples } from "@/src/lib/health-guidance/canada-food-guide";
import { diabetesGuidancePrinciples } from "@/src/lib/health-guidance/diabetes";
import { pcosGuidancePrinciples } from "@/src/lib/health-guidance/pcos";

export const healthGuidancePrinciples = [
  ...diabetesGuidancePrinciples,
  ...pcosGuidancePrinciples,
  ...canadaFoodGuidePrinciples
] as const;
