import assert from "node:assert/strict";
import test from "node:test";
import { scoreMealQuality } from "@/src/lib/domain/analytics";
import type { AnalyticsMeal } from "@/src/lib/domain/analytics";

function meal(overrides: Partial<AnalyticsMeal>): AnalyticsMeal {
  return {
    id: "meal",
    name: "Meal",
    loggedAt: "2026-05-25T12:00:00.000Z",
    nutrition: {},
    ...overrides
  };
}

test("scoreMealQuality rewards protein and fiber density", () => {
  const quality = scoreMealQuality(
    meal({
      nutrition: {
        calories: 500,
        protein: 35,
        fiber: 10,
        sodium: 350,
        sugar: 5
      },
      ingredientCount: 8,
      minimallyProcessedSignal: "high"
    })
  );

  assert.equal(quality.label, "high");
  assert.ok((quality.score ?? 0) >= 75);
});

test("scoreMealQuality flags sodium and sugar load", () => {
  const quality = scoreMealQuality(
    meal({
      nutrition: {
        calories: 400,
        protein: 5,
        fiber: 1,
        sodium: 1200,
        sugar: 30
      }
    })
  );

  assert.equal(quality.label, "low");
  assert.ok(quality.drivers.includes("sodium load"));
  assert.ok(quality.drivers.includes("sugar load"));
});

test("scoreMealQuality backfills from analysis score signals", () => {
  const quality = scoreMealQuality(
    meal({
      qualitySignals: {
        metabolicScore: 8,
        proteinScore: 8,
        fiberScore: 7,
        satietyScoreNumeric: 8,
        bloodSugarRiskScore: 3
      }
    })
  );

  assert.equal(quality.label, "high");
  assert.equal(quality.score, 78);
});
