"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
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
  GroceryCategory,
  GroceryList
} from "@/src/lib/domain/grocery";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

interface MealsResponse {
  meals: MealSummary[];
}

interface PersistedGroceryItem {
  id: string;
  ingredient: string;
  category: GroceryCategory;
  completed: boolean;
  sortOrder: number;
}

interface PersistedGroceryList {
  id: string;
  createdAt: string;
  updatedAt: string;
  mealIds: string[];
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
  weekStartDate: string | null;
  sourceType: string | null;
  sections: Array<{
    category: GroceryCategory;
    items: PersistedGroceryItem[];
  }>;
}

interface GroceryGenerationResponse {
  list: GroceryList;
  persistedList?: PersistedGroceryList;
  warning?: string;
}

interface GroceryHistorySummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  mealIds: string[];
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
  weekStartDate: string | null;
  sourceType: string | null;
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

function toClientOnlyPersistedList(list: GroceryList): PersistedGroceryList {
  return {
    id: list.id ?? "client-only",
    createdAt: list.createdAt,
    updatedAt: list.createdAt,
    mealIds: list.mealIds,
    itemCount: list.itemCount,
    completedCount: 0,
    completionPercentage: 0,
    weekStartDate: null,
    sourceType: null,
    sections: list.sections.map((section) => ({
      category: section.category,
      items: section.items.map((item, index) => ({
        id: item.id,
        ingredient: item.name,
        category: item.category,
        completed: false,
        sortOrder: index
      }))
    }))
  };
}

function updateGroceryItemCompletion(
  list: PersistedGroceryList,
  itemId: string,
  completed: boolean
): PersistedGroceryList {
  const sections = list.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.id === itemId ? { ...item, completed } : item
    )
  }));
  const completedCount = sections.reduce(
    (total, section) =>
      total + section.items.filter((item) => item.completed).length,
    0
  );

  return {
    ...list,
    completedCount,
    completionPercentage:
      list.itemCount > 0 ? Math.round((completedCount / list.itemCount) * 100) : 0,
    sections
  };
}

function SuccessNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="hearth-fade-in flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
      <CheckCircle2 className="h-4 w-4" />
      <span aria-hidden>✓</span>
      <span>{children}</span>
    </div>
  );
}

export function GroceryClient({
  preselectedMealId = null,
  initialListId = null
}: {
  preselectedMealId?: string | null;
  initialListId?: string | null;
}) {
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>(
    preselectedMealId ? [preselectedMealId] : []
  );
  const [query, setQuery] = useState("");
  const [list, setList] = useState<PersistedGroceryList | null>(null);
  const [history, setHistory] = useState<GroceryHistorySummary[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const loadList = useCallback(async (listId: string) => {
    setIsLoadingList(true);
    setError(null);
    setWarning(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/grocery-lists/${listId}`);
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data, "Unable to load shopping list."));
        return;
      }

      const loaded = (data as { list: PersistedGroceryList }).list;
      setList(loaded);
      setSelectedMealIds(loaded.mealIds);
    } catch {
      setError("Unable to reach the grocery service. Try again.");
    } finally {
      setIsLoadingList(false);
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
      void Promise.all([
        loadMeals(),
        loadHistory(),
        initialListId ? loadList(initialListId) : Promise.resolve()
      ]);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialListId, loadHistory, loadList, loadMeals]);

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

  const purchasedCount = list?.completedCount ?? 0;
  const totalCount = list?.itemCount ?? 0;

  async function generateList(mealIds = selectedMealIds) {
    if (mealIds.length === 0) {
      setError("Select at least one meal.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarning(null);
    setSuccess(null);

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
        setError(getErrorMessage(data, "Unable to create shopping list."));
        return;
      }

      const result = data as GroceryGenerationResponse;
      setWarning(result.warning ?? null);

      setList(result.persistedList ?? toClientOnlyPersistedList(result.list));
      setSuccess(`Shopping list updated with ${result.list.itemCount} items.`);

      void loadHistory();
    } catch {
      setError("Unable to reach the grocery service. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!preselectedMealId || initialListId || meals.length === 0 || list) {
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
  }, [initialListId, meals, preselectedMealId, list]);

  function toggleMeal(mealId: string) {
    setSelectedMealIds((current) =>
      current.includes(mealId)
        ? current.filter((id) => id !== mealId)
        : [...current, mealId]
    );
  }

  async function toggleItem(item: PersistedGroceryItem) {
    if (!list || pendingItemId) {
      return;
    }

    setPendingItemId(item.id);
    setError(null);
    setSuccess(null);
    const previousList = list;
    const nextCompleted = !item.completed;
    setList((current) =>
      current ? updateGroceryItemCompletion(current, item.id, nextCompleted) : current
    );

    try {
      const response = await fetch(`/api/grocery-lists/${list.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          itemId: item.id,
          completed: !item.completed
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setList(previousList);
        setError(getErrorMessage(data, "Unable to update shopping list."));
        return;
      }

      setList((data as { list: PersistedGroceryList }).list);
      setSuccess("Shopping list updated.");
      void loadHistory();
    } catch {
      setList(previousList);
      setError("Unable to reach the grocery service. Try again.");
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-accent" />
              Dinners
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
            {success ? <SuccessNotice>{success}</SuccessNotice> : null}

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
                ? "Create Combined List"
                : "Create Shopping List"}
            </Button>

            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {isLoadingMeals ? (
                <div className="flex min-h-32 items-center justify-center gap-2 rounded-md border bg-background text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading dinners...
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
              <h2 className="font-semibold">Recent shopping lists</h2>
              <Button onClick={loadHistory} size="sm" type="button" variant="ghost">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {history.slice(0, 6).map((item) => (
                <button
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md bg-background p-3 text-left"
                  key={item.id}
                  onClick={() => void loadList(item.id)}
                  type="button"
                >
                  <span>
                    <span className="block font-medium text-foreground">
                      {formatDate(item.updatedAt)}
                    </span>
                    <span>
                      {item.completedCount} / {item.itemCount} purchased
                    </span>
                  </span>
                  <Badge>{item.completionPercentage}%</Badge>
                </button>
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
            {isLoadingList ? (
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-accent" />
            )}
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
            pendingItemId={pendingItemId}
            sections={list.sections}
            toggleItem={toggleItem}
          />
        ) : (
          <div className="rounded-md border bg-card p-8 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 text-xl font-semibold">No shopping list yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Choose one dinner, or combine several, then create a categorized
              checklist.
            </p>
            <Button
              className="mt-5"
              disabled={selectedMealIds.length === 0}
              onClick={() => void generateList()}
              type="button"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Create List
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function GroceryChecklist({
  pendingItemId,
  sections,
  toggleItem
}: {
  pendingItemId: string | null;
  sections: PersistedGroceryList["sections"];
  toggleItem: (item: PersistedGroceryItem) => void;
}) {
  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const completedCount = section.items.filter((item) => item.completed).length;
        const complete = completedCount === section.items.length;

        return (
          <details
            className="rounded-md border bg-card p-4"
            key={section.category}
            open={!complete}
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-semibold text-primary">
                  {section.category}
                </span>
              </span>
              <Badge>
                {completedCount} / {section.items.length}
              </Badge>
            </summary>
            <div className="mt-3 divide-y">
              {section.items.map((item) => {
                const checked = item.completed;

                return (
                  <button
                    className="flex min-h-16 w-full items-center gap-3 py-3 text-left"
                    disabled={pendingItemId === item.id}
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    type="button"
                  >
                    <span
                      className={[
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background"
                      ].join(" ")}
                      aria-hidden
                    >
                      {pendingItemId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : checked ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          "block text-lg font-medium leading-6",
                          checked ? "text-muted-foreground line-through" : ""
                        ].join(" ")}
                      >
                        {item.ingredient}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
