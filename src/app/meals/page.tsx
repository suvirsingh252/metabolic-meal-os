"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Heart,
  Loader2,
  RefreshCw,
  Search,
  XCircle
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

interface MealsResponse {
  meals: MealSummary[];
}

function getErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Unable to load saved meals right now.";
}

export default function MealsPage() {
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "name" | "protein">("newest");
  const [mobileFilter, setMobileFilter] = useState<"recent" | "favorites" | "all">("recent");
  const [showAllMobileMeals, setShowAllMobileMeals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMeals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notion/meals");
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data));
        return;
      }

      setMeals((data as MealsResponse).meals);
    } catch {
      setError("Unable to reach the meals service. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMeals();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMeals]);

  const filteredMeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = meals.filter((meal) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        meal.mealName,
        meal.cuisine,
        meal.mealType,
        meal.proteinLevel,
        meal.bloodSugarImpact
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });

    return [...matches].sort((first, second) => {
      if (sort === "name") {
        return first.mealName.localeCompare(second.mealName);
      }

      if (sort === "protein") {
        return (second.proteinG ?? -1) - (first.proteinG ?? -1);
      }

      return (
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );
    });
  }, [meals, query, sort]);
  const mobileFilteredMeals = useMemo(() => {
    if (mobileFilter === "favorites") {
      return filteredMeals.filter(
        (meal) => meal.familyApproved || meal.comfortMeal || meal.weeknightFriendly
      );
    }

    return filteredMeals;
  }, [filteredMeals, mobileFilter]);
  const mobileVisibleMeals = showAllMobileMeals
    ? mobileFilteredMeals
    : mobileFilteredMeals.slice(0, 6);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="Saved meals"
        title="Meals"
        description="Search recent and favorite meals without scrolling through the full archive."
        action={
          <Button disabled={isLoading} onClick={loadMeals} variant="secondary">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      <Card>
        <CardHeader className="gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Find a meal</CardTitle>
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:hidden">
            {(["recent", "favorites", "all"] as const).map((filter) => (
              <Button
                aria-pressed={mobileFilter === filter}
                key={filter}
                onClick={() => {
                  setMobileFilter(filter);
                  setShowAllMobileMeals(false);
                }}
                size="sm"
                type="button"
                variant={mobileFilter === filter ? "default" : "secondary"}
              >
                {filter === "favorites" ? (
                  <Heart className="h-4 w-4" />
                ) : filter === "recent" ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="capitalize">{filter}</span>
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
            <Input
              aria-label="Search saved meals"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, cuisine, type, or impact"
              value={query}
            />
            <Select
              aria-label="Sort saved meals"
              onChange={(event) =>
                setSort(event.target.value as "newest" | "name" | "protein")
              }
              value={sort}
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A-Z</option>
              <option value="protein">Protein high-low</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading meals...
            </div>
          ) : null}

          {!isLoading && !error && meals.length === 0 ? (
            <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
              No saved meals found yet. Analyze and save a meal to populate this
              view.
            </div>
          ) : null}

          {!isLoading && meals.length > 0 && filteredMeals.length === 0 ? (
            <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
              No meals match the current search.
            </div>
          ) : null}

          {!isLoading && filteredMeals.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 lg:hidden">
                {mobileVisibleMeals.length > 0 ? (
                  mobileVisibleMeals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} />
                  ))
                ) : (
                  <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                    No favorite meals match yet. Switch to Recent or All.
                  </div>
                )}
              </div>
              <div className="hidden gap-3 lg:grid lg:grid-cols-2">
                {filteredMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
              {mobileFilteredMeals.length > mobileVisibleMeals.length ? (
                <Button
                  className="w-full lg:hidden"
                  onClick={() => setShowAllMobileMeals(true)}
                  type="button"
                  variant="secondary"
                >
                  Show all {mobileFilteredMeals.length} meals
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MealCard({
  className,
  meal
}: {
  className?: string;
  meal: MealSummary;
}) {
  const badges = [
    meal.cuisine,
    meal.mealType,
    meal.proteinLevel ? `${meal.proteinLevel} protein` : null,
    meal.bloodSugarImpact ? `${meal.bloodSugarImpact} blood sugar impact` : null
  ].filter((badge): badge is string => Boolean(badge));
  const nutrientHighlights = [
    formatNutrient(meal.calories, "kcal"),
    formatNutrient(meal.proteinG, "g protein"),
    formatNutrient(meal.fiberG, "g fiber")
  ].filter((value): value is string => Boolean(value));
  const preview = getMealPreview(meal.notes);

  return (
    <div className={["rounded-md border bg-background p-4", className].filter(Boolean).join(" ")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            <Link
              className="block transition-colors hover:text-primary"
              href={getMealDetailPath(meal.id)}
            >
              {meal.mealName}
            </Link>
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge}>{badge}</Badge>
            ))}
          </div>
        </div>
      </div>

      {preview ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground sm:mt-4 sm:line-clamp-3">
          {preview}
        </p>
      ) : null}

      {nutrientHighlights.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {nutrientHighlights.map((highlight) => (
            <span
              className="rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground"
              key={highlight}
            >
              {highlight}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 hidden gap-2 text-sm sm:grid md:grid-cols-3">
        <MealFlag checked={meal.familyApproved} label="Family Approved" />
        <MealFlag checked={meal.weeknightFriendly} label="Weeknight Friendly" />
        <MealFlag checked={meal.comfortMeal} label="Comfort Meal" />
      </div>
      <Button asChild className="mt-4 w-full sm:w-auto" variant="secondary">
        <Link
          aria-label={`View meal: ${meal.mealName}`}
          href={getMealDetailPath(meal.id)}
        >
          View meal
        </Link>
      </Button>
    </div>
  );
}

function formatNutrient(value: number | null, label: string) {
  return typeof value === "number" ? `${Math.round(value)} ${label}` : null;
}

function getMealPreview(notes: string | null) {
  if (!notes) {
    return null;
  }

  if (/original notes|analysis framework|evidence-aware/i.test(notes)) {
    return null;
  }

  return notes;
}

function MealFlag({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {label}
    </div>
  );
}
