import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTodayViewModel,
  generateRecommendationExplanation,
  generateRecommendationReasons,
  getAlternativeSuggestion,
  isDemoReadyRecommendationMeal,
  rankRecommendationsForCategory,
  scoreRecommendation,
  type RecommendationMeal
} from "@/src/lib/domain/recommendations";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";

const generatedAt = "2026-06-10T12:00:00.000Z";

function value<T>(
  overrides: Partial<RecommendationMeal>,
  key: keyof RecommendationMeal,
  fallback: T
) {
  return Object.prototype.hasOwnProperty.call(overrides, key)
    ? (overrides[key] as T)
    : fallback;
}

function meal(overrides: Partial<RecommendationMeal>): RecommendationMeal {
  return {
    id: overrides.id ?? "meal",
    url: overrides.url ?? "https://notion.so/meal",
    mealName: overrides.mealName ?? overrides.id ?? "Meal",
    createdAt: overrides.createdAt ?? "2026-05-01T12:00:00.000Z",
    imageUrl: value(overrides, "imageUrl", "https://example.com/meal.jpg"),
    cuisine: value(overrides, "cuisine", "Indian"),
    mealType: overrides.mealType ?? "Dinner",
    familyApproved: overrides.familyApproved ?? false,
    weeknightFriendly: overrides.weeknightFriendly ?? false,
    comfortMeal: overrides.comfortMeal ?? false,
    calories: value(overrides, "calories", 520),
    proteinG: value(overrides, "proteinG", 28),
    carbohydratesG: value(overrides, "carbohydratesG", 58),
    fatG: value(overrides, "fatG", 18),
    fiberG: value(overrides, "fiberG", 10),
    qualityScore: overrides.qualityScore ?? null,
    proteinLevel: overrides.proteinLevel ?? null,
    satietyLevel: overrides.satietyLevel ?? null,
    bloodSugarImpact: overrides.bloodSugarImpact ?? null,
    effortLevel: overrides.effortLevel ?? null,
    notes: overrides.notes ?? null,
    ingredientsText: value(
      overrides,
      "ingredientsText",
      "1 cup chickpeas\n1 cup tomatoes\n1 tbsp olive oil"
    ),
    instructionsText: overrides.instructionsText ?? null,
    metabolicScore: overrides.metabolicScore ?? null,
    proteinScore: overrides.proteinScore ?? null,
    fiberScore: overrides.fiberScore ?? null,
    satietyScoreNumeric: overrides.satietyScoreNumeric ?? null,
    bloodSugarRiskScore: overrides.bloodSugarRiskScore ?? null,
    intelligence: overrides.intelligence
  };
}

test("ranking favors liked high-quality meals that have not been eaten recently", () => {
  const meals = [
    meal({
      id: "favorite",
      mealName: "Chana masala",
      familyApproved: true,
      qualityScore: 88,
      proteinG: 28,
      fiberG: 12,
      calories: 620,
      createdAt: "2026-05-01T12:00:00.000Z"
    }),
    meal({
      id: "recent",
      mealName: "Paneer bowls",
      familyApproved: true,
      qualityScore: 92,
      proteinG: 34,
      fiberG: 8,
      calories: 700,
      createdAt: "2026-06-09T12:00:00.000Z"
    })
  ];

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt
  });

  assert.equal(ranked[0]?.meal.id, "favorite");
});

test("recency avoidance keeps a very recent meal below an older candidate", () => {
  const meals = [
    meal({
      id: "old",
      mealName: "Lentil soup",
      qualityScore: 72,
      createdAt: "2026-05-20T12:00:00.000Z"
    }),
    meal({
      id: "yesterday",
      mealName: "Bean tacos",
      qualityScore: 95,
      createdAt: "2026-06-09T12:00:00.000Z"
    })
  ];

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt
  });

  assert.equal(ranked[0]?.meal.id, "old");
});

test("reason generation only uses real saved meal signals", () => {
  const favorite = meal({
    id: "favorite",
    mealName: "Tofu stir fry",
    familyApproved: true,
    qualityScore: 82,
    calories: 550,
    proteinG: 30,
    carbohydratesG: 58,
    fatG: 18,
    fiberG: 9,
    createdAt: "2026-05-01T12:00:00.000Z"
  });
  const meals = [
    favorite,
    meal({
      id: "repeat",
      mealName: "Tofu stir fry",
      createdAt: "2026-04-01T12:00:00.000Z"
    })
  ];

  const reasons = generateRecommendationReasons(
    favorite,
    meals,
    "Dinner",
    generatedAt
  );

  assert.deepEqual(reasons, [
    "Family favorite",
    "Highly rated",
    "Haven't had this recently",
    "Frequently repeated"
  ]);
});

test("today view model gracefully omits categories without explicit saved meal data", () => {
  const today = buildTodayViewModel(
    [
      meal({
        id: "dinner",
        mealType: "Dinner",
        qualityScore: 80
      })
    ],
    { generatedAt }
  );

  assert.ok(today.suggestions.Dinner);
  assert.equal(today.suggestions.Breakfast, undefined);
  assert.equal(today.suggestions.Lunch, undefined);
  assert.equal(today.suggestions.Snack, undefined);
});

test("demo-ready recommendation gate allows branded image fallback", () => {
  assert.equal(
    isDemoReadyRecommendationMeal(
      meal({
        id: "fallback-image",
        imageUrl: null
      })
    ),
    true
  );

  assert.equal(
    isDemoReadyRecommendationMeal(
      meal({
        id: "missing-nutrition",
        imageUrl: null,
        fatG: null
      })
    ),
    false
  );
});

test("empty meal archive returns a fallback state instead of invented meals", () => {
  const today = buildTodayViewModel([], { generatedAt });

  assert.equal(Object.keys(today.suggestions).length, 0);
  assert.match(today.emptyState ?? "", /No saved meals found/);
  assert.equal(today.healthSnapshot[0]?.id, "limited-data");
});

test("suggest another returns another valid candidate without repeating current meal", () => {
  const meals = [
    meal({ id: "first", mealName: "First dinner", qualityScore: 90 }),
    meal({ id: "second", mealName: "Second dinner", qualityScore: 80 })
  ];

  const alternative = getAlternativeSuggestion(meals, "Dinner", "first", {
    generatedAt,
    excludedMealIds: ["first"]
  });

  assert.equal(alternative?.meal.id, "second");
});

test("suggest another cycles again after temporary exclusions exhaust a category", () => {
  const meals = [
    meal({ id: "first", mealName: "First dinner", qualityScore: 90 }),
    meal({ id: "second", mealName: "Second dinner", qualityScore: 80 }),
    meal({ id: "third", mealName: "Third dinner", qualityScore: 70 })
  ];

  const alternative = getAlternativeSuggestion(meals, "Dinner", "third", {
    generatedAt,
    excludedMealIds: ["first", "second", "third"]
  });

  assert.equal(alternative?.meal.id, "first");
});

test("ranking boosts meals loved by household feedback", () => {
  const meals = [
    meal({ id: "loved", mealName: "Loved dinner", qualityScore: 75 }),
    meal({ id: "plain", mealName: "Plain dinner", qualityScore: 86 })
  ];
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    loved: {
      mealId: "loved",
      totalEvents: 2,
      eatenCount: 2,
      lovedCount: 1,
      likedCount: 2,
      dislikedCount: 0,
      wouldRepeatCount: 2,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-05-01T12:00:00.000Z",
      lastPositiveAt: "2026-05-01T12:00:00.000Z",
      netPreferenceScore: 10,
      confidence: "medium",
      recentNotes: []
    }
  };

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(ranked[0]?.meal.id, "loved");
  assert.ok(ranked[0]?.reasons.includes("Family loved this"));
});

test("ranking temporarily de-prioritizes recently eaten feedback", () => {
  const meals = [
    meal({ id: "recent-loved", mealName: "Recent loved", qualityScore: 90 }),
    meal({ id: "older", mealName: "Older dinner", qualityScore: 78 })
  ];
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    "recent-loved": {
      mealId: "recent-loved",
      totalEvents: 3,
      eatenCount: 3,
      lovedCount: 2,
      likedCount: 3,
      dislikedCount: 0,
      wouldRepeatCount: 3,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-06-10T08:00:00.000Z",
      lastPositiveAt: "2026-06-10T08:00:00.000Z",
      netPreferenceScore: 18,
      confidence: "medium",
      recentNotes: []
    }
  };

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(ranked[0]?.meal.id, "older");
  assert.ok(
    ranked.find((recommendation) => recommendation.meal.id === "recent-loved")
      ?.reasons.includes("Recently eaten")
  );
});

test("ranking lowers meals with repeated negative feedback", () => {
  const meals = [
    meal({ id: "mixed", mealName: "Mixed dinner", qualityScore: 90 }),
    meal({ id: "steady", mealName: "Steady dinner", qualityScore: 72 })
  ];
  const feedbackByMealId: MealFeedbackSummaryByMealId = {
    mixed: {
      mealId: "mixed",
      totalEvents: 3,
      eatenCount: 3,
      lovedCount: 0,
      likedCount: 1,
      dislikedCount: 2,
      wouldRepeatCount: 1,
      wouldNotRepeatCount: 2,
      lastEatenAt: "2026-05-01T12:00:00.000Z",
      lastPositiveAt: "2026-04-15T12:00:00.000Z",
      netPreferenceScore: -8,
      confidence: "medium",
      recentNotes: []
    }
  };

  const ranked = rankRecommendationsForCategory(meals, "Dinner", {
    generatedAt,
    feedbackByMealId
  });

  assert.equal(ranked[0]?.meal.id, "steady");
  assert.ok(
    ranked.find((recommendation) => recommendation.meal.id === "mixed")?.reasons
      .includes("Mixed feedback")
  );
});

test("today view model falls back when feedback summaries are absent", () => {
  const today = buildTodayViewModel(
    [meal({ id: "dinner", mealType: "Dinner", qualityScore: 80 })],
    { generatedAt, feedbackByMealId: {} }
  );

  assert.equal(today.suggestions.Dinner?.meal.id, "dinner");
  assert.equal(today.suggestions.Dinner?.feedbackSummary, null);
});

test("no-feedback scoring is deterministic and preference-neutral", () => {
  const meals = [
    meal({
      id: "steady",
      mealName: "Steady dinner",
      familyApproved: true,
      weeknightFriendly: true,
      qualityScore: 80,
      proteinG: 24,
      fiberG: 8
    })
  ];
  const firstScore = scoreRecommendation({
    meal: meals[0],
    meals,
    category: "Dinner",
    generatedAt,
    feedbackSummary: null
  });
  const secondScore = scoreRecommendation({
    meal: meals[0],
    meals,
    category: "Dinner",
    generatedAt,
    feedbackSummary: null
  });

  assert.deepEqual(firstScore, secondScore);
  assert.equal(firstScore.preferenceScore, 0);
  assert.equal(firstScore.varietyPenalty, 0);
  assert.ok(firstScore.schedulingScore > 0);
});

test("strong preference scoring raises preferred meals without new schema fields", () => {
  const dinner = meal({ id: "favorite", qualityScore: 70 });
  const score = scoreRecommendation({
    meal: dinner,
    meals: [dinner],
    category: "Dinner",
    generatedAt,
    feedbackSummary: {
      mealId: "favorite",
      totalEvents: 4,
      eatenCount: 4,
      lovedCount: 2,
      likedCount: 4,
      dislikedCount: 0,
      wouldRepeatCount: 4,
      wouldNotRepeatCount: 0,
      lastEatenAt: "2026-05-01T12:00:00.000Z",
      lastPositiveAt: "2026-05-01T12:00:00.000Z",
      netPreferenceScore: 20,
      confidence: "medium",
      recentNotes: []
    }
  });

  assert.ok(score.preferenceScore > score.schedulingScore);
  assert.ok(score.totalScore > score.schedulingScore);
});

test("explanations include preference, recency, variety, and scheduling components", () => {
  const dinner = meal({
    id: "repeat",
    mealName: "Repeat dinner",
    qualityScore: 90,
    createdAt: "2026-05-01T12:00:00.000Z"
  });
  const meals = [
    dinner,
    meal({ id: "repeat-2", mealName: "Repeat dinner" }),
    meal({ id: "repeat-3", mealName: "Repeat dinner" })
  ];
  const feedback = {
    mealId: "repeat",
    totalEvents: 3,
    eatenCount: 3,
    lovedCount: 1,
    likedCount: 3,
    dislikedCount: 0,
    wouldRepeatCount: 3,
    wouldNotRepeatCount: 0,
    lastEatenAt: "2026-06-09T12:00:00.000Z",
    lastPositiveAt: "2026-06-09T12:00:00.000Z",
    netPreferenceScore: 14,
    confidence: "medium" as const,
    recentNotes: []
  };
  const score = scoreRecommendation({
    meal: dinner,
    meals,
    category: "Dinner",
    generatedAt,
    feedbackSummary: feedback
  });
  const explanation = generateRecommendationExplanation(
    {
      meal: dinner,
      meals,
      category: "Dinner",
      generatedAt,
      feedbackSummary: feedback
    },
    score
  );

  assert.equal(explanation.details.length, 4);
  assert.ok(explanation.details.some((detail) => detail.includes("household")));
  assert.ok(
    explanation.details.some(
      (detail) =>
        detail.includes("lately") ||
        detail.includes("recently") ||
        detail.includes("Timing")
    )
  );
  assert.ok(
    explanation.details.some(
      (detail) => detail.includes("variety") || detail.includes("repeated")
    )
  );
  assert.ok(
    explanation.details.some(
      (detail) =>
        detail.includes("protein") ||
        detail.includes("reasonable fit") ||
        detail.includes("strong fit")
    )
  );
});

test("sparse meal intelligence is bounded, deterministic, and cautious in copy", () => {
  const dinner = meal({
    id: "sparse",
    mealName: "Sparse dinner",
    qualityScore: null,
    imageUrl: null,
    cuisine: null,
    ingredientsText: null,
    calories: null,
    proteinG: null,
    carbohydratesG: null,
    fatG: null,
    fiberG: null
  });
  const firstScore = scoreRecommendation({
    meal: dinner,
    meals: [dinner],
    category: "Dinner",
    generatedAt,
    feedbackSummary: null
  });
  const secondScore = scoreRecommendation({
    meal: dinner,
    meals: [dinner],
    category: "Dinner",
    generatedAt,
    feedbackSummary: null
  });
  const explanation = generateRecommendationExplanation(
    {
      meal: dinner,
      meals: [dinner],
      category: "Dinner",
      generatedAt,
      feedbackSummary: null
    },
    firstScore
  );

  assert.deepEqual(firstScore, secondScore);
  assert.ok(firstScore.intelligenceScore <= 38);
  assert.ok(explanation.details.some((detail) => detail.includes("limited")));
  assert.ok(!explanation.details.some((detail) => detail.includes("strong fit")));
});

test("high-complexity meals are penalized for weeknight dinner ranking", () => {
  const simple = meal({
    id: "simple",
    mealName: "Simple lentil bowls",
    qualityScore: 74,
    weeknightFriendly: true,
    ingredientsText: ["lentils", "spinach", "rice"].join("\n"),
    instructionsText: "Simmer lentils for 20 minutes in one pot.",
    proteinG: 24,
    fiberG: 11,
    calories: 560
  });
  const complex = meal({
    id: "complex",
    mealName: "Marinated roast dinner",
    qualityScore: 92,
    effortLevel: "High",
    ingredientsText: ["chicken", "potatoes", "greens"].join("\n"),
    instructionsText:
      "Marinate overnight. Sear chicken. Roast potatoes. Bake greens. Make sauce. Rest and carve.",
    proteinG: 35,
    fiberG: 6,
    calories: 690
  });
  const ranked = rankRecommendationsForCategory([complex, simple], "Dinner", {
    generatedAt
  });

  assert.equal(ranked[0]?.meal.id, "simple");
  assert.ok(
    ranked.find((item) => item.meal.id === "complex")!.scoreBreakdown
      .intelligenceScore <
      ranked.find((item) => item.meal.id === "simple")!.scoreBreakdown
        .intelligenceScore
  );
});

test("high-protein meals get nutrition-specific intelligence explanation", () => {
  const dinner = meal({
    id: "protein",
    mealName: "Chicken quinoa bowls",
    qualityScore: 84,
    ingredientsText: ["chicken", "quinoa", "broccoli"].join("\n"),
    instructionsText: "Grill chicken and assemble bowls.",
    proteinG: 38,
    fiberG: 9,
    calories: 640
  });
  const score = scoreRecommendation({
    meal: dinner,
    meals: [dinner],
    category: "Dinner",
    generatedAt,
    feedbackSummary: null
  });
  const explanation = generateRecommendationExplanation(
    {
      meal: dinner,
      meals: [dinner],
      category: "Dinner",
      generatedAt,
      feedbackSummary: null
    },
    score
  );

  assert.ok(
    explanation.details.some((detail) => /protein|fiber|quality/i.test(detail))
  );
});
