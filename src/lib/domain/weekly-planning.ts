import {
  getCurrentPlannerWeek,
  validateMealId,
  validatePlanDate
} from "@/src/lib/domain/planner";
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

export interface WeeklyDinnerSelection {
  dayOfWeek: DinnerPlanDay;
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
    meal: MealSummary | null;
  }>;
  plannedMealIds: string[];
  activeGroceryList: WeeklyPlanGrocerySummary | null;
}

export interface PersistedWeeklyDinnerSelection {
  dayOfWeek: DinnerPlanDay;
  mealId: string;
}

export function isDinnerPlanDay(value: unknown): value is DinnerPlanDay {
  return (
    typeof value === "string" &&
    dinnerPlanDays.includes(value as DinnerPlanDay)
  );
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

  const seen = new Set<DinnerPlanDay>();

  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Each selection must be an object.");
    }

    const body = entry as Record<string, unknown>;

    if (!isDinnerPlanDay(body.dayOfWeek)) {
      throw new Error("Selection day must be Monday through Sunday.");
    }

    if (seen.has(body.dayOfWeek)) {
      throw new Error("Each day can only be selected once.");
    }
    seen.add(body.dayOfWeek);

    return {
      dayOfWeek: body.dayOfWeek,
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
}): WeeklyDinnerPlanViewModel {
  const mealById = new Map(input.meals.map((meal) => [meal.id, meal]));
  const selectionByDay = new Map(
    input.selections.map((selection) => [selection.dayOfWeek, selection.mealId])
  );
  const plannedMealIds = Array.from(
    new Set(input.selections.map((selection) => selection.mealId))
  );

  return {
    weekStartDate: input.weekStartDate,
    weekEndDate: input.weekEndDate,
    days: input.days.map((day) => {
      const mealId = selectionByDay.get(day.dayOfWeek);

      return {
        ...day,
        meal: mealId ? mealById.get(mealId) ?? null : null
      };
    }),
    plannedMealIds,
    activeGroceryList: input.activeGroceryList ?? null
  };
}
