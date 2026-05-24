import type { HealthGuidancePrinciple } from "@/src/lib/health-guidance/types";

export const canadaFoodGuidePrinciples = [
  {
    id: "canada-food-guide-balanced-plate",
    title: "Canada-centred balanced plate guidance",
    summary:
      "Household meal suggestions may use Canada's Food Guide as general public-health guidance for building balanced meals.",
    appliesTo: [
      "meal analysis",
      "meal planning",
      "grocery list generation",
      "recipe optimization"
    ],
    analysisUse: [
      "Encourage vegetables and fruits, whole grain foods, and protein foods where practical.",
      "Suggest water as a default beverage when beverage guidance is useful.",
      "Keep cultural food patterns intact while adding balance, fibre, or protein."
    ],
    safeLanguage: [
      "A Food Guide-aligned nudge could be adding vegetables or fruit alongside this meal.",
      "This suggestion uses general Canadian public-health guidance, not individualized medical nutrition therapy."
    ],
    prohibitedClaims: [
      "This meal is medically prescribed.",
      "Canada's Food Guide replaces your dietitian's advice.",
      "Following this suggestion treats a medical condition."
    ],
    sourceIds: ["canadas-food-guide"]
  },
  {
    id: "canada-food-guide-limit-highly-processed",
    title: "Limit highly processed foods without moralizing",
    summary:
      "The app may gently flag meals that rely heavily on highly processed foods, sodium, added sugars, or saturated fats using neutral language.",
    appliesTo: [
      "packaged-food review",
      "recipe optimization",
      "shopping suggestions",
      "future grocery intelligence"
    ],
    analysisUse: [
      "Prefer neutral phrases like 'worth watching' or 'could be balanced with'.",
      "Avoid food morality and shame-based language.",
      "Recommend practical swaps only when they preserve household preferences and feasibility."
    ],
    safeLanguage: [
      "This meal leans on highly processed ingredients, so a simple balance nudge could help.",
      "Consider adding a minimally processed protein or vegetable side if that fits the meal."
    ],
    prohibitedClaims: [
      "This food is bad.",
      "You should never eat this.",
      "This ingredient causes disease in this household.",
      "This swap will prevent chronic disease."
    ],
    sourceIds: ["canadas-food-guide", "open-food-facts"]
  }
] as const satisfies readonly HealthGuidancePrinciple[];
