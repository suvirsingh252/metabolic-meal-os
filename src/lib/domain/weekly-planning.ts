import {
  getCurrentPlannerWeek,
  validateMealId,
  validatePlanDate
} from "@/src/lib/domain/planner";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";
import { generateGroceryList } from "@/src/lib/domain/grocery";
import { buildMealIntelligence } from "@/src/lib/domain/meal-intelligence";
import { rankRecommendationsForCategory } from "@/src/lib/domain/recommendations/ranking";
import type { RecommendationMeal } from "@/src/lib/domain/recommendations/types";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

export const dinnerPlanDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

export type DinnerPlanDay = (typeof dinnerPlanDays)[number];

export const weeklyMealSlots = ["Lunch", "Dinner"] as const;

export type WeeklyMealSlot = (typeof weeklyMealSlots)[number];

export interface WeeklyDinnerSelection {
  dayOfWeek: DinnerPlanDay;
  mealSlot: WeeklyMealSlot;
  mealId: string | null;
}

export interface WeeklyPlanGrocerySummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
}

export interface WeeklyDinnerPlanViewModel {
  weekStartDate: string;
  weekEndDate: string;
  days: Array<{
    dayOfWeek: DinnerPlanDay;
    date: string;
    label: string;
    slots: WeeklyPlannerSlot[];
  }>;
  plannedMealIds: string[];
  activeGroceryList: WeeklyPlanGrocerySummary | null;
  weeklyInsights: WeeklyPlannerInsight[];
  balanceAlerts: WeeklyPlannerBalanceAlert[];
  shoppingPreview: WeeklyPlannerShoppingPreviewSection[];
}

export interface PersistedWeeklyDinnerSelection {
  dayOfWeek: DinnerPlanDay;
  mealSlot: WeeklyMealSlot;
  mealId: string;
}

export interface PlannerSuggestion {
  mealId: string;
  name: string;
  imageUrl: string | null;
  cuisine: string | null;
  prepTimeMinutes: number | null;
  badges: string[];
  reasons: string[];
  explanation: string;
}

export interface WeeklyPlannerSlot {
  id: string;
  dayOfWeek: DinnerPlanDay;
  mealSlot: WeeklyMealSlot;
  date: string;
  label: string;
  meal: MealSummary | null;
  intelligenceBadges: string[];
  prepTimeMinutes: number | null;
  suggestions: PlannerSuggestion[];
}

export interface WeeklyPlannerInsight {
  label: string;
  value: string;
  tone: "good" | "neutral" | "warning";
}

export interface WeeklyPlannerBalanceAlert {
  id: string;
  severity: "info" | "warning";
  title: string;
  message: string;
  slotId: string | null;
  replacement: PlannerSuggestion | null;
}

export interface WeeklyPlannerShoppingPreviewSection {
  category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Spices";
  items: string[];
}

export function isDinnerPlanDay(value: unknown): value is DinnerPlanDay {
  return (
    typeof value === "string" &&
    dinnerPlanDays.includes(value as DinnerPlanDay)
  );
}

export function isWeeklyMealSlot(value: unknown): value is WeeklyMealSlot {
  return (
    typeof value === "string" &&
    weeklyMealSlots.includes(value as WeeklyMealSlot)
  );
}

export function getPlannerSlotId(
  dayOfWeek: DinnerPlanDay,
  mealSlot: WeeklyMealSlot
) {
  return `${dayOfWeek}:${mealSlot}`;
}

export function getCurrentDinnerPlanWeek(today = new Date()) {
  const days = getCurrentPlannerWeek(today);

  return {
    weekStartDate: days[0]?.date ?? validatePlanDate("1970-01-05"),
    weekEndDate: days[6]?.date ?? validatePlanDate("1970-01-11"),
    days: days.map((day) => ({
      dayOfWeek: day.weekday as DinnerPlanDay,
      date: day.date,
      label: day.label
    }))
  };
}

export function validateWeeklyDinnerSelections(
  value: unknown
): WeeklyDinnerSelection[] {
  if (!Array.isArray(value)) {
    throw new Error("Selections must be an array.");
  }

  const seen = new Set<string>();

  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Each selection must be an object.");
    }

    const body = entry as Record<string, unknown>;

    if (!isDinnerPlanDay(body.dayOfWeek)) {
      throw new Error("Selection day must be Monday through Sunday.");
    }

    let mealSlot: WeeklyMealSlot = "Dinner";

    if (
      body.mealSlot !== undefined &&
      body.mealSlot !== null &&
      body.mealSlot !== ""
    ) {
      if (!isWeeklyMealSlot(body.mealSlot)) {
        throw new Error("Selection meal slot must be Lunch or Dinner.");
      }
      mealSlot = body.mealSlot;
    }
    const key = getPlannerSlotId(body.dayOfWeek, mealSlot);

    if (seen.has(key)) {
      throw new Error("Each planner slot can only be selected once.");
    }
    seen.add(key);

    return {
      dayOfWeek: body.dayOfWeek,
      mealSlot,
      mealId:
        body.mealId === null || body.mealId === ""
          ? null
          : validateMealId(body.mealId)
    };
  });
}

export function buildWeeklyDinnerPlanViewModel(input: {
  weekStartDate: string;
  weekEndDate: string;
  days: Array<{ dayOfWeek: DinnerPlanDay; date: string; label: string }>;
  selections: PersistedWeeklyDinnerSelection[];
  meals: MealSummary[];
  activeGroceryList?: WeeklyPlanGrocerySummary | null;
  feedbackByMealId?: MealFeedbackSummaryByMealId;
  generatedAt?: string;
}): WeeklyDinnerPlanViewModel {
  const mealById = new Map(input.meals.map((meal) => [meal.id, meal]));
  const selectionByDay = new Map(
    input.selections.map((selection) => [
      getPlannerSlotId(selection.dayOfWeek, selection.mealSlot),
      selection.mealId
    ])
  );
  const plannedMealIds = Array.from(
    new Set(input.selections.map((selection) => selection.mealId))
  );
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const plannedMeals = plannedMealIds
    .map((mealId) => mealById.get(mealId))
    .filter((meal): meal is MealSummary => Boolean(meal));

  return {
    weekStartDate: input.weekStartDate,
    weekEndDate: input.weekEndDate,
    days: input.days.map((day) => {
      const slots = weeklyMealSlots.map((mealSlot) => {
        const mealId = selectionByDay.get(
          getPlannerSlotId(day.dayOfWeek, mealSlot)
        );
        const meal = mealId ? mealById.get(mealId) ?? null : null;
        const intelligence = meal
          ? buildMealIntelligence(
              meal,
              input.meals,
              input.feedbackByMealId?.[meal.id] ?? null
            )
          : null;

        return {
          id: getPlannerSlotId(day.dayOfWeek, mealSlot),
          ...day,
          mealSlot,
          meal,
          prepTimeMinutes: intelligence?.activeCookingTimeMinutes ?? null,
          intelligenceBadges: meal && intelligence
            ? buildIntelligenceBadges(meal, intelligence)
            : [],
          suggestions: buildPlannerSuggestions({
            meals: input.meals,
            category: mealSlot,
            generatedAt,
            feedbackByMealId: input.feedbackByMealId,
            plannedMealIds,
            plannedMeals,
            currentMealId: meal?.id ?? null
          })
        };
      });

      return {
        ...day,
        slots
      };
    }),
    plannedMealIds,
    activeGroceryList: input.activeGroceryList ?? null,
    weeklyInsights: buildWeeklyInsights(plannedMeals),
    balanceAlerts: buildBalanceAlerts({
      meals: input.meals,
      plannedMeals,
      plannedMealIds,
      feedbackByMealId: input.feedbackByMealId,
      generatedAt
    }),
    shoppingPreview: buildShoppingPreview(input.meals, plannedMealIds)
  };
}

type MealBadgeInput = Pick<
  RecommendationMeal,
  "bloodSugarImpact" | "familyApproved" | "proteinG"
>;

function buildIntelligenceBadges(
  meal: MealBadgeInput,
  intelligence: ReturnType<typeof buildMealIntelligence>
): string[] {
  const badges = new Set<string>();

  if (typeof meal.proteinG === "number" && meal.proteinG >= 25) {
    badges.add("High protein");
  }
  if (intelligence.vegetableDensity === "high") badges.add("Veg-forward");
  if (intelligence.weeknightSuitability === "excellent") badges.add("Weeknight");
  if (intelligence.leftoverQuality === "excellent") badges.add("Leftovers");
  if (intelligence.freezerSuitability === "excellent") badges.add("Freezer");
  if (meal.familyApproved) badges.add("Family approved");
  if (meal.bloodSugarImpact && /low|moderate/i.test(meal.bloodSugarImpact)) {
    badges.add("Balanced");
  }

  return Array.from(badges).slice(0, 4);
}

function buildPlannerSuggestions(input: {
  meals: MealSummary[];
  category: WeeklyMealSlot;
  generatedAt: string;
  feedbackByMealId?: MealFeedbackSummaryByMealId;
  plannedMealIds: string[];
  plannedMeals: MealSummary[];
  currentMealId: string | null;
}): PlannerSuggestion[] {
  const plannedNames = input.plannedMeals.map((meal) => meal.mealName);
  const excludedMealIds = input.plannedMealIds.filter(
    (mealId) => mealId !== input.currentMealId
  );
  const ranked = rankRecommendationsForCategory(input.meals, input.category, {
    generatedAt: input.generatedAt,
    feedbackByMealId: input.feedbackByMealId,
    excludedMealIds,
    excludedMealNames: plannedNames
  });

  return ranked.slice(0, 4).map((recommendation) => {
    const intelligence =
      recommendation.meal.intelligence ??
      buildMealIntelligence(
        recommendation.meal,
        input.meals,
        recommendation.feedbackSummary
      );
    const badges = buildIntelligenceBadges(recommendation.meal, intelligence);
    const details = recommendation.explanation.details.slice(0, 3);

    return {
      mealId: recommendation.meal.id,
      name: recommendation.meal.mealName,
      imageUrl: recommendation.meal.imageUrl ?? null,
      cuisine: recommendation.meal.cuisine,
      prepTimeMinutes: intelligence.activeCookingTimeMinutes,
      badges,
      reasons: recommendation.reasons.slice(0, 3),
      explanation: [
        recommendation.explanation.headline,
        ...details
      ].join(" ")
    };
  });
}

function getPlannedIntelligence(meals: MealSummary[]) {
  return meals.map((meal) => ({
    meal,
    intelligence: buildMealIntelligence(meal, meals, null)
  }));
}

function buildWeeklyInsights(meals: MealSummary[]): WeeklyPlannerInsight[] {
  if (meals.length === 0) {
    return [
      {
        label: "Planned meals",
        value: "0",
        tone: "neutral"
      }
    ];
  }

  const entries = getPlannedIntelligence(meals);
  const highProteinCount = meals.filter(
    (meal) =>
      (typeof meal.proteinG === "number" && meal.proteinG >= 25) ||
      /high/i.test(meal.proteinLevel ?? "")
  ).length;
  const cuisines = new Set(
    meals.map((meal) => meal.cuisine).filter((value): value is string => Boolean(value))
  );
  const prepTimes = entries
    .map((entry) => entry.intelligence.activeCookingTimeMinutes)
    .filter((value): value is number => typeof value === "number");
  const vegetarianCount = entries.filter((entry) =>
    entry.intelligence.dietaryTags.includes("vegetarian")
  ).length;
  const vegetableForwardCount = entries.filter(
    (entry) => entry.intelligence.vegetableDensity !== "low"
  ).length;
  const shoppingPreview = buildShoppingPreview(meals, meals.map((meal) => meal.id));
  const previewItemCount = shoppingPreview.reduce(
    (count, section) => count + section.items.length,
    0
  );
  const rawIngredientLines = meals
    .flatMap((meal) => (meal.ingredientsText ?? "").split(/\r?\n/))
    .filter((line) => line.trim().length > 0).length;
  const shoppingEfficiency =
    rawIngredientLines > 0
      ? Math.round((1 - previewItemCount / Math.max(rawIngredientLines, 1)) * 100)
      : Math.max(55, Math.min(92, 65 + meals.length * 4));

  return [
    {
      label: "High-protein meals",
      value: String(highProteinCount),
      tone: highProteinCount >= Math.ceil(meals.length / 2) ? "good" : "neutral"
    },
    {
      label: "Cuisines",
      value: String(cuisines.size || 1),
      tone: cuisines.size >= 3 ? "good" : "neutral"
    },
    {
      label: "Average prep",
      value:
        prepTimes.length > 0
          ? `${Math.round(prepTimes.reduce((sum, value) => sum + value, 0) / prepTimes.length)} min`
          : "Unknown",
      tone: prepTimes.some((time) => time > 45) ? "warning" : "good"
    },
    {
      label: "Vegetarian meals",
      value: String(vegetarianCount),
      tone: vegetarianCount > 0 ? "good" : "neutral"
    },
    {
      label: "Vegetable balance",
      value:
        vegetableForwardCount >= Math.ceil(meals.length / 2)
          ? "Balanced"
          : "Needs more",
      tone:
        vegetableForwardCount >= Math.ceil(meals.length / 2)
          ? "good"
          : "warning"
    },
    {
      label: "Shopping efficiency",
      value: `${Math.max(0, Math.min(99, shoppingEfficiency))}%`,
      tone: shoppingEfficiency >= 75 ? "good" : "neutral"
    }
  ];
}

function proteinKey(meal: MealSummary) {
  const text = [meal.mealName, meal.ingredientsText, meal.notes]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (/\bchicken\b/.test(text)) return "chicken";
  if (/\bbeef|steak\b/.test(text)) return "beef";
  if (/\bpork|bacon|ham\b/.test(text)) return "pork";
  if (/\bfish|salmon|tuna|cod\b/.test(text)) return "fish";
  if (/\bshrimp\b/.test(text)) return "shrimp";
  if (/\bpaneer\b/.test(text)) return "paneer";
  if (/\btofu|tempeh\b/.test(text)) return "tofu";
  if (/\blentil|dal|chickpea|chana|bean\b/.test(text)) return "legumes";
  if (/\begg\b/.test(text)) return "eggs";

  return null;
}

function buildBalanceAlerts(input: {
  meals: MealSummary[];
  plannedMeals: MealSummary[];
  plannedMealIds: string[];
  feedbackByMealId?: MealFeedbackSummaryByMealId;
  generatedAt: string;
}): WeeklyPlannerBalanceAlert[] {
  const alerts: WeeklyPlannerBalanceAlert[] = [];
  const entries = getPlannedIntelligence(input.plannedMeals);
  const proteinCounts = new Map<string, number>();

  for (const meal of input.plannedMeals) {
    const key = proteinKey(meal);
    if (key) proteinCounts.set(key, (proteinCounts.get(key) ?? 0) + 1);
  }

  for (const [protein, count] of Array.from(proteinCounts.entries())) {
    if (count >= 3) {
      alerts.push({
        id: `too-much-${protein}`,
        severity: "warning",
        title: `Too much ${protein}`,
        message: `${count} planned meals lean on ${protein}. Rotate in another protein or vegetarian option.`,
        slotId: null,
        replacement: firstSuggestion(input, ["vegetarian", "fish", "tofu", "paneer", "legume"])
      });
    }
  }

  const vegetableLow = entries.filter(
    (entry) => entry.intelligence.vegetableDensity === "low"
  ).length;
  if (entries.length >= 3 && vegetableLow > entries.length / 2) {
    alerts.push({
      id: "too-little-vegetables",
      severity: "warning",
      title: "Too little vegetables",
      message: "Most planned meals look light on vegetables.",
      slotId: null,
      replacement: firstSuggestion(input, ["salad", "bowl", "vegetable", "veg", "greens"])
    });
  }

  const complexMeals = entries.filter(
    (entry) => entry.intelligence.preparationComplexity === "high"
  );
  if (complexMeals.length >= 3) {
    alerts.push({
      id: "too-many-complex-meals",
      severity: "warning",
      title: "Too many complex meals",
      message: `${complexMeals.length} planned meals look high-effort.`,
      slotId: null,
      replacement: firstSuggestion(input, ["quick", "easy", "sheet pan", "one pot"])
    });
  }

  const longCookMeals = entries.filter(
    (entry) => (entry.intelligence.activeCookingTimeMinutes ?? 0) > 45
  );
  if (longCookMeals.length >= 3) {
    alerts.push({
      id: "too-many-long-cook-times",
      severity: "warning",
      title: "Too many long cook times",
      message: `${longCookMeals.length} planned meals may take more than 45 minutes.`,
      slotId: null,
      replacement: firstSuggestion(input, ["quick", "weeknight", "easy"])
    });
  }

  const highProteinCount = input.plannedMeals.filter(
    (meal) =>
      (typeof meal.proteinG === "number" && meal.proteinG >= 25) ||
      /high/i.test(meal.proteinLevel ?? "")
  ).length;
  if (input.plannedMeals.length >= 4 && highProteinCount < 2) {
    alerts.push({
      id: "not-enough-protein",
      severity: "warning",
      title: "Not enough protein",
      message: "The week could use more reliably high-protein meals.",
      slotId: null,
      replacement: firstSuggestion(input, ["chicken", "fish", "paneer", "tofu", "lentil", "egg"])
    });
  }

  if (alerts.length === 0 && input.plannedMeals.length > 0) {
    alerts.push({
      id: "balanced-week",
      severity: "info",
      title: "Meal balance looks reasonable",
      message: "No major repetition, protein, vegetable, or cook-time issue stands out.",
      slotId: null,
      replacement: null
    });
  }

  return alerts.slice(0, 4);
}

function firstSuggestion(
  input: {
    meals: MealSummary[];
    plannedMealIds: string[];
    plannedMeals: MealSummary[];
    feedbackByMealId?: MealFeedbackSummaryByMealId;
    generatedAt: string;
  },
  keywords: string[]
) {
  const suggestions = buildPlannerSuggestions({
    meals: input.meals,
    category: "Dinner",
    generatedAt: input.generatedAt,
    feedbackByMealId: input.feedbackByMealId,
    plannedMealIds: input.plannedMealIds,
    plannedMeals: input.plannedMeals,
    currentMealId: null
  });
  const match = suggestions.find((suggestion) => {
    const text = [suggestion.name, suggestion.cuisine, ...suggestion.badges]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) => text.includes(keyword));
  });

  return match ?? suggestions[0] ?? null;
}

function buildShoppingPreview(
  meals: MealSummary[],
  mealIds: string[]
): WeeklyPlannerShoppingPreviewSection[] {
  const list = generateGroceryList({ meals, mealIds });
  const previewCategories: WeeklyPlannerShoppingPreviewSection["category"][] = [
    "Produce",
    "Protein",
    "Dairy",
    "Pantry",
    "Spices"
  ];

  return previewCategories.map((category) => {
    const section = list.sections.find((entry) => entry.category === category);
    return {
      category,
      items:
        section?.items
          .map((item) => item.name)
          .sort((first, second) => first.localeCompare(second))
          .slice(0, 12) ?? []
    };
  });
}
