"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingCart,
  Utensils
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type {
  GroceryCategorySection,
  GroceryList
} from "@/src/lib/domain/grocery";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

interface MealsResponse {
  meals: MealSummary[];
}

interface GroceryGenerationResponse {
  list: GroceryList;
  warning?: string;
}

interface GroceryHistorySummary {
  id: string;
  createdAt: string;
  mealIds: string[];
  itemCount: number;
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function GroceryClient({
  preselectedMealId = null
}: {
  preselectedMealId?: string | null;
}) {
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>(
    preselectedMealId ? [preselectedMealId] : []
  );
  const [query, setQuery] = useState("");
  const [list, setList] = useState<GroceryList | null>(null);
  const [history, setHistory] = useState<GroceryHistorySummary[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/grocery-lists");
      const data: unknown = await response.json();

      if (response.ok) {
        setHistory((data as { history?: GroceryHistorySummary[] }).history ?? []);
      }
    } catch {
      // History is supporting context; generation remains the primary workflow.
    }
  }, []);

  const loadMeals = useCallback(async () => {
    setIsLoadingMeals(true);
    setError(null);

    try {
      const response = await fetch("/api/notion/meals?pageSize=100");
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to load saved meals."));
        return;
      }

      setMeals((data as MealsResponse).meals);
    } catch {
      setError("Unable to reach saved meals. Try again.");
    } finally {
      setIsLoadingMeals(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([loadMeals(), loadHistory()]);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHistory, loadMeals]);

  const filteredMeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return meals
      .filter((meal) => {
        if (!normalizedQuery) {
          return true;
        }

        return [meal.mealName, meal.cuisine, meal.mealType]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      })
      .sort((first, second) => first.mealName.localeCompare(second.mealName));
  }, [meals, query]);

  const selectedMeals = useMemo(
    () =>
      selectedMealIds
        .map((mealId) => meals.find((meal) => meal.id === mealId))
        .filter((meal): meal is MealSummary => Boolean(meal)),
    [meals, selectedMealIds]
  );

  const purchasedCount = checkedItemIds.size;
  const totalCount = list?.itemCount ?? 0;

  async function generateList(mealIds = selectedMealIds) {
    if (mealIds.length === 0) {
      setError("Select at least one meal.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarning(null);

    try {
      const response = await fetch("/api/grocery-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mealIds })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to generate grocery list."));
        return;
      }

      const result = data as GroceryGenerationResponse;
      setList(result.list);
      setCheckedItemIds(new Set());
      setWarning(result.warning ?? null);
      void loadHistory();
    } catch {
      setError("Unable to reach the grocery service. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!preselectedMealId || meals.length === 0 || list) {
      return;
    }

    const matchingMeal = meals.find((meal) => meal.id === preselectedMealId);

    if (matchingMeal) {
      const timeoutId = window.setTimeout(() => {
        void generateList([matchingMeal.id]);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, preselectedMealId, list]);

  function toggleMeal(mealId: string) {
    setSelectedMealIds((current) =>
      current.includes(mealId)
        ? current.filter((id) => id !== mealId)
        : [...current, mealId]
    );
  }

  function toggleItem(itemId: string) {
    setCheckedItemIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-accent" />
              Meals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              aria-label="Search meals"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search saved meals"
              value={query}
            />

            {error ? <Alert>{error}</Alert> : null}
            {warning ? <Alert>{warning}</Alert> : null}

            <div className="flex flex-wrap gap-2">
              {selectedMeals.map((meal) => (
                <Badge className="bg-primary text-primary-foreground" key={meal.id}>
                  {meal.mealName}
                </Badge>
              ))}
              {selectedMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Choose one or more meals.
                </p>
              ) : null}
            </div>

            <Button
              className="w-full"
              disabled={isGenerating || selectedMealIds.length === 0}
              onClick={() => void generateList()}
              type="button"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {selectedMealIds.length > 1
                ? "Generate Combined List"
                : "Generate Grocery List"}
            </Button>

            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {isLoadingMeals ? (
                <div className="flex min-h-32 items-center justify-center gap-2 rounded-md border bg-background text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading meals...
                </div>
              ) : null}

              {!isLoadingMeals && filteredMeals.length === 0 ? (
                <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                  No meals match the current search.
                </div>
              ) : null}

              {filteredMeals.map((meal) => {
                const selected = selectedMealIds.includes(meal.id);

                return (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3"
                    key={meal.id}
                  >
                    <Checkbox
                      checked={selected}
                      className="mt-1"
                      onChange={() => toggleMeal(meal.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-6">
                        {meal.mealName}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {[meal.cuisine, meal.mealType]
                          .filter((value): value is string => Boolean(value))
                          .map((value) => (
                            <Badge key={value}>{value}</Badge>
                          ))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {history.length > 0 ? (
          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Recent lists</h2>
              <Button onClick={loadHistory} size="sm" type="button" variant="ghost">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {history.slice(0, 5).map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md bg-background p-3"
                  key={item.id}
                >
                  <span>{formatDate(item.createdAt)}</span>
                  <span>{item.itemCount} items</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="sticky top-20 z-10 rounded-md border bg-card/95 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Shopping progress
              </p>
              <p className="text-2xl font-semibold text-primary" aria-live="polite">
                {purchasedCount} / {totalCount} items purchased
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
          {list ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedMeals.map((meal) => (
                <Link
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  href={getMealDetailPath(meal.id)}
                  key={meal.id}
                >
                  {meal.mealName}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {list ? (
          <GroceryChecklist
            checkedItemIds={checkedItemIds}
            sections={list.sections}
            toggleItem={toggleItem}
          />
        ) : (
          <div className="rounded-md border bg-card p-8 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 text-xl font-semibold">No grocery list yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Select a saved meal, or combine several meals, then generate a
              categorized checklist.
            </p>
            <Button
              className="mt-5"
              disabled={selectedMealIds.length === 0}
              onClick={() => void generateList()}
              type="button"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Generate List
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function GroceryChecklist({
  checkedItemIds,
  sections,
  toggleItem
}: {
  checkedItemIds: Set<string>;
  sections: GroceryCategorySection[];
  toggleItem: (itemId: string) => void;
}) {
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section className="rounded-md border bg-card p-4" key={section.category}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-primary">
              {section.category}
            </h2>
            <Badge>{section.items.length} items</Badge>
          </div>
          <div className="divide-y">
            {section.items.map((item) => {
              const checked = checkedItemIds.has(item.id);

              return (
                <button
                  className="flex min-h-14 w-full items-center gap-3 py-3 text-left"
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  type="button"
                >
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background"
                    ].join(" ")}
                    aria-hidden
                  >
                    {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        "block text-lg font-medium leading-6",
                        checked ? "text-muted-foreground line-through" : ""
                      ].join(" ")}
                    >
                      {item.name}
                    </span>
                    {item.sourceMealNames.length > 1 ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Used by {item.sourceMealNames.length} meals
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
