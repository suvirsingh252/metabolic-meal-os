"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Trash2,
  Utensils,
  XCircle
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getDeepLinkPreselection,
  groupPlannerSlotsByDateAndSlot,
  getDefaultPlannerDayIndex,
  getPlannerSlotKey,
  mealSlots,
  plannerStatuses,
  type MealSlot,
  type PlannerStatus,
  type PlannerViewModel
} from "@/src/lib/domain/planner";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

interface MealsResponse {
  meals: MealSummary[];
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

function mealMatchesSlot(meal: MealSummary, slot: MealSlot) {
  return (meal.mealType ?? "").toLowerCase().includes(slot.toLowerCase());
}

function getMealGroupsForSlot(meals: MealSummary[], slot: MealSlot) {
  const matching = meals.filter((meal) => mealMatchesSlot(meal, slot));
  const other = meals.filter((meal) => !mealMatchesSlot(meal, slot));

  return matching.length > 0
    ? [
        { label: `${slot} meals`, meals: matching },
        { label: "Other saved meals", meals: other }
      ].filter((group) => group.meals.length > 0)
    : [{ label: "Saved meals", meals }];
}

export function PlannerClient({
  preselectedMealId = null
}: {
  preselectedMealId?: string | null;
}) {
  const [planner, setPlanner] = useState<PlannerViewModel | null>(null);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({});
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealsError, setMealsError] = useState<string | null>(null);

  const slotsByKey = useMemo(
    () => groupPlannerSlotsByDateAndSlot(planner?.slots ?? []),
    [planner]
  );
  const preselectedMeals = useMemo(() => {
    if (!preselectedMealId || !planner || meals.length === 0) {
      return {};
    }

    return getDeepLinkPreselection(
      preselectedMealId,
      meals,
      planner,
      getDefaultPlannerDayIndex(planner)
    );
  }, [meals, planner, preselectedMealId]);
  const visibleSelectedMeals = useMemo(
    () => ({ ...preselectedMeals, ...selectedMeals }),
    [preselectedMeals, selectedMeals]
  );

  const loadPlanner = useCallback(async (): Promise<PlannerViewModel | null> => {
    setError(null);

    try {
      const response = await fetch("/api/planner");
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to load planner."));
        return null;
      }

      const nextPlanner = data as PlannerViewModel;
      setPlanner(nextPlanner);
      setSelectedDayIndex(getDefaultPlannerDayIndex(nextPlanner));
      return nextPlanner;
    } catch {
      setError("Unable to reach the planner service. Try again.");
      return null;
    }
  }, []);

  const loadMeals = useCallback(async (): Promise<MealSummary[]> => {
    setMealsError(null);

    try {
      const response = await fetch("/api/notion/meals?pageSize=100");
      const data: unknown = await response.json();

      if (!response.ok) {
        setMealsError(getErrorMessage(data, "Unable to load saved meals."));
        return [];
      }

      const loaded = (data as MealsResponse).meals;
      setMeals(loaded);
      return loaded;
    } catch {
      setMealsError("Unable to reach saved meals. Try again.");
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      await Promise.all([loadPlanner(), loadMeals()]);

      if (active) {
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [loadMeals, loadPlanner]);

  function updateSelectedMeal(key: string, mealId: string) {
    setSelectedMeals((current) => ({
      ...current,
      [key]: mealId
    }));
  }

  async function mutatePlanner(
    date: string,
    slot: MealSlot,
    body:
      | { action: "assign"; mealId: string }
      | { action: "clear" }
      | { action: "status"; status: PlannerStatus }
  ) {
    setIsSaving(`${date}-${slot}-${body.action}`);
    setError(null);

    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planDate: date,
          slot,
          ...body
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to update planner."));
        return;
      }

      await loadPlanner();
    } catch {
      setError("Unable to reach the planner service. Try again.");
    } finally {
      setIsSaving(null);
    }
  }

  const canWrite = Boolean(planner?.setup.ok);
  const activePlannerDay =
    planner?.days[selectedDayIndex] ?? planner?.days[0] ?? null;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading planner...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && planner ? (
        <>
          <div className="flex flex-col gap-2 rounded-md border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-medium">
              <CalendarDays className="h-4 w-4 text-primary" />
              {planner.weekStart} to {planner.weekEnd}
            </div>
            <Button
              disabled={isLoading}
              onClick={() => void loadPlanner()}
              size="sm"
              type="button"
              variant="secondary"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {!planner.setup.ok ? (
            <Alert>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <XCircle className="h-4 w-4" />
                  Planner setup incomplete
                </div>
                {planner.setup.issues.map((issue) => (
                  <p key={issue.message}>{issue.message}</p>
                ))}
              </div>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Planner is connected to Tablewise.
            </div>
          )}

          {(() => {
            const preselectedMeal = preselectedMealId
              ? meals.find((m) => m.id === preselectedMealId)
              : null;
            return preselectedMeal && canWrite ? (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                <CalendarDays className="h-4 w-4 shrink-0" />
                Adding{" "}
                <strong className="mx-1">{preselectedMeal.mealName}</strong> —
                select a day and slot, then tap Assign.
              </div>
            ) : null;
          })()}

          {error ? (
            <Alert>
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </span>
            </Alert>
          ) : null}

          {mealsError ? (
            <Alert>
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {mealsError}
              </span>
            </Alert>
          ) : null}

          {meals.length === 0 && !mealsError ? (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              Save meals from Analyze before assigning meal slots.
            </div>
          ) : null}

          <div className="space-y-3 lg:hidden">
            <div
              aria-label="Choose planner day"
              className="flex gap-2 overflow-x-auto rounded-md border bg-card p-2"
            >
              {planner.days.map((day, index) => (
                <Button
                  aria-pressed={selectedDayIndex === index}
                  className="shrink-0"
                  key={day.date}
                  onClick={() => setSelectedDayIndex(index)}
                  size="sm"
                  type="button"
                  variant={selectedDayIndex === index ? "default" : "secondary"}
                >
                  {day.weekday.slice(0, 3)}
                </Button>
              ))}
            </div>
            {activePlannerDay ? (
              <PlannerDayCard
                canWrite={canWrite}
                day={activePlannerDay}
                isSaving={isSaving}
                meals={meals}
                mutatePlanner={mutatePlanner}
                selectedMeals={visibleSelectedMeals}
                slotsByKey={slotsByKey}
                updateSelectedMeal={updateSelectedMeal}
              />
            ) : null}
          </div>

          <div className="hidden gap-3 lg:grid lg:grid-cols-7">
            {planner.days.map((day) => (
              <PlannerDayCard
                canWrite={canWrite}
                day={day}
                isSaving={isSaving}
                key={day.date}
                meals={meals}
                mutatePlanner={mutatePlanner}
                selectedMeals={visibleSelectedMeals}
                slotsByKey={slotsByKey}
                updateSelectedMeal={updateSelectedMeal}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlannerDayCard({
  canWrite,
  day,
  isSaving,
  meals,
  mutatePlanner,
  selectedMeals,
  slotsByKey,
  updateSelectedMeal
}: {
  canWrite: boolean;
  day: PlannerViewModel["days"][number];
  isSaving: string | null;
  meals: MealSummary[];
  mutatePlanner: (
    date: string,
    slot: MealSlot,
    body:
      | { action: "assign"; mealId: string }
      | { action: "clear" }
      | { action: "status"; status: PlannerStatus }
  ) => Promise<void>;
  selectedMeals: Record<string, string>;
  slotsByKey: Map<string, PlannerViewModel["slots"][number]>;
  updateSelectedMeal: (key: string, mealId: string) => void;
}) {
  return (
    <Card className="overflow-hidden" key={day.date}>
      <CardHeader className="space-y-1 p-4">
        <CardTitle className="text-base">{day.weekday}</CardTitle>
        <p className="text-sm text-muted-foreground">{day.label}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 lg:space-y-4">
        {mealSlots.map((mealSlot) => {
          const slotKey = getPlannerSlotKey(day.date, mealSlot);
          const slot = slotsByKey.get(slotKey);
          const selectedMealId = selectedMeals[slotKey] ?? slot?.meal?.id ?? "";
          const saving = Boolean(
            isSaving && isSaving.startsWith(`${day.date}-${mealSlot}-`)
          );
          const mealGroups = getMealGroupsForSlot(meals, mealSlot);

          return (
            <section
              className="space-y-3 rounded-md border bg-background p-3"
              key={slotKey}
            >
              <div className="flex items-start gap-2">
                <Utensils className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {mealSlot}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {slot?.meal?.name ?? "Unplanned"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slot?.status ?? "Planned"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`meal-${slotKey}`}>Saved meal</Label>
                <Select
                  disabled={!canWrite || meals.length === 0 || saving}
                  id={`meal-${slotKey}`}
                  onChange={(event) =>
                    updateSelectedMeal(slotKey, event.target.value)
                  }
                  value={selectedMealId}
                >
                  <option value="">Choose a saved meal</option>
                  {mealGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.meals.map((meal) => (
                        <option key={meal.id} value={meal.id}>
                          {meal.mealName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                <Button
                  className="w-full"
                  disabled={!canWrite || !selectedMealId || saving}
                  onClick={() =>
                    void mutatePlanner(day.date, mealSlot, {
                      action: "assign",
                      mealId: selectedMealId
                    })
                  }
                  type="button"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Assign {mealSlot}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {plannerStatuses.map((status) => (
                  <Button
                    disabled={!canWrite || !slot || saving}
                    key={status}
                    onClick={() =>
                      void mutatePlanner(day.date, mealSlot, {
                        action: "status",
                        status
                      })
                    }
                    size="sm"
                    type="button"
                    variant={slot?.status === status ? "default" : "secondary"}
                  >
                    {status}
                  </Button>
                ))}
              </div>

              <Button
                className="w-full"
                disabled={!canWrite || !slot || saving}
                onClick={() =>
                  void mutatePlanner(day.date, mealSlot, {
                    action: "clear"
                  })
                }
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
                Clear {mealSlot}
              </Button>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
