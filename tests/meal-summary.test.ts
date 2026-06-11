import assert from "node:assert/strict";
import test from "node:test";
import { mapNotionPageToMealSummary } from "@/src/lib/notion/meal-summary";

test("Notion meal summary uses explicit Meal Date when present", () => {
  const meal = mapNotionPageToMealSummary({
    id: "meal-1",
    url: "https://notion.so/meal-1",
    created_time: "2026-05-20T10:00:00.000Z",
    properties: {
      "Meal Name": {
        type: "title",
        title: [{ plain_text: "Dal and rice" }]
      },
      "Meal Date": {
        type: "date",
        date: { start: "2026-05-18" }
      }
    }
  });

  assert.equal(meal?.createdAt, "2026-05-18");
});

test("Notion meal summary preserves explicit provenance while backfilling quality", () => {
  const meal = mapNotionPageToMealSummary({
    id: "meal-2",
    url: "https://notion.so/meal-2",
    created_time: "2026-05-20T10:00:00.000Z",
    properties: {
      "Meal Name": {
        type: "title",
        title: [{ plain_text: "Paneer bowl" }]
      },
      Notes: {
        type: "rich_text",
        rich_text: [
          {
            plain_text:
              "Scorecard:\n- Metabolic: 8/10\n- Protein: 7/10\n- Fiber: 6/10\n- Satiety: 8/10\n- Blood Sugar Risk: 3/10"
          }
        ]
      },
      "Nutrition Provenance": {
        type: "rich_text",
        rich_text: [{ plain_text: "manual review" }]
      }
    }
  });

  assert.equal(meal?.nutritionProvenance, "manual review");
  assert.equal(meal?.qualityScore, 74);
  assert.equal(meal?.proteinScore, 7);
});
