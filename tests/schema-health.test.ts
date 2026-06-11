import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMealsSchemaHealth } from "@/src/lib/notion/schema-health";

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
