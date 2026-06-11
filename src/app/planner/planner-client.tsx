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
  plannerStatuses,
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

export function PlannerClient() {
  const [planner, setPlanner] = useState<PlannerViewModel | null>(null);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealsError, setMealsError] = useState<string | null>(null);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, PlannerViewModel["slots"][number]>();

    for (const slot of planner?.slots ?? []) {
      if (slot.mealSlot === "Dinner") {
        map.set(slot.planDate, slot);
      }
    }

    return map;
  }, [planner]);

  const loadPlanner = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/planner");
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to load planner."));
        return;
      }

      setPlanner(data as PlannerViewModel);
    } catch {
      setError("Unable to reach the planner service. Try again.");
    }
  }, []);

  const loadMeals = useCallback(async () => {
    setMealsError(null);

    try {
      const response = await fetch("/api/notion/meals?pageSize=100");
      const data: unknown = await response.json();

      if (!response.ok) {
        setMealsError(getErrorMessage(data, "Unable to load saved meals."));
        return;
      }

      setMeals((data as MealsResponse).meals);
    } catch {
      setMealsError("Unable to reach saved meals. Try again.");
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

  function updateSelectedMeal(date: string, mealId: string) {
    setSelectedMeals((current) => ({
      ...current,
      [date]: mealId
    }));
  }

  async function mutatePlanner(
    date: string,
    body:
      | { action: "assign"; mealId: string }
      | { action: "clear" }
      | { action: "status"; status: PlannerStatus }
  ) {
    setIsSaving(`${date}-${body.action}`);
    setError(null);

    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planDate: date,
          slot: "Dinner",
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
              Planner is connected to Meal OS.
            </div>
          )}

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
              Save meals from Analyze before assigning dinners.
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-7">
            {planner.days.map((day) => {
              const slot = slotsByDate.get(day.date);
              const selectedMealId =
                selectedMeals[day.date] ?? slot?.meal?.id ?? "";
              const saving = Boolean(
                isSaving && isSaving.startsWith(`${day.date}-`)
              );

              return (
                <Card className="overflow-hidden" key={day.date}>
                  <CardHeader className="space-y-1 p-4">
                    <CardTitle className="text-base">{day.weekday}</CardTitle>
                    <p className="text-sm text-muted-foreground">{day.label}</p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="rounded-md border bg-background p-3">
                      <div className="flex items-start gap-2">
                        <Utensils className="mt-0.5 h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Dinner
                          </p>
                          <p className="mt-1 truncate text-sm font-medium">
                            {slot?.meal?.name ?? "Unplanned"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {slot?.status ?? "Planned"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`meal-${day.date}`}>Saved meal</Label>
                      <Select
                        disabled={!canWrite || meals.length === 0 || saving}
                        id={`meal-${day.date}`}
                        onChange={(event) =>
                          updateSelectedMeal(day.date, event.target.value)
                        }
                        value={selectedMealId}
                      >
                        <option value="">Choose a saved meal</option>
                        {meals.map((meal) => (
                          <option key={meal.id} value={meal.id}>
                            {meal.mealName}
                          </option>
                        ))}
                      </Select>
                      <Button
                        className="w-full"
                        disabled={!canWrite || !selectedMealId || saving}
                        onClick={() =>
                          void mutatePlanner(day.date, {
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
                        Assign
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {plannerStatuses.map((status) => (
                        <Button
                          disabled={!canWrite || !slot || saving}
                          key={status}
                          onClick={() =>
                            void mutatePlanner(day.date, {
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
                        void mutatePlanner(day.date, {
                          action: "clear"
                        })
                      }
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear dinner
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
