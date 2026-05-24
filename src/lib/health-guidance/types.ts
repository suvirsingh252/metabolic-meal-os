import type { ApprovedSourceId } from "@/src/lib/sources/source-registry";

export interface HealthGuidancePrinciple {
  id: string;
  title: string;
  summary: string;
  appliesTo: string[];
  analysisUse: string[];
  safeLanguage: string[];
  prohibitedClaims: string[];
  sourceIds: ApprovedSourceId[];
}

export const globalHealthSafetyRules = [
  "Do not diagnose diabetes, prediabetes, insulin resistance, PCOS, or any other medical condition.",
  "Do not claim that food choices treat, cure, prevent, or reverse diabetes, PCOS, infertility, or metabolic disease.",
  "Do not replace clinician, registered dietitian, pharmacist, or other qualified health professional advice.",
  "Do not provide medication, supplement, fertility, insulin, or individualized clinical dosing advice.",
  "Use general food-pattern support language and encourage professional care for medical concerns."
] as const;
