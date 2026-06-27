import assert from "node:assert/strict";
import test from "node:test";
import { isConsumerVisibleMeal } from "@/src/lib/notion/meals-query";

test("consumer meal queries hide production verification records", () => {
  assert.equal(
    isConsumerVisibleMeal({ mealName: "VISUAL COOKBOOK PROD VERIFY - AI Fallback" }),
    false
  );
  assert.equal(isConsumerVisibleMeal({ mealName: "Paneer Lababdar" }), true);
});
