import assert from "node:assert/strict";
import test from "node:test";
import { getUrlRecoveryCopy } from "@/src/app/analyze/components/status-banner";

test("URL parser failures produce guided recovery copy", () => {
  const copy = getUrlRecoveryCopy(
    true,
    "That link returned 403. Paste the caption, transcript, ingredient list, or recipe text instead."
  );

  assert.ok(copy);
  assert.match(copy.title, /could not read/i);
  assert.match(copy.body, /publishers block automated recipe reading/i);
  assert.match(copy.nextStep, /ingredients, recipe text, caption, transcript/i);
  assert.match(copy.nextStep, /rough summary/i);
});

test("non-url analysis errors keep the normal error path", () => {
  assert.equal(
    getUrlRecoveryCopy(false, "Unable to analyze meal right now."),
    null
  );
});

