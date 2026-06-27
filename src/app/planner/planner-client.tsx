"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Save,
  Shuffle,
  ShoppingCart,
  Sparkles,
  Trash2,
  XCircle
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { MealImage } from "@/src/components/meal-image";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import type {
  DinnerPlanDay,
  PlannerSuggestion,
  WeeklyDinnerPlanViewModel,
  WeeklyDinnerSelection,
  WeeklyMealSlot,
  WeeklyPlannerSlot
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

function selectionsFromPlan(plan: WeeklyDinnerPlanViewModel) {
  return Object.fromEntries(
    plan.days.flatMap((day) =>
      day.slots
        .filter((slot) => Boolean(slot.meal))
        .map((slot) => [slot.id, slot.meal!.id])
    )
  );
}

function slotLabel(slot: WeeklyPlannerSlot) {
  return `${slot.dayOfWeek} ${slot.mealSlot.toLowerCase()}`;
}

function prepLabel(minutes: number | null) {
  return typeof minutes === "number" ? `${minutes} min` : "Prep unknown";
}

function availableSuggestionsForSlot(
  slot: WeeklyPlannerSlot,
  selections: Record<string, string>
) {
  const selectedMealIds = new Set(
    Object.entries(selections)
      .filter(([slotId]) => slotId !== slot.id)
      .map(([, mealId]) => mealId)
      .filter(Boolean)
  );

  return slot.suggestions.filter(
    (suggestion) => !selectedMealIds.has(suggestion.mealId)
  );
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
  const mealById = useMemo(
    () => new Map(meals.map((meal) => [meal.id, meal])),
    [meals]
  );
  const plannerDays = useMemo(() => plan?.days ?? [], [plan]);
  const plannerSlots = useMemo(
    () => plannerDays.flatMap((day) => day.slots),
    [plannerDays]
  );
  const activePlannerDay =
    plannerDays[selectedDayIndex] ?? plannerDays[0] ?? null;
  const plannedCount = Object.values(selections).filter(Boolean).length;
  const hasActiveGroceryList = Boolean(plan?.activeGroceryList);

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
      const nextSelections = selectionsFromPlan(nextPlan);

      if (
        preselectedMealId &&
        !Object.values(nextSelections).includes(preselectedMealId)
      ) {
        const firstDinnerSlot = nextPlan.days
          .flatMap((day) => day.slots)
          .find((slot) => slot.mealSlot === "Dinner" && !nextSelections[slot.id]);

        if (firstDinnerSlot) {
          nextSelections[firstDinnerSlot.id] = preselectedMealId;
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

  function updateSelection(slotId: string, mealId: string) {
    setSelections((current) => ({
      ...current,
      [slotId]: mealId
    }));
    setSuccess(null);
  }

  function clearSelection(slotId: string) {
    setSelections((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setSuccess(null);
  }

  function applySuggestion(slotId: string, suggestion: PlannerSuggestion) {
    updateSelection(slotId, suggestion.mealId);
  }

  function randomSuggestion(slot: WeeklyPlannerSlot) {
    const candidates = availableSuggestionsForSlot(slot, selections).filter(
      (suggestion) => suggestion.mealId !== selections[slot.id]
    );
    const suggestion =
      candidates[Math.floor(Math.random() * candidates.length)] ?? null;

    if (suggestion) {
      applySuggestion(slot.id, suggestion);
    }
  }

  function duplicateSlot(slot: WeeklyPlannerSlot) {
    const mealId = selections[slot.id];

    if (!mealId) {
      return;
    }

    const target = plannerSlots.find(
      (candidate) =>
        candidate.id !== slot.id &&
        candidate.mealSlot === slot.mealSlot &&
        !selections[candidate.id]
    );

    if (target) {
      updateSelection(target.id, mealId);
      setSuccess(`Duplicated to ${slotLabel(target)}.`);
    }
  }

  function applyBalanceReplacement(suggestion: PlannerSuggestion) {
    const target =
      plannerSlots.find(
        (slot) => slot.mealSlot === "Dinner" && !selections[slot.id]
      ) ??
      plannerSlots.find((slot) => slot.mealSlot === "Dinner") ??
      plannerSlots[0];

    if (target) {
      applySuggestion(target.id, suggestion);
      setSuccess(`Added ${suggestion.name} to ${slotLabel(target)}.`);
    }
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
    targetSlotId: string
  ) {
    event.preventDefault();
    const sourceSlotId = event.dataTransfer.getData("text/plain");
    const mealId = selections[sourceSlotId];

    if (!sourceSlotId || sourceSlotId === targetSlotId || !mealId) {
      return;
    }

    setSelections((current) => {
      const next = { ...current, [targetSlotId]: mealId };
      delete next[sourceSlotId];
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

    const payload: WeeklyDinnerSelection[] = plan.days.flatMap((day) =>
      day.slots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek as DinnerPlanDay,
        mealSlot: slot.mealSlot as WeeklyMealSlot,
        mealId: selections[slot.id] || null
      }))
    );

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

      const nextPlan = data as WeeklyDinnerPlanViewModel;
      setPlan(nextPlan);
      setSelections(selectionsFromPlan(nextPlan));
      setSuccess("Planner refreshed.");
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
        setError(getErrorMessage(data, "Unable to create shopping list."));
        return;
      }

      const result = data as WeeklyGroceryResponse;
      await load();
      setSuccess(`Shopping list updated with ${result.list.itemCount} items.`);
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
          Loading planner...
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
                {plannedCount} of {plannerSlots.length} lunch/dinner slots planned
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
              Save week
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}
      {success ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <span aria-hidden>✓</span>
          {success}
        </div>
      ) : null}

      {plan ? (
        <WeeklyInsights
          alerts={plan.balanceAlerts}
          applyBalanceReplacement={applyBalanceReplacement}
          insights={plan.weeklyInsights}
        />
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
              <span className="block font-semibold">
                {day.dayOfWeek.slice(0, 3)}
              </span>
              <span className="text-xs opacity-80">{day.label}</span>
            </button>
          ))}
        </div>

        {activePlannerDay ? (
          <PlannerDayPanel
            clearSelection={clearSelection}
            day={activePlannerDay}
            duplicateSlot={duplicateSlot}
            mealById={mealById}
            randomSuggestion={randomSuggestion}
            selections={selections}
            sortedMeals={sortedMeals}
            updateSelection={updateSelection}
            applySuggestion={applySuggestion}
            handleDrop={handleDrop}
          />
        ) : null}
      </section>

      <section className="hidden gap-3 lg:grid lg:grid-cols-7">
        {plannerDays.map((day) => (
          <PlannerDayPanel
            clearSelection={clearSelection}
            day={day}
            duplicateSlot={duplicateSlot}
            key={day.dayOfWeek}
            mealById={mealById}
            randomSuggestion={randomSuggestion}
            selections={selections}
            sortedMeals={sortedMeals}
            updateSelection={updateSelection}
            applySuggestion={applySuggestion}
            handleDrop={handleDrop}
          />
        ))}
      </section>

      {plan ? <ShoppingPreview plan={plan} /> : null}

      <section className="rounded-md border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Shopping list</h2>
            {plan?.activeGroceryList ? (
              <p className="text-sm text-muted-foreground">
                {plan.activeGroceryList.completedCount} /{" "}
                {plan.activeGroceryList.itemCount} items purchased
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Create one list from the weekly plan.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {plan?.activeGroceryList ? (
              <Button asChild type="button" variant="secondary">
                <Link href={`/grocery?list=${plan.activeGroceryList.id}`}>
                  <ShoppingCart className="h-4 w-4" />
                  Open list
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
                ? "Update Shopping List"
                : "Create Shopping List"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function WeeklyInsights({
  alerts,
  applyBalanceReplacement,
  insights
}: {
  alerts: WeeklyDinnerPlanViewModel["balanceAlerts"];
  applyBalanceReplacement: (suggestion: PlannerSuggestion) => void;
  insights: WeeklyDinnerPlanViewModel["weeklyInsights"];
}) {
  return (
    <section className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Weekly insights</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {insights.map((insight) => (
          <div className="rounded-md border bg-background p-3" key={insight.label}>
            <p className="text-xs text-muted-foreground">{insight.label}</p>
            <p
              className={[
                "mt-1 text-base font-semibold",
                insight.tone === "warning" ? "text-destructive" : "",
                insight.tone === "good" ? "text-primary" : ""
              ].join(" ")}
            >
              {insight.value}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            key={alert.id}
          >
            <div className="flex gap-2">
              {alert.severity === "warning" ? (
                <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              )}
              <div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
            </div>
            {alert.replacement ? (
              <Button
                onClick={() => applyBalanceReplacement(alert.replacement!)}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Shuffle className="h-4 w-4" />
                Use {alert.replacement.name}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function PlannerDayPanel({
  applySuggestion,
  clearSelection,
  day,
  duplicateSlot,
  handleDrop,
  mealById,
  randomSuggestion,
  selections,
  sortedMeals,
  updateSelection
}: {
  applySuggestion: (slotId: string, suggestion: PlannerSuggestion) => void;
  clearSelection: (slotId: string) => void;
  day: PlannerDay;
  duplicateSlot: (slot: WeeklyPlannerSlot) => void;
  handleDrop: (
    event: React.DragEvent<HTMLDivElement>,
    targetSlotId: string
  ) => void;
  mealById: Map<string, MealSummary>;
  randomSuggestion: (slot: WeeklyPlannerSlot) => void;
  selections: Record<string, string>;
  sortedMeals: MealSummary[];
  updateSelection: (slotId: string, mealId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div>
          <h2 className="font-semibold">{day.dayOfWeek}</h2>
          <p className="text-sm text-muted-foreground">{day.label}</p>
        </div>
        {day.slots.map((slot) => (
          <PlannerSlotCard
            applySuggestion={applySuggestion}
            clearSelection={clearSelection}
            duplicateSlot={duplicateSlot}
            handleDrop={handleDrop}
            key={slot.id}
            meal={mealById.get(selections[slot.id]) ?? null}
            randomSuggestion={randomSuggestion}
            selections={selections}
            selectedMealId={selections[slot.id] ?? ""}
            slot={slot}
            sortedMeals={sortedMeals}
            updateSelection={updateSelection}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PlannerSlotCard({
  applySuggestion,
  clearSelection,
  duplicateSlot,
  handleDrop,
  meal,
  randomSuggestion,
  selections,
  selectedMealId,
  slot,
  sortedMeals,
  updateSelection
}: {
  applySuggestion: (slotId: string, suggestion: PlannerSuggestion) => void;
  clearSelection: (slotId: string) => void;
  duplicateSlot: (slot: WeeklyPlannerSlot) => void;
  handleDrop: (
    event: React.DragEvent<HTMLDivElement>,
    targetSlotId: string
  ) => void;
  meal: MealSummary | null;
  randomSuggestion: (slot: WeeklyPlannerSlot) => void;
  selections: Record<string, string>;
  selectedMealId: string;
  slot: WeeklyPlannerSlot;
  sortedMeals: MealSummary[];
  updateSelection: (slotId: string, mealId: string) => void;
}) {
  const availableSuggestions = availableSuggestionsForSlot(slot, selections);
  const primarySuggestion = availableSuggestions[0] ?? null;

  return (
    <div
      className="rounded-md border bg-background"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDrop(event, slot.id)}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{slot.mealSlot}</h3>
        {meal ? (
          <Badge>{prepLabel(slot.prepTimeMinutes)}</Badge>
        ) : (
          <Badge>Open</Badge>
        )}
      </div>
      <div className="space-y-3 p-3">
        <Select
          aria-label={`Choose ${slotLabel(slot)}`}
          onChange={(event) => updateSelection(slot.id, event.target.value)}
          value={selectedMealId}
        >
          <option value="">No meal selected</option>
          {sortedMeals.map((option) => (
            <option key={option.id} value={option.id}>
              {option.mealName}
            </option>
          ))}
        </Select>

        {meal ? (
          <div
            draggable
            onDragStart={(event) =>
              event.dataTransfer.setData("text/plain", slot.id)
            }
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
              <MealImage
                alt={`${meal.mealName} image`}
                imageUrl={meal.imageUrl}
                sizes="(min-width: 1024px) 13vw, 100vw"
              />
            </div>
            <div className="mt-3 space-y-2">
              <Link
                className="block text-base font-semibold leading-6 text-primary underline-offset-4 hover:underline"
                href={getMealDetailPath(meal.id)}
              >
                {meal.mealName}
              </Link>
              <div className="flex flex-wrap gap-1.5">
                {[meal.cuisine, prepLabel(slot.prepTimeMinutes), ...slot.intelligenceBadges]
                  .filter((value): value is string => Boolean(value))
                  .map((value) => (
                    <Badge key={value}>{value}</Badge>
                  ))}
              </div>
            </div>
          </div>
        ) : primarySuggestion ? (
          <SuggestionPreview
            applySuggestion={(suggestion) => applySuggestion(slot.id, suggestion)}
            suggestion={primarySuggestion}
          />
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Choose a dinner.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!primarySuggestion}
            onClick={() => randomSuggestion(slot)}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Shuffle className="h-4 w-4" />
            Suggest
          </Button>
          <Button
            disabled={!selectedMealId}
            onClick={() => duplicateSlot(slot)}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button
            disabled={!primarySuggestion}
            onClick={() =>
              primarySuggestion ? applySuggestion(slot.id, primarySuggestion) : null
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            <RefreshCw className="h-4 w-4" />
            Replace
          </Button>
          <Button
            disabled={!selectedMealId}
            onClick={() => clearSelection(slot.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuggestionPreview({
  applySuggestion,
  suggestion
}: {
  applySuggestion: (suggestion: PlannerSuggestion) => void;
  suggestion: PlannerSuggestion;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="relative aspect-[4/3] w-full">
        <MealImage
          alt={`${suggestion.name} suggestion image`}
          imageUrl={suggestion.imageUrl}
          sizes="(min-width: 1024px) 13vw, 100vw"
        />
      </div>
      <div className="space-y-2 p-3">
        <p className="font-semibold">{suggestion.name}</p>
        <div className="flex flex-wrap gap-1.5">
          {[suggestion.cuisine, prepLabel(suggestion.prepTimeMinutes), ...suggestion.badges]
            .filter((value): value is string => Boolean(value))
            .map((value) => (
              <Badge key={value}>{value}</Badge>
            ))}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {suggestion.explanation}
        </p>
        <Button
          className="w-full"
          onClick={() => applySuggestion(suggestion)}
          size="sm"
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          Add to plan
        </Button>
      </div>
    </div>
  );
}

function ShoppingPreview({ plan }: { plan: WeeklyDinnerPlanViewModel }) {
  return (
    <section className="space-y-3 rounded-md border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">Shopping preview</h2>
        <p className="text-sm text-muted-foreground">
          Ingredients from the current weekly plan.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {plan.shoppingPreview.map((section) => (
          <div className="rounded-md border bg-background p-3" key={section.category}>
            <h3 className="font-medium">{section.category}</h3>
            {section.items.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nothing yet</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
