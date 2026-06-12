export interface NotionSchemaProperty {
  name: string;
  type: string;
  relationTarget?: {
    databaseId: string | null;
    dataSourceId: string | null;
  };
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

export interface NotionRelationTarget {
  databaseId: string;
  dataSourceId: string;
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
  field("nutritionConfidence", "Nutrition Confidence", ["Nutrition Confidence", "Nutrient Confidence"], ["select", "rich_text", "number"], "saved low/medium/high confidence labels"),
  field("nutritionSource", "Nutrition Source", ["Nutrition Source", "Nutrition Data Source"], ["select", "rich_text"], "nutrition source mix indicators"),
  field("nutritionProvenance", "Nutrition Provenance", ["Nutrition Provenance", "Nutrition Source Notes"], ["select", "rich_text"], "nutrition provenance and backfill explanations"),
  field("mealDate", "Meal Date", ["Meal Date", "Date", "Logged At"], ["date"], "date-based dashboard grouping")
];

const expectedFeedbackFields: ExpectedMealField[] = [
  field("feedbackEntry", "Feedback Entry", ["Feedback Entry"], ["title"], "feedback event titles"),
  field("energyAfter", "Energy After", ["Energy After"], ["select"], "post-meal energy summaries"),
  field("hungerLater", "Hunger Later", ["Hunger Later"], ["select"], "post-meal satiety summaries"),
  field("cravingsLater", "Cravings Later", ["Cravings Later"], ["checkbox"], "cravings feedback"),
  field("wouldRepeat", "Would Repeat", ["Would Repeat"], ["checkbox"], "repeat preference scoring"),
  field("notes", "Notes", ["Notes"], ["rich_text"], "feedback notes and family cookbook adjustments")
];

const expectedIngredientFields: ExpectedMealField[] = [
  field("nutrientAmountBasis", "Nutrient Amount Basis", ["Nutrient Amount Basis"], ["select", "rich_text"], "safe USDA nutrient projection basis"),
  field("nutrientBasisUnit", "Nutrient Basis Unit", ["Nutrient Basis Unit"], ["select", "rich_text"], "safe USDA nutrient projection basis"),
  field("protein", "Protein (g)", ["Protein (g)"], ["number"], "ingredient-level protein context"),
  field("fiber", "Fiber (g)", ["Fiber (g)"], ["number"], "ingredient-level fiber context"),
  field("carbs", "Carbohydrates (g)", ["Carbohydrates (g)"], ["number"], "ingredient-level carbohydrate context"),
  field("energy", "Energy (kcal)", ["Energy (kcal)"], ["number"], "ingredient-level calorie context")
];

const expectedIntakeFields: ExpectedMealField[] = [
  field("name", "Name", ["Name"], ["title"], "iOS shortcut intake titles"),
  field("status", "Status", ["Status"], ["select"], "intake processing status"),
  field("createdAt", "Created At", ["Created At"], ["date"], "intake creation timestamps"),
  field("url", "URL", ["URL"], ["url"], "shared recipe and social URLs"),
  field("rawText", "Raw Text", ["Raw Text"], ["rich_text"], "shared copied recipe text"),
  field("source", "Source", ["Source"], ["select", "rich_text"], "shortcut/source attribution"),
  field("classification", "Classification", ["Classification"], ["select", "rich_text"], "intake classification readback"),
  field("error", "Error", ["Error"], ["rich_text"], "intake error tracking")
];

export function evaluateMealsSchemaHealth(
  properties: NotionSchemaProperty[]
): MealSchemaHealth {
  return evaluateExpectedFields(properties, expectedMealFields);
}

export function evaluateFeedbackSchemaHealth(
  properties: NotionSchemaProperty[],
  mealsTarget: NotionRelationTarget
): MealSchemaHealth {
  const base = evaluateExpectedFields(properties, expectedFeedbackFields);
  const relation = findRelationToTarget(properties, mealsTarget, ["Meal"]);

  if (!relation) {
    base.missing.push({
      label: "Meal relation",
      expectedTypes: ["relation"],
      functionality: "linking feedback to saved meals for Today, Meal Detail, and recommendation learning",
      required: false
    });
    base.warnings.push(
      "Meal relation missing or targeting the wrong Meals database/data source; feedback will save but will not appear in meal-level learning."
    );
  }

  return {
    ...base,
    ok: base.missing.length === 0 && base.incompatible.length === 0
  };
}

export function evaluateIngredientsSchemaHealth(
  properties: NotionSchemaProperty[],
  mealsTarget: NotionRelationTarget
): MealSchemaHealth {
  const base = evaluateExpectedFields(properties, expectedIngredientFields);
  const relation = findRelationToTarget(properties, mealsTarget, ["Meals", "Meal"]);

  if (!relation) {
    base.missing.push({
      label: "Meal relation",
      expectedTypes: ["relation"],
      functionality: "linking saved ingredients back to source meals",
      required: false
    });
    base.warnings.push(
      "Meal/Meals relation missing or targeting the wrong Meals database/data source; ingredients will save without meal traceability."
    );
  }

  return {
    ...base,
    ok: base.missing.length === 0 && base.incompatible.length === 0
  };
}

export function evaluateIntakeSchemaHealth(
  properties: NotionSchemaProperty[]
): MealSchemaHealth {
  return evaluateExpectedFields(properties, expectedIntakeFields);
}

function evaluateExpectedFields(
  properties: NotionSchemaProperty[],
  expectedFields: ExpectedMealField[]
): MealSchemaHealth {
  const missing: MissingMealField[] = [];
  const incompatible: IncompatibleMealField[] = [];

  for (const expected of expectedFields) {
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

function findRelationToTarget(
  properties: NotionSchemaProperty[],
  target: NotionRelationTarget,
  preferredNames: string[]
) {
  const relationMatches = (property: NotionSchemaProperty) =>
    property.type === "relation" &&
    (property.relationTarget?.databaseId === target.databaseId ||
      property.relationTarget?.dataSourceId === target.dataSourceId);
  const preferred = preferredNames
    .map((name) => properties.find((property) => property.name === name))
    .find((property) => property && relationMatches(property));

  return preferred ?? properties.find(relationMatches) ?? null;
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
