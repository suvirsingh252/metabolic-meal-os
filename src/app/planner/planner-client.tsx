"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { MealImage } from "@/src/components/meal-image";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import type {
  DinnerPlanDay,
  WeeklyDinnerPlanViewModel,
  WeeklyDinnerSelection
} from "@/src/lib/domain/weekly-planning";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

type PlannerDay = WeeklyDinnerPlanViewModel["days"][number];

interface MealsResponse {
  meals: MealSummary[];
}

interface WeeklyGroceryResponse {
  list: {
    id: string;
    itemCount: number;
    completedCount: number;
  };
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

function formatPlanRange(plan: WeeklyDinnerPlanViewModel | null) {
  if (!plan) {
    return "This week";
  }

  return `${plan.weekStartDate} to ${plan.weekEndDate}`;
}

export function PlannerClient({
  preselectedMealId = null
}: {
  preselectedMealId?: string | null;
}) {
  const [plan, setPlan] = useState<WeeklyDinnerPlanViewModel | null>(null);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedMeals = useMemo(
    () =>
      [...meals].sort((first, second) =>
        first.mealName.localeCompare(second.mealName)
      ),
    [meals]
  );
  const plannedCount = Object.values(selections).filter(Boolean).length;
  const hasActiveGroceryList = Boolean(plan?.activeGroceryList);
  const plannerDays = plan?.days ?? [];
  const activePlannerDay =
    plannerDays[selectedDayIndex] ?? plannerDays[0] ?? null;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [planResponse, mealsResponse] = await Promise.all([
        fetch("/api/weekly-plan"),
        fetch("/api/notion/meals?pageSize=100")
      ]);
      const planData: unknown = await planResponse.json();
      const mealsData: unknown = await mealsResponse.json();

      if (!planResponse.ok) {
        setError(getErrorMessage(planData, "Unable to load weekly plan."));
        return;
      }

      if (!mealsResponse.ok) {
        setError(getErrorMessage(mealsData, "Unable to load saved meals."));
        return;
      }

      const nextPlan = planData as WeeklyDinnerPlanViewModel;
      const nextSelections = Object.fromEntries(
        nextPlan.days
          .filter((day) => Boolean(day.meal))
          .map((day) => [day.dayOfWeek, day.meal!.id])
      );

      if (
        preselectedMealId &&
        !Object.values(nextSelections).includes(preselectedMealId)
      ) {
        const firstEmptyDay = nextPlan.days.find(
          (day) => !nextSelections[day.dayOfWeek]
        );

        if (firstEmptyDay) {
          nextSelections[firstEmptyDay.dayOfWeek] = preselectedMealId;
        }
      }

      setPlan(nextPlan);
      setMeals((mealsData as MealsResponse).meals);
      setSelections(nextSelections);
      setSelectedDayIndex((current) =>
        current < nextPlan.days.length ? current : 0
      );
    } catch {
      setError("Unable to reach the weekly planner service. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [preselectedMealId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  function updateSelection(dayOfWeek: DinnerPlanDay, mealId: string) {
    setSelections((current) => ({
      ...current,
      [dayOfWeek]: mealId
    }));
    setSuccess(null);
  }

  function clearSelection(dayOfWeek: DinnerPlanDay) {
    setSelections((current) => {
      const next = { ...current };
      delete next[dayOfWeek];
      return next;
    });
    setSuccess(null);
  }

  async function savePlan() {
    if (!plan) {
      return false;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload: WeeklyDinnerSelection[] = plan.days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      mealId: selections[day.dayOfWeek] || null
    }));

    try {
      const response = await fetch("/api/weekly-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ selections: payload })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to save weekly plan."));
        return false;
      }

      setPlan(data as WeeklyDinnerPlanViewModel);
      setSuccess("Weekly plan saved.");
      return true;
    } catch {
      setError("Unable to reach the weekly planner service. Try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function generateGroceryList() {
    const saved = await savePlan();

    if (!saved) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/weekly-plan/grocery", {
        method: "POST"
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to generate grocery list."));
        return;
      }

      const result = data as WeeklyGroceryResponse;
      await load();
      setSuccess(`Grocery list ready with ${result.list.itemCount} items.`);
    } catch {
      setError("Unable to reach the grocery service. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading weekly planner...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <section className="sticky top-20 z-10 rounded-md border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">{formatPlanRange(plan)}</p>
              <p className="text-sm text-muted-foreground">
                {plannedCount} dinners planned
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={load} type="button" variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button disabled={isSaving} onClick={savePlan} type="button">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Plan
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}
      {success ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      ) : null}

      <section className="space-y-3 lg:hidden">
        <div
          aria-label="Choose planner day"
          className="flex gap-2 overflow-x-auto rounded-md border bg-card p-2"
          role="tablist"
        >
          {plannerDays.map((day, index) => (
            <button
              aria-selected={index === selectedDayIndex}
              className={[
                "min-h-12 min-w-24 rounded-md px-3 py-2 text-left text-sm",
                index === selectedDayIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-background"
              ].join(" ")}
              key={day.dayOfWeek}
              onClick={() => setSelectedDayIndex(index)}
              role="tab"
              type="button"
            >
              <span className="block font-semibold">{day.dayOfWeek.slice(0, 3)}</span>
              <span className="text-xs opacity-80">{day.label}</span>
            </button>
          ))}
        </div>

        {activePlannerDay ? (
          <PlannerDayCard
            clearSelection={clearSelection}
            day={activePlannerDay}
            meals={meals}
            selectedMealId={selections[activePlannerDay.dayOfWeek] ?? ""}
            sortedMeals={sortedMeals}
            updateSelection={updateSelection}
          />
        ) : null}
      </section>

      <section className="hidden gap-3 lg:grid lg:grid-cols-7">
        {plannerDays.map((day) => (
          <PlannerDayCard
            clearSelection={clearSelection}
            day={day}
            key={day.dayOfWeek}
            meals={meals}
            selectedMealId={selections[day.dayOfWeek] ?? ""}
            sortedMeals={sortedMeals}
            updateSelection={updateSelection}
          />
        ))}
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Weekly grocery list</h2>
            {plan?.activeGroceryList ? (
              <p className="text-sm text-muted-foreground">
                {plan.activeGroceryList.completedCount} /{" "}
                {plan.activeGroceryList.itemCount} items purchased
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate one consolidated list from planned dinners.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {plan?.activeGroceryList ? (
              <Button asChild type="button" variant="secondary">
                <Link href={`/grocery?list=${plan.activeGroceryList.id}`}>
                  <ShoppingCart className="h-4 w-4" />
                  Open List
                </Link>
              </Button>
            ) : null}
            <Button
              disabled={isGenerating || plannedCount === 0}
              onClick={() => void generateGroceryList()}
              type="button"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {hasActiveGroceryList
                ? "Regenerate Grocery List"
                : "Generate Grocery List"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlannerDayCard({
  clearSelection,
  day,
  meals,
  selectedMealId,
  sortedMeals,
  updateSelection
}: {
  clearSelection: (dayOfWeek: DinnerPlanDay) => void;
  day: PlannerDay;
  meals: MealSummary[];
  selectedMealId: string;
  sortedMeals: MealSummary[];
  updateSelection: (dayOfWeek: DinnerPlanDay, mealId: string) => void;
}) {
  const selectedMeal = meals.find((meal) => meal.id === selectedMealId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-2 text-base">
          <span>
            <span className="block">{day.dayOfWeek}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {day.label}
            </span>
          </span>
          {selectedMeal ? <Badge>Dinner</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          aria-label={`Choose ${day.dayOfWeek} dinner`}
          onChange={(event) => updateSelection(day.dayOfWeek, event.target.value)}
          value={selectedMealId}
        >
          <option value="">No meal selected</option>
          {sortedMeals.map((meal) => (
            <option key={meal.id} value={meal.id}>
              {meal.mealName}
            </option>
          ))}
        </Select>

        {selectedMeal ? (
          <div className="overflow-hidden rounded-md border bg-background">
            <div className="relative aspect-[16/9] w-full">
              <MealImage
                alt={`${selectedMeal.mealName} image`}
                imageUrl={selectedMeal.imageUrl}
                sizes="(min-width: 1024px) 14vw, 100vw"
              />
            </div>
            <div className="p-3">
              <Link
                className="font-medium leading-6 text-primary underline-offset-4 hover:underline"
                href={getMealDetailPath(selectedMeal.id)}
              >
                {selectedMeal.mealName}
              </Link>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[selectedMeal.cuisine, selectedMeal.effortLevel]
                .filter((value): value is string => Boolean(value))
                .map((value) => (
                  <Badge key={value}>{value}</Badge>
                ))}
            </div>
            <Button
              className="mt-3 w-full"
              onClick={() => clearSelection(day.dayOfWeek)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
            Open slot for dinner.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
