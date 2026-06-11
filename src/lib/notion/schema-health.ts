export interface NotionSchemaProperty {
  name: string;
  type: string;
}

export interface ExpectedMealField {
  key: string;
  label: string;
  aliases: string[];
  allowedTypes: string[];
  functionality: string;
  required: boolean;
}

export interface MissingMealField {
  label: string;
  expectedTypes: string[];
  functionality: string;
  required: boolean;
}

export interface IncompatibleMealField {
  label: string;
  actualName: string;
  actualType: string;
  expectedTypes: string[];
  functionality: string;
  required: boolean;
}

export interface MealSchemaHealth {
  ok: boolean;
  missing: MissingMealField[];
  incompatible: IncompatibleMealField[];
  warnings: string[];
}

export const expectedMealFields: ExpectedMealField[] = [
  field("calories", "Calories", ["Calories", "Energy (kcal)", "Energy Kcal"], ["number"], "daily and weekly calorie summaries"),
  field("protein", "Protein", ["Protein (g)", "Protein g", "Protein"], ["number"], "protein totals, targets, and trends"),
  field("carbs", "Carbs", ["Carbohydrates (g)", "Carbs (g)", "Carbs", "Carbohydrate (g)", "Carbohydrates"], ["number"], "carbohydrate nutrition display"),
  field("fat", "Fat", ["Fat (g)", "Total Fat (g)", "Fat"], ["number"], "fat nutrition display"),
  field("fiber", "Fiber", ["Fiber (g)", "Fibre (g)", "Fiber"], ["number"], "fiber totals, targets, and trends"),
  field("sodium", "Sodium", ["Sodium (mg)", "Sodium"], ["number"], "sodium target progress"),
  field("sugar", "Sugar", ["Sugar (g)", "Sugar", "Sugars (g)", "Total Sugars (g)", "Total Sugar (g)"], ["number"], "sugar nutrition display"),
  field("mealQualityScore", "Meal Quality Score", ["Meal Quality Score", "Quality Score"], ["number"], "saved quality summaries"),
  field("proteinScore", "Protein Score", ["Protein Score"], ["number"], "quality scorecard backfill"),
  field("fiberScore", "Fiber Score", ["Fiber Score"], ["number"], "quality scorecard backfill"),
  field("energyDensityScore", "Energy Density Score", ["Energy Density Score"], ["number"], "quality scorecard backfill"),
  field("processingScore", "Processing Score", ["Processing Score"], ["number"], "quality scorecard backfill"),
  field("nutritionConfidence", "Nutrition Confidence", ["Nutrition Confidence", "Nutrient Confidence"], ["select", "rich_text"], "saved low/medium/high confidence labels"),
  field("nutritionSource", "Nutrition Source", ["Nutrition Source", "Nutrition Data Source"], ["select", "rich_text"], "nutrition source mix indicators"),
  field("nutritionProvenance", "Nutrition Provenance", ["Nutrition Provenance", "Nutrition Source Notes"], ["select", "rich_text"], "nutrition provenance and backfill explanations"),
  field("mealDate", "Meal Date", ["Meal Date", "Date", "Logged At"], ["date"], "date-based dashboard grouping")
];

export function evaluateMealsSchemaHealth(
  properties: NotionSchemaProperty[]
): MealSchemaHealth {
  const missing: MissingMealField[] = [];
  const incompatible: IncompatibleMealField[] = [];

  for (const expected of expectedMealFields) {
    const actual = expected.aliases
      .map((alias) => properties.find((property) => property.name === alias))
      .find(Boolean);

    if (!actual) {
      missing.push({
        label: expected.label,
        expectedTypes: expected.allowedTypes,
        functionality: expected.functionality,
        required: expected.required
      });
      continue;
    }

    if (!expected.allowedTypes.includes(actual.type)) {
      incompatible.push({
        label: expected.label,
        actualName: actual.name,
        actualType: actual.type,
        expectedTypes: expected.allowedTypes,
        functionality: expected.functionality,
        required: expected.required
      });
    }
  }

  const warnings = [
    ...missing.map(
      (item) => `${item.label} missing; ${item.functionality} may be incomplete.`
    ),
    ...incompatible.map(
      (item) =>
        `${item.label} uses ${item.actualType}; expected ${item.expectedTypes.join(" or ")} for ${item.functionality}.`
    )
  ];

  return {
    ok: missing.length === 0 && incompatible.length === 0,
    missing,
    incompatible,
    warnings
  };
}

function field(
  key: string,
  label: string,
  aliases: string[],
  allowedTypes: string[],
  functionality: string
): ExpectedMealField {
  return {
    key,
    label,
    aliases,
    allowedTypes,
    functionality,
    required: false
  };
}
