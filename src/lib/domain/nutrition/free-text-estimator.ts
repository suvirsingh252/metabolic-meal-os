import type { MealNutritionEstimate } from "@/src/lib/types/meal";

interface FreeTextNutritionRule {
  id: string;
  label: string;
  patterns: RegExp[];
  quantityPatterns?: RegExp[];
  calories: number;
  protein: number;
  fiber: number;
  primaryFood: boolean;
}

const freeTextNutritionRules: FreeTextNutritionRule[] = [
  {
    id: "paratha",
    label: "1 paratha/parantha",
    patterns: [/\bpara(?:n)?thas?\b/i, /\bparathas?\b/i, /\bparanthas?\b/i],
    quantityPatterns: [/\bpara(?:n)?thas?\b/i, /\bparathas?\b/i, /\bparanthas?\b/i],
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
    quantityPatterns: [/\bbutter\b/i, /\bmakhan\b/i],
    calories: 45,
    protein: 0,
    fiber: 0,
    primaryFood: false
  },
  {
    id: "eggs",
    label: "1 egg",
    patterns: [/\beggs?\b/i],
    quantityPatterns: [/\beggs?\b/i],
    calories: 70,
    protein: 6,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "chicken-breast",
    label: "cooked chicken serving",
    patterns: [/\bchicken(?:\s+breast)?\b/i, /\bgrilled chicken\b/i],
    quantityPatterns: [/\bchicken(?:\s+breasts?)?\b/i, /\bgrilled chicken\b/i],
    calories: 165,
    protein: 31,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "paneer",
    label: "paneer serving",
    patterns: [/\bpaneer\b/i],
    quantityPatterns: [/\bpaneer\b/i],
    calories: 260,
    protein: 14,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "dal",
    label: "dal/lentils serving",
    patterns: [/\bdal\b/i, /\bdaal\b/i, /\blentils?\b/i],
    quantityPatterns: [/\bdal\b/i, /\bdaal\b/i, /\blentils?\b/i],
    calories: 180,
    protein: 12,
    fiber: 8,
    primaryFood: true
  },
  {
    id: "rice",
    label: "cooked rice serving",
    patterns: [/\brice\b/i, /\bchawal\b/i],
    quantityPatterns: [/\brice\b/i, /\bchawal\b/i],
    calories: 205,
    protein: 4,
    fiber: 1,
    primaryFood: true
  },
  {
    id: "yogurt",
    label: "plain yogurt/curd serving",
    patterns: [/\byogurt\b/i, /\byoghurt\b/i, /\bcurd\b/i, /\bdahi\b/i],
    quantityPatterns: [/\byogurt\b/i, /\byoghurt\b/i, /\bcurd\b/i, /\bdahi\b/i],
    calories: 100,
    protein: 8,
    fiber: 0,
    primaryFood: true
  },
  {
    id: "roti",
    label: "1 roti/chapati",
    patterns: [/\brotis?\b/i, /\bchapatis?\b/i],
    quantityPatterns: [/\brotis?\b/i, /\bchapatis?\b/i],
    calories: 120,
    protein: 4,
    fiber: 3,
    primaryFood: true
  },
  {
    id: "oats",
    label: "oats serving",
    patterns: [/\boats?\b/i, /\boatmeal\b/i],
    quantityPatterns: [/\boats?\b/i, /\boatmeal\b/i],
    calories: 150,
    protein: 5,
    fiber: 4,
    primaryFood: true
  },
  {
    id: "salad-vegetables",
    label: "salad/vegetables serving",
    patterns: [/\bsalad\b/i, /\bvegetables?\b/i, /\bveggies\b/i],
    quantityPatterns: [/\bsalad\b/i, /\bvegetables?\b/i, /\bveggies\b/i],
    calories: 40,
    protein: 2,
    fiber: 3,
    primaryFood: true
  },
  {
    id: "toast",
    label: "toast serving",
    patterns: [/\btoast\b/i],
    quantityPatterns: [/\btoast\b/i],
    calories: 80,
    protein: 3,
    fiber: 2,
    primaryFood: true
  },
  {
    id: "wrap",
    label: "wrap/roti roll serving",
    patterns: [/\bwraps?\b/i, /\brolls?\b/i],
    quantityPatterns: [/\bwraps?\b/i, /\brolls?\b/i],
    calories: 170,
    protein: 5,
    fiber: 3,
    primaryFood: true
  },
  {
    id: "curry",
    label: "leftover curry serving",
    patterns: [/\bcurr(?:y|ies)\b/i, /\bsabzi\b/i, /\bsubzi\b/i],
    quantityPatterns: [/\bcurr(?:y|ies)\b/i, /\bsabzi\b/i, /\bsubzi\b/i],
    calories: 180,
    protein: 6,
    fiber: 4,
    primaryFood: true
  }
];

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function emptyTotals(): MealNutritionEstimate["totals"] {
  return {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sodium: null,
    sugar: null
  };
}

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5
};

function findQuantityBeforeTerm(description: string, termPattern: RegExp) {
  const source = termPattern.source.replace(/^\\b/, "");
  const quantityPattern = new RegExp(
    `\\b(?:(half|one|two|three|four|five)|(\\d+(?:\\.\\d+)?))\\s+(?:a\\s+|an\\s+)?(?:small\\s+|large\\s+)?(?:bowl\\s+of\\s+)?(?:(?!(?:and|with|plus)\\b)[a-z-]+\\s+){0,2}${source}`,
    "i"
  );
  const match = description.match(quantityPattern);

  if (!match) {
    return null;
  }

  if (match[1] === "half") {
    return 0.5;
  }

  if (match[1]) {
    return numberWords[match[1]] ?? null;
  }

  return match[2] ? Number(match[2]) : null;
}

function parseComponentQuantity(
  description: string,
  rule: FreeTextNutritionRule
) {
  if (rule.id === "gobi") {
    for (const pattern of [/\bpara(?:n)?thas?\b/i, /\bparathas?\b/i, /\bparanthas?\b/i]) {
      const quantity = findQuantityBeforeTerm(description, pattern);

      if (quantity !== null && Number.isFinite(quantity) && quantity > 0) {
        return {
          multiplier: quantity,
          reason: `quantity parsed as ${quantity} for gobi paratha filling`
        };
      }
    }
  }

  const patterns = rule.quantityPatterns ?? rule.patterns;

  for (const pattern of patterns) {
    const quantity = findQuantityBeforeTerm(description, pattern);

    if (quantity !== null && Number.isFinite(quantity) && quantity > 0) {
      return {
        multiplier: quantity,
        reason: `quantity parsed as ${quantity} for ${rule.label}`
      };
    }
  }

  if (
    rule.id === "dal" &&
    /\bhalf\s+(?:a\s+)?bowl(?:\s+of)?\s+(?:dal|daal|lentils?)\b/i.test(
      description
    )
  ) {
    return {
      multiplier: 0.5,
      reason: "half bowl parsed for dal/lentils"
    };
  }

  if (
    rule.id === "dal" &&
    /\b(?:one|1)\s+bowl(?:\s+of)?\s+(?:dal|daal|lentils?)\b/i.test(description)
  ) {
    return {
      multiplier: 1,
      reason: "one bowl parsed for dal/lentils"
    };
  }

  return {
    multiplier: 1,
    reason: `typical serving assumed for ${rule.label}`
  };
}

function hasWithoutButter(description: string) {
  return /\b(?:without|no)\s+(?:butter|makhan)\b/i.test(description);
}

function hasExtraButter(description: string) {
  return /\bextra\s+(?:butter|makhan)\b/i.test(description);
}

function hasExplicitButter(description: string) {
  return /\b(?:with|add|added|has)\s+(?:extra\s+)?(?:butter|makhan)\b/i.test(
    description
  );
}

function parseGlobalServingSize(description: string) {
  if (/\blarge\b/i.test(description)) {
    return {
      multiplier: 1.5,
      assumption: "large portion parsed as 1.5x for primary components"
    };
  }

  if (/\bsmall\b/i.test(description)) {
    return {
      multiplier: 0.75,
      assumption: "small portion parsed as 0.75x for primary components"
    };
  }

  return {
    multiplier: 1,
    assumption: "typical household portion assumed"
  };
}

function buildProvenance({
  matchedComponents,
  servingSizeAssumptions,
  quantityMultipliers,
  confidence
}: {
  matchedComponents: string[];
  servingSizeAssumptions: string[];
  quantityMultipliers: NonNullable<
    MealNutritionEstimate["assumptions"]
  >["quantityMultipliers"];
  confidence: MealNutritionEstimate["confidence"];
}) {
  const quantityNotes = quantityMultipliers
    .filter((item) => item.multiplier !== 1)
    .map((item) => `${item.multiplier}x for ${item.component}`);

  return [
    `Estimated from free-text meal description using conservative assumptions: ${matchedComponents.join(" + ")}.`,
    servingSizeAssumptions.length
      ? `Serving-size assumptions: ${servingSizeAssumptions.join("; ")}.`
      : null,
    quantityNotes.length
      ? `Quantity multiplier applied: ${quantityNotes.join(", ")}.`
      : null,
    `Confidence: ${confidence}. Review before saving; only calories, protein, and fiber are estimated.`
  ]
    .filter(Boolean)
    .join(" ");
}

export function estimateFreeTextNutrition(
  description: string
): MealNutritionEstimate | null {
  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    return null;
  }

  const withoutButter = hasWithoutButter(normalizedDescription);
  const matchedRules = freeTextNutritionRules.filter((rule) => {
    if (rule.id === "butter" && withoutButter) {
      return false;
    }

    return rule.patterns.some((pattern) => pattern.test(normalizedDescription));
  });

  if (
    matchedRules.length === 0 ||
    !matchedRules.some((rule) => rule.primaryFood)
  ) {
    return null;
  }

  const globalServing = parseGlobalServingSize(normalizedDescription);
  const matchedComponents: string[] = [];
  const servingSizeAssumptions = [globalServing.assumption];
  const quantityMultipliers: NonNullable<
    MealNutritionEstimate["assumptions"]
  >["quantityMultipliers"] = [];

  const totals = matchedRules.reduce(
    (accumulator, rule) => {
      const parsedQuantity = parseComponentQuantity(normalizedDescription, rule);
      const butterMultiplier =
        rule.id === "butter" && hasExtraButter(normalizedDescription) ? 2 : 1;
      const sizeMultiplier = rule.primaryFood ? globalServing.multiplier : 1;
      const multiplier =
        parsedQuantity.multiplier * butterMultiplier * sizeMultiplier;

      if (rule.id === "butter") {
        servingSizeAssumptions.push(
          butterMultiplier > 1
            ? "extra butter parsed as 2 small servings"
            : "butter parsed as 1 small serving"
        );
      }

      if (withoutButter && rule.id !== "butter") {
        servingSizeAssumptions.push("without butter respected");
      }

      matchedComponents.push(
        multiplier === 1 ? rule.label : `${roundToOne(multiplier)} x ${rule.label}`
      );
      quantityMultipliers.push({
        component: rule.label,
        multiplier: roundToOne(multiplier),
        reason:
          butterMultiplier > 1
            ? "extra butter parsed"
            : parsedQuantity.reason
      });

      return {
        calories: accumulator.calories + rule.calories * multiplier,
        protein: accumulator.protein + rule.protein * multiplier,
        fiber: accumulator.fiber + rule.fiber * multiplier
      };
    },
    { calories: 0, protein: 0, fiber: 0 }
  );
  const confidence = matchedRules.length >= 2 ? "medium" : "low";
  const baseTotals: MealNutritionEstimate["totals"] = {
    ...emptyTotals(),
    calories: roundToOne(totals.calories),
    protein: roundToOne(totals.protein),
    fiber: roundToOne(totals.fiber)
  };

  return {
    totals: baseTotals,
    confidence,
    provenance: buildProvenance({
      matchedComponents,
      servingSizeAssumptions: Array.from(new Set(servingSizeAssumptions)),
      quantityMultipliers,
      confidence
    }),
    assumptions: {
      matchedComponents,
      servingSizeAssumptions: Array.from(new Set(servingSizeAssumptions)),
      quantityMultipliers,
      baseTotals,
      servingMultiplier: 1,
      butterInferred: !withoutButter && (hasExplicitButter(normalizedDescription) || hasExtraButter(normalizedDescription)),
      confidence,
      reviewBeforeSave:
        "Review serving assumptions before saving; estimates cover calories, protein, and fiber only."
    },
    source: "estimated"
  };
}

export const freeTextNutritionEstimateRuleLabels = freeTextNutritionRules.map(
  (rule) => rule.label
);
