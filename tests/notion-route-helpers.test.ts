import assert from "node:assert/strict";
import test from "node:test";
import {
  getDatabaseTitle,
  getNotionPageUrl,
  getPrimaryDataSourceId,
  isRecord,
  validationError
} from "@/src/lib/notion/route-helpers";

test("isRecord accepts plain objects and rejects arrays and null", () => {
  assert.equal(isRecord({ a: 1 }), true);
  assert.equal(isRecord([]), false);
  assert.equal(isRecord(null), false);
  assert.equal(isRecord("string"), false);
});

test("getPrimaryDataSourceId returns the first data source id", () => {
  const database = { data_sources: [{ id: "ds_123" }] };
  assert.equal(getPrimaryDataSourceId(database), "ds_123");
});

test("getPrimaryDataSourceId throws the default message when missing", () => {
  assert.throws(() => getPrimaryDataSourceId({ data_sources: [] }), {
    message: "Database did not return a queryable data source."
  });
});

test("getPrimaryDataSourceId uses a caller-provided error message", () => {
  assert.throws(
    () =>
      getPrimaryDataSourceId(
        {},
        "Ingredients database did not return a queryable data source."
      ),
    { message: "Ingredients database did not return a queryable data source." }
  );
});

test("getPrimaryDataSourceId rejects non-record and empty data sources", () => {
  assert.throws(() => getPrimaryDataSourceId({ data_sources: [null] }));
  assert.throws(() => getPrimaryDataSourceId({ data_sources: ["not-a-record"] }));
  assert.throws(() => getPrimaryDataSourceId(null));
});

test("getNotionPageUrl returns the url or throws when absent", () => {
  assert.equal(getNotionPageUrl({ id: "p1", url: "https://notion.so/p1" }), "https://notion.so/p1");
  assert.throws(() => getNotionPageUrl({ id: "p2" }), {
    message: "Notion did not return a page URL for page p2."
  });
});

test("getDatabaseTitle joins title parts and falls back to Untitled database", () => {
  assert.equal(
    getDatabaseTitle({ title: [{ plain_text: "Meals" }, { plain_text: " DB" }] }),
    "Meals DB"
  );
  assert.equal(getDatabaseTitle({ title: [] }), "Untitled database");
  assert.equal(getDatabaseTitle(null), "Untitled database");
});

test("validationError returns a 400 with optional details", async () => {
  const withoutDetails = validationError("bad input");
  assert.equal(withoutDetails.status, 400);
  assert.deepEqual(await withoutDetails.json(), { error: "bad input" });

  const withDetails = validationError("bad input", ["field is required"]);
  assert.equal(withDetails.status, 400);
  assert.deepEqual(await withDetails.json(), {
    error: "bad input",
    details: ["field is required"]
  });
});
