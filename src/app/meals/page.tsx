"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
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

  return "Unable to load meals from Notion right now.";
}

export default function MealsPage() {
  const [meals, setMeals] = useState<MealSummary[]>([]);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Structured records"
        title="Meals"
        description="Browse saved meals from the Notion Meals database."
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
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Saved meal records</CardTitle>
          <Search className="h-5 w-5 text-muted-foreground" />
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

          {!isLoading && meals.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MealCard({ meal }: { meal: MealSummary }) {
  const badges = [
    meal.cuisine,
    meal.mealType,
    meal.proteinLevel ? `${meal.proteinLevel} protein` : null,
    meal.bloodSugarImpact ? `${meal.bloodSugarImpact} blood sugar impact` : null
  ].filter((badge): badge is string => Boolean(badge));

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            <Link
              className="transition-colors hover:text-primary"
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
        <Button asChild size="sm" variant="ghost">
          <a href={meal.url} rel="noreferrer" target="_blank">
            Notion
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {meal.notes ? (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {meal.notes}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        <MealFlag checked={meal.familyApproved} label="Family Approved" />
        <MealFlag checked={meal.weeknightFriendly} label="Weeknight Friendly" />
        <MealFlag checked={meal.comfortMeal} label="Comfort Meal" />
      </div>
      <Button asChild className="mt-4 w-full sm:w-auto" variant="secondary">
        <Link href={getMealDetailPath(meal.id)}>View meal</Link>
      </Button>
    </div>
  );
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
