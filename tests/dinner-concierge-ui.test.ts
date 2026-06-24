import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("concierge client fetches the dinner endpoint and maps refinements to query params", () => {
  const client = source("src/app/concierge/concierge-client.tsx");

  assert.match(client, /"use client"/);
  assert.match(client, /fetch\(`\/api\/dinner/);
  assert.match(client, /function buildDinnerQuery/);
  assert.match(client, /params\.set\("mood"/);
  assert.match(client, /params\.set\("time"/);
  assert.match(client, /params\.set\("tonight"/);
});

test("concierge client renders a lead pick, alternates, and fresh ideas", () => {
  const client = source("src/app/concierge/concierge-client.tsx");

  assert.match(client, /Tonight&apos;s pick/);
  assert.match(client, /Cook this tonight/);
  assert.match(client, /Other options tonight/);
  assert.match(client, /Show me more/);
  assert.match(client, /leadRecommendation/);
});

test("concierge client handles the empty state from the view model", () => {
  const client = source("src/app/concierge/concierge-client.tsx");

  assert.match(client, /viewModel\?\.emptyState/);
  assert.match(client, /emptyState\.message/);
  assert.match(client, /emptyState\.actionLabel/);
});

test("concierge refine strip is mobile-first and accessible", () => {
  const client = source("src/app/concierge/concierge-client.tsx");

  assert.match(client, /aria-label="Refine tonight"/);
  assert.match(client, /aria-pressed=\{active\}/);
  // 44px-minimum touch targets for the refine chips.
  assert.match(client, /min-h-11/);
  assert.match(client, /dinnerConciergeRefinements/);
});

test("concierge does not surface raw numeric scores in the UI", () => {
  const client = source("src/app/concierge/concierge-client.tsx");

  assert.doesNotMatch(client, /recommendation\.score\b/);
  assert.doesNotMatch(client, /scoreBreakdown/);
});

test("home route renders the concierge and the nav front door is Tonight", () => {
  const homePage = source("src/app/page.tsx");
  const navigation = source("lib/navigation.ts");

  assert.match(homePage, /ConciergeClient/);
  assert.match(navigation, /label: "Tonight"/);
});

test("today experience is preserved at its own route", () => {
  const todayPage = source("src/app/today/page.tsx");

  assert.match(todayPage, /TodayClient/);
});
