import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateFeedbackSchemaHealth,
  evaluateIngredientsSchemaHealth,
  evaluateIntakeSchemaHealth,
  evaluateMealsSchemaHealth
} from "@/src/lib/notion/schema-health";
import { getPlannerSchemaDiagnostics } from "@/src/lib/notion/meal-plan";
import {
  buildHouseholdFilter,
  findHouseholdIdProperty
} from "@/src/lib/notion/meals-query";

test("schema health reports missing optional meal fields", () => {
  const health = evaluateMealsSchemaHealth([
    { name: "Calories", type: "number" },
    { name: "Protein (g)", type: "number" }
  ]);

  assert.equal(health.ok, false);
  assert.ok(health.missing.some((field) => field.label === "Fiber"));
  assert.ok(
    health.warnings.some((warning) =>
      warning.includes("Nutrition Source missing")
    )
  );
});

test("schema health reports incompatible property types", () => {
  const health = evaluateMealsSchemaHealth([
    { name: "Calories", type: "rich_text" },
    { name: "Nutrition Source", type: "select" }
  ]);

  assert.equal(health.ok, false);
  assert.deepEqual(health.incompatible[0], {
    label: "Calories",
    actualName: "Calories",
    actualType: "rich_text",
    expectedTypes: ["number"],
    functionality: "daily and weekly calorie summaries",
    required: false
  });
});

test("schema health accepts concise nutrition aliases", () => {
  const health = evaluateMealsSchemaHealth([
    { name: "Carbs", type: "number" },
    { name: "Sugar", type: "number" }
  ]);

  assert.equal(health.missing.some((field) => field.label === "Carbs"), false);
  assert.equal(health.missing.some((field) => field.label === "Sugar"), false);
});

test("schema health accepts numeric nutrition confidence", () => {
  const health = evaluateMealsSchemaHealth([
    { name: "Nutrition Confidence", type: "number" }
  ]);

  assert.equal(
    health.incompatible.some((field) => field.label === "Nutrition Confidence"),
    false
  );
});

test("meal query household filter uses active data source properties", () => {
  const parentDatabase = {
    properties: {}
  };
  const activeDataSource = {
    properties: {
      "Household ID": {
        type: "rich_text"
      }
    }
  };

  assert.equal(findHouseholdIdProperty(parentDatabase), undefined);
  assert.equal(findHouseholdIdProperty(activeDataSource), "Household ID");
  assert.deepEqual(buildHouseholdFilter("Household ID", "household-main"), {
    property: "Household ID",
    rich_text: {
      equals: "household-main"
    }
  });
});

test("feedback schema health detects missing or wrong Meal relation", () => {
  const target = {
    databaseId: "meals-db",
    dataSourceId: "meals-source"
  };
  const missing = evaluateFeedbackSchemaHealth(
    [
      { name: "Feedback Entry", type: "title" },
      { name: "Energy After", type: "select" },
      { name: "Hunger Later", type: "select" },
      { name: "Cravings Later", type: "checkbox" },
      { name: "Would Repeat", type: "checkbox" },
      { name: "Notes", type: "rich_text" }
    ],
    target
  );
  const wrong = evaluateFeedbackSchemaHealth(
    [
      { name: "Feedback Entry", type: "title" },
      { name: "Energy After", type: "select" },
      { name: "Hunger Later", type: "select" },
      { name: "Cravings Later", type: "checkbox" },
      { name: "Would Repeat", type: "checkbox" },
      { name: "Notes", type: "rich_text" },
      {
        name: "Meal",
        type: "relation",
        relationTarget: { databaseId: "other-db", dataSourceId: "other-source" }
      }
    ],
    target
  );
  const ok = evaluateFeedbackSchemaHealth(
    [
      { name: "Feedback Entry", type: "title" },
      { name: "Energy After", type: "select" },
      { name: "Hunger Later", type: "select" },
      { name: "Cravings Later", type: "checkbox" },
      { name: "Would Repeat", type: "checkbox" },
      { name: "Notes", type: "rich_text" },
      {
        name: "Meal",
        type: "relation",
        relationTarget: { databaseId: null, dataSourceId: "meals-source" }
      }
    ],
    target
  );

  assert.equal(missing.ok, false);
  assert.equal(wrong.ok, false);
  assert.ok(missing.warnings.some((warning) => warning.includes("Meal relation")));
  assert.equal(ok.missing.some((field) => field.label === "Meal relation"), false);
});

test("ingredients schema health detects meal relation and nutrient basis gaps", () => {
  const target = {
    databaseId: "meals-db",
    dataSourceId: "meals-source"
  };
  const health = evaluateIngredientsSchemaHealth(
    [
      { name: "Protein (g)", type: "number" },
      {
        name: "Meals",
        type: "relation",
        relationTarget: { databaseId: "other-db", dataSourceId: "other-source" }
      }
    ],
    target
  );
  const ok = evaluateIngredientsSchemaHealth(
    [
      { name: "Nutrient Amount Basis", type: "select" },
      { name: "Nutrient Basis Unit", type: "rich_text" },
      { name: "Protein (g)", type: "number" },
      { name: "Fiber (g)", type: "number" },
      { name: "Carbohydrates (g)", type: "number" },
      { name: "Energy (kcal)", type: "number" },
      {
        name: "Meals",
        type: "relation",
        relationTarget: { databaseId: "meals-db", dataSourceId: null }
      }
    ],
    target
  );

  assert.equal(health.ok, false);
  assert.ok(
    health.missing.some((field) => field.label === "Nutrient Amount Basis")
  );
  assert.ok(health.missing.some((field) => field.label === "Meal relation"));
  assert.equal(ok.ok, true);
});

test("intake schema health checks required storage fields", () => {
  const missing = evaluateIntakeSchemaHealth([
    { name: "Name", type: "title" },
    { name: "Status", type: "select" }
  ]);
  const ok = evaluateIntakeSchemaHealth([
    { name: "Name", type: "title" },
    { name: "Status", type: "select" },
    { name: "Created At", type: "date" },
    { name: "URL", type: "url" },
    { name: "Raw Text", type: "rich_text" },
    { name: "Source", type: "select" },
    { name: "Classification", type: "rich_text" },
    { name: "Error", type: "rich_text" }
  ]);

  assert.equal(missing.ok, false);
  assert.ok(missing.missing.some((field) => field.label === "Created At"));
  assert.equal(ok.ok, true);
});

test("planner schema diagnostics report missing planner config safely", async () => {
  const previousDatabaseId = process.env.NOTION_MEAL_PLAN_DATABASE_ID;
  const previousSourceId = process.env.NOTION_MEAL_PLAN_SOURCE_ID;

  delete process.env.NOTION_MEAL_PLAN_DATABASE_ID;
  delete process.env.NOTION_MEAL_PLAN_SOURCE_ID;

  try {
    const diagnostics = await getPlannerSchemaDiagnostics();

    assert.equal(diagnostics.key, "planner");
    assert.equal("ok" in diagnostics && diagnostics.ok, false);
  } finally {
    if (previousDatabaseId) {
      process.env.NOTION_MEAL_PLAN_DATABASE_ID = previousDatabaseId;
    }

    if (previousSourceId) {
      process.env.NOTION_MEAL_PLAN_SOURCE_ID = previousSourceId;
    }
  }
});
