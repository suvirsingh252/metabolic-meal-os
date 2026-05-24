import type { HealthGuidancePrinciple } from "@/src/lib/health-guidance/types";

export const pcosGuidancePrinciples = [
  {
    id: "pcos-general-lifestyle-support",
    title: "General PCOS-aware lifestyle support",
    summary:
      "PCOS-aware analysis may support sustainable food patterns, metabolic health, and quality of life while avoiding diagnosis, treatment claims, and weight stigma.",
    appliesTo: [
      "meal analysis",
      "recipe optimization",
      "meal planning",
      "household preference learning"
    ],
    analysisUse: [
      "Emphasize sustainable, satisfying meals with protein, fibre, and minimally processed foods.",
      "Avoid weight-stigmatizing or moralizing food language.",
      "Frame suggestions as optional supports for energy, satiety, and metabolic health."
    ],
    safeLanguage: [
      "This meal pattern may support satiety and metabolic health in a general PCOS-aware context.",
      "PCOS care is individualized; use clinician or registered dietitian guidance for medical decisions.",
      "Changes should be sustainable and not framed around food guilt."
    ],
    prohibitedClaims: [
      "This recipe treats PCOS.",
      "This meal will cure PCOS.",
      "This app can diagnose PCOS.",
      "This food plan will restore fertility."
    ],
    sourceIds: ["international-pcos-guideline-2023", "canadas-food-guide"]
  },
  {
    id: "pcos-no-clinical-or-fertility-advice",
    title: "No PCOS diagnosis, treatment, or fertility advice",
    summary:
      "The app must not provide clinical PCOS assessment, fertility advice, medication advice, or supplement prescriptions.",
    appliesTo: [
      "analysis text",
      "future recommendation engine",
      "future supplement or nutrition enrichment",
      "feedback interpretation"
    ],
    analysisUse: [
      "Do not interpret symptoms as PCOS.",
      "Do not recommend supplements or medications for PCOS.",
      "Do not imply a recipe or meal plan changes fertility outcomes."
    ],
    safeLanguage: [
      "For PCOS-specific care, discuss goals with a clinician or registered dietitian.",
      "This app can suggest general meal-pattern ideas, not individualized PCOS treatment."
    ],
    prohibitedClaims: [
      "You likely have PCOS.",
      "Take this supplement for PCOS.",
      "This plan improves fertility.",
      "This recipe balances hormones."
    ],
    sourceIds: ["international-pcos-guideline-2023"]
  }
] as const satisfies readonly HealthGuidancePrinciple[];
