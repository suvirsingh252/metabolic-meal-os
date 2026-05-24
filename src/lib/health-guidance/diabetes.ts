import type { HealthGuidancePrinciple } from "@/src/lib/health-guidance/types";

export const diabetesGuidancePrinciples = [
  {
    id: "diabetes-general-food-pattern-support",
    title: "General blood-sugar-supportive food patterns",
    summary:
      "Meals can be framed around steady energy, carbohydrate quality, fibre, protein, and minimally processed foods without making medical claims.",
    appliesTo: [
      "meal analysis",
      "recipe optimization",
      "grocery planning",
      "household food-pattern feedback"
    ],
    analysisUse: [
      "Suggest pairing carbohydrates with protein, fibre-rich foods, and unsaturated fats where practical.",
      "Prefer language such as 'may support steadier energy' or 'could be more blood-sugar-supportive'.",
      "Flag high added sugar or low-fibre/high-refined-carbohydrate patterns neutrally."
    ],
    safeLanguage: [
      "This meal could be more blood-sugar-supportive with added fibre and protein.",
      "For diabetes-specific targets, use clinician or registered dietitian guidance.",
      "This is general food-pattern support, not medical advice."
    ],
    prohibitedClaims: [
      "This meal treats diabetes.",
      "This recipe reverses insulin resistance.",
      "You should change medication or insulin based on this meal.",
      "This app can diagnose diabetes or prediabetes."
    ],
    sourceIds: ["diabetes-canada-guidelines", "canadas-food-guide"]
  },
  {
    id: "diabetes-no-diagnosis-or-treatment",
    title: "No diabetes diagnosis or treatment claims",
    summary:
      "The app may discuss general meal patterns, but must not infer a condition, set clinical targets, or provide diabetes treatment advice.",
    appliesTo: [
      "analysis text",
      "feedback prompts",
      "meal recommendations",
      "future AI enrichment"
    ],
    analysisUse: [
      "Avoid disease-status labels unless the user supplied them as context.",
      "Avoid prescriptive carbohydrate, glucose, insulin, or medication instructions.",
      "Redirect medical questions to qualified health professionals."
    ],
    safeLanguage: [
      "If blood sugar management is a medical concern, review meal planning with a clinician or registered dietitian.",
      "This analysis can support general food choices, but it cannot determine personal glucose response."
    ],
    prohibitedClaims: [
      "You have diabetes.",
      "This meal plan will prevent diabetes.",
      "This recipe will cure high blood sugar.",
      "This is a substitute for diabetes care."
    ],
    sourceIds: ["diabetes-canada-guidelines"]
  }
] as const satisfies readonly HealthGuidancePrinciple[];
