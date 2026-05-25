import type { MealNutritionEstimate } from "@/src/lib/types/meal";

interface FreeTextNutritionRule {
  id: string;
  label: string;
  patterns: RegExp[];
  calories: number;
  protein: number;
  fiber: number;
  primaryFood: boolean;
}

const freeTextNutritionRules: FreeTextNutritionRule[] = [
  {
    id: "paratha",
    label: "1 paratha/parantha",
    patterns: [/\bpara(?:n)?tha\b/i, /\bparatha\b/i, /\bparantha\b/i],
    calories: 260,
    protein: 6,
    fiber: 4,
    primaryFood: true
  },
  {
    id: "gobi",
    label: "gobi/cauliflower filling",
    patterns: [/\bgobi\b/i, /\bcauliflower\b/i],
    calories: 25,
    protein: 2,
    fiber: 2,
    primaryFood: false
  },
  {
    id: "butter",
    label: "small butter serving",
    patterns: [/\bbutter\b/i, /\bmakhan\b/i],
    calories: 45,
    protein: 0,
    fiber: 0,
    primaryFood: false
  },
  {
    id: "eggs",
    label: "2 eggs",
    patterns: [/\beggs?\b/i],
    calories: 140,
    protein: 12,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "chicken-breast",
    label: "cooked chicken breast serving",
    patterns: [/\bchicken breast\b/i, /\bgrilled chicken\b/i],
    calories: 165,
    protein: 31,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "paneer",
    label: "paneer serving",
    patterns: [/\bpaneer\b/i],
    calories: 260,
    protein: 14,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "dal",
    label: "dal/lentils serving",
    patterns: [/\bdal\b/i, /\bdaal\b/i, /\blentils?\b/i],
    calories: 180,
    protein: 12,
    fiber: 8,
    primaryFood: true
  },
  {
    id: "rice",
    label: "cooked rice serving",
    patterns: [/\brice\b/i, /\bchawal\b/i],
    calories: 205,
    protein: 4,
    fiber: 1,
    primaryFood: true
  },
  {
    id: "yogurt",
    label: "plain yogurt/curd serving",
    patterns: [/\byogurt\b/i, /\byoghurt\b/i, /\bcurd\b/i, /\bdahi\b/i],
    calories: 100,
    protein: 8,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "roti",
    label: "1 roti/chapati",
    patterns: [/\broti\b/i, /\bchapati\b/i],
    calories: 120,
    protein: 4,
    fiber: 3,
    primaryFood: true
  },
  {
    id: "oats",
    label: "oats serving",
    patterns: [/\boats?\b/i, /\boatmeal\b/i],
    calories: 150,
    protein: 5,
    fiber: 4,
    primaryFood: true
  },
  {
    id: "salad-vegetables",
    label: "salad/vegetables serving",
    patterns: [/\bsalad\b/i, /\bvegetables?\b/i, /\bveggies\b/i],
    calories: 40,
    protein: 2,
    fiber: 3,
    primaryFood: true
  }
];

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

export function estimateFreeTextNutrition(
  description: string
): MealNutritionEstimate | null {
  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    return null;
  }

  const matchedRules = freeTextNutritionRules.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(normalizedDescription))
  );

  if (
    matchedRules.length === 0 ||
    !matchedRules.some((rule) => rule.primaryFood)
  ) {
    return null;
  }

  const totals = matchedRules.reduce(
    (accumulator, rule) => ({
      calories: accumulator.calories + rule.calories,
      protein: accumulator.protein + rule.protein,
      fiber: accumulator.fiber + rule.fiber
    }),
    { calories: 0, protein: 0, fiber: 0 }
  );
  const matchedComponents = matchedRules.map((rule) => rule.label);

  return {
    totals: {
      calories: roundToOne(totals.calories),
      protein: roundToOne(totals.protein),
      carbs: null,
      fat: null,
      fiber: roundToOne(totals.fiber),
      sodium: null,
      sugar: null
    },
    confidence: matchedRules.length >= 2 ? "medium" : "low",
    provenance: `Estimated from free-text meal description using conservative component assumptions: ${matchedComponents.join(" + ")}. Serving sizes are assumed typical household portions; review before saving.`,
    source: "estimated"
  };
}

export const freeTextNutritionEstimateRuleLabels = freeTextNutritionRules.map(
  (rule) => rule.label
);
