import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardViewModel } from "@/src/lib/domain/analytics";
import type { AnalyticsMeal } from "@/src/lib/domain/analytics";

const generatedAt = "2026-05-25T12:00:00.000Z";

function meal(
  id: string,
  loggedAt: string,
  nutrition: AnalyticsMeal["nutrition"]
): AnalyticsMeal {
  return {
    id,
    name: id,
    loggedAt,
    nutrition
  };
}

test("generateDashboardInsights includes low protein insight", () => {
  const dashboard = buildDashboardViewModel(
    [meal("low-protein", generatedAt, { protein: 20, calories: 600 })],
    { generatedAt }
  );

  assert.ok(
    dashboard.insights.some((insight) => insight.id === "protein-low-week")
  );
});

test("generateDashboardInsights includes high sodium insight", () => {
  const dashboard = buildDashboardViewModel(
    [meal("high-sodium", generatedAt, { sodium: 2500 })],
    { generatedAt }
  );

  assert.ok(
    dashboard.insights.some((insight) => insight.id === "sodium-high-today")
  );
});

test("generateDashboardInsights includes positive target-met insights", () => {
  const dashboard = buildDashboardViewModel(
    [meal("targets", generatedAt, { protein: 150, fiber: 35 })],
    { generatedAt }
  );

  assert.ok(
    dashboard.insights.some((insight) => insight.id === "protein-target-met")
  );
  assert.ok(
    dashboard.insights.some((insight) => insight.id === "fiber-target-met")
  );
});
