import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Today meal cards link to internal meal detail pages", () => {
  const source = readFileSync("src/app/today/today-client.tsx", "utf8");

  assert.match(source, /href=\{getMealDetailPath\(recommendation\.meal\.id\)\}/);
  assert.doesNotMatch(source, /href=\{recommendation\.meal\.url\}/);
});

test("Meals list items link to internal meal detail pages", () => {
  const source = readFileSync("src/app/meals/page.tsx", "utf8");

  assert.match(source, /href=\{getMealDetailPath\(meal\.id\)\}/);
  assert.match(source, /href=\{meal\.url\}/);
});
