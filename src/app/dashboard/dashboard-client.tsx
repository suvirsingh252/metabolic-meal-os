"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Loader2,
  RefreshCw,
  Salad,
  ShieldCheck,
  Utensils
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardInsight,
  DashboardMealSummary,
  DashboardViewModel,
  NutritionTargets
} from "@/src/lib/domain/analytics";

function getErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Unable to load dashboard intelligence right now.";
}

export function DashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardViewModel | null>(null);
  const [targets, setTargets] = useState<NutritionTargets>({
    calories: 2200,
    protein: 140,
    fiber: 30,
    sodium: 2300
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        calories: String(targets.calories),
        protein: String(targets.protein),
        fiber: String(targets.fiber),
        sodium: String(targets.sodium)
      });
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data));
        return;
      }

      setDashboard(data as DashboardViewModel);
    } catch {
      setError("Unable to reach the dashboard service. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [targets]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedTargets = window.localStorage.getItem("nutritionTargets");

      if (storedTargets) {
        try {
          const parsed = JSON.parse(storedTargets) as Partial<NutritionTargets>;
          setTargets((current) => ({
            calories: readStoredTarget(parsed.calories, current.calories),
            protein: readStoredTarget(parsed.protein, current.protein),
            fiber: readStoredTarget(parsed.fiber, current.fiber),
            sodium: readStoredTarget(parsed.sodium, current.sodium)
          }));
        } catch {
          window.localStorage.removeItem("nutritionTargets");
        }
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("nutritionTargets", JSON.stringify(targets));
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard, targets]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Behavioral intelligence"
        title="Dashboard"
        description="Daily nutrition, weekly patterns, and the next useful action from saved meal records."
        action={
          <div className="flex gap-2">
            <Button disabled={isLoading} onClick={loadDashboard} variant="secondary">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button asChild>
              <Link href="/analyze">
                Analyze
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      {isLoading && !dashboard ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      ) : null}

      {dashboard ? (
        <>
          <DailySnapshot dashboard={dashboard} />
          <TargetSettings targets={targets} onTargetsChange={setTargets} />
          <QualitySnapshot dashboard={dashboard} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <SmartInsights insights={dashboard.insights} />
            <WeeklyTrends dashboard={dashboard} />
          </div>
          <RecentMeals meals={dashboard.recentMeals} />
        </>
      ) : null}
    </div>
  );
}

function readStoredTarget(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function DailySnapshot({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <SnapshotCard
        icon={Flame}
        label="Calories"
        value={formatNutrient(dashboard.today.totals.calories, "kcal")}
        helper={formatProgress(dashboard.today.progress.caloriesPct)}
      />
      <SnapshotCard
        icon={ShieldCheck}
        label="Protein"
        value={formatNutrient(dashboard.today.totals.protein, "g")}
        helper={formatProgress(dashboard.today.progress.proteinPct)}
      />
      <SnapshotCard
        icon={Salad}
        label="Fiber"
        value={formatNutrient(dashboard.today.totals.fiber, "g")}
        helper={formatProgress(dashboard.today.progress.fiberPct)}
      />
      <SnapshotCard
        icon={Utensils}
        label="Meals"
        value={String(dashboard.today.mealCount)}
        helper={`Logged on ${formatDate(dashboard.today.date)}`}
      />
    </section>
  );
}

function TargetSettings({
  onTargetsChange,
  targets
}: {
  onTargetsChange: (targets: NutritionTargets) => void;
  targets: NutritionTargets;
}) {
  function updateTarget(field: keyof NutritionTargets, value: string) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return;
    }

    onTargetsChange({
      ...targets,
      [field]: numberValue
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition targets</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        {(["calories", "protein", "fiber", "sodium"] as const).map((field) => (
          <label className="space-y-2 text-sm" key={field}>
            <span className="capitalize text-muted-foreground">{field}</span>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
              min={1}
              onChange={(event) => updateTarget(field, event.target.value)}
              type="number"
              value={targets[field]}
            />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function QualitySnapshot({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <SnapshotCard
        icon={ShieldCheck}
        label="Today quality"
        value={formatScore(dashboard.today.averageQualityScore)}
        helper="Average saved meal quality"
      />
      <SnapshotCard
        icon={CalendarDays}
        label="Weekly quality"
        value={formatScore(dashboard.week.averageQualityScore)}
        helper="7-day average quality"
      />
      <SnapshotCard
        icon={Salad}
        label="Best recent"
        value={dashboard.quality.bestRecentMeal?.name ?? "Unknown"}
        helper={formatScore(dashboard.quality.bestRecentMeal?.qualityScore ?? null)}
      />
      <SnapshotCard
        icon={ArrowRight}
        label="Opportunity"
        value={dashboard.quality.highestOpportunityMeal?.name ?? "Unknown"}
        helper={formatScore(
          dashboard.quality.highestOpportunityMeal?.qualityScore ?? null
        )}
      />
    </section>
  );
}

function SnapshotCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function SmartInsights({ insights }: { insights: DashboardInsight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
            No nutrition insights yet. Save meals with nutrition values to populate this view.
          </p>
        ) : null}

        {insights.map((insight) => (
          <div
            className="rounded-md border bg-background p-4"
            key={insight.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={insightClassName(insight.severity)}>
                {insight.severity}
              </Badge>
              {insight.metric ? <Badge>{insight.metric}</Badge> : null}
            </div>
            <h2 className="mt-3 font-semibold">{insight.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {insight.message}
            </p>
            {insight.action ? (
              <p className="mt-3 text-sm font-medium">{insight.action}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WeeklyTrends({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly trends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {formatDate(dashboard.week.startDate)} to {formatDate(dashboard.week.endDate)}
        </div>
        <TrendRow
          label="Average protein"
          value={formatNutrient(dashboard.week.dailyAverages.protein, "g/day")}
        />
        <TrendRow
          label="Average fiber"
          value={formatNutrient(dashboard.week.dailyAverages.fiber, "g/day")}
        />
        <TrendRow label="Meal count" value={String(dashboard.week.mealCount)} />
        <TrendRow
          label="Calorie variance"
          value={dashboard.week.trends.calorieVariance}
        />
      </CardContent>
    </Card>
  );
}

function TrendRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-background px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RecentMeals({ meals }: { meals: DashboardMealSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent meals</CardTitle>
      </CardHeader>
      <CardContent>
        {meals.length === 0 ? (
          <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
            No saved meals found yet.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {meals.map((meal) => (
              <RecentMealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentMealCard({ meal }: { meal: DashboardMealSummary }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold">{meal.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(meal.loggedAt)}
          </p>
        </div>
        {meal.url ? (
          <Button asChild size="sm" variant="secondary">
            <a href={meal.url} rel="noreferrer" target="_blank">
              Open
            </a>
          </Button>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{formatNutrient(meal.calories, "kcal")}</Badge>
        <Badge>{formatNutrient(meal.protein, "g protein")}</Badge>
        <Badge>
          {meal.confidence ?? meal.provenance ?? "nutrition not persisted"}
        </Badge>
        <Badge>{formatScore(meal.qualityScore)} quality</Badge>
      </div>
    </div>
  );
}

function formatNutrient(value: number | null, unit: string) {
  if (typeof value !== "number") {
    return "Unknown";
  }

  return `${Math.round(value).toLocaleString()} ${unit}`;
}

function formatProgress(value: number | null) {
  return value === null ? "Target progress unavailable" : `${value}% of target`;
}

function formatScore(value: number | null) {
  return value === null ? "Unknown" : `${value}/100`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function insightClassName(severity: DashboardInsight["severity"]) {
  if (severity === "positive") {
    return "bg-primary text-primary-foreground";
  }

  if (severity === "warning") {
    return "bg-accent text-accent-foreground";
  }

  return "";
}
