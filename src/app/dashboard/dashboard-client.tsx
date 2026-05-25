"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Gauge,
  Loader2,
  RefreshCw,
  Salad,
  ShieldCheck,
  Utensils
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MealCalloutCard,
  MealQualityBadge,
  MetricCard,
  NutritionSignalChip,
  RecentMealCard,
  TargetProgressBar
} from "@/src/app/dashboard/dashboard-components";
import { getMealQualityState, getTargetProgressState } from "@/src/app/dashboard/dashboard-display";
import type {
  DashboardInsight,
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
        action={
          <div className="flex flex-wrap gap-2">
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
        description="Daily nutrition, weekly patterns, and the next useful action from saved meal records."
        eyebrow="Behavioral intelligence"
        title="Dashboard"
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
          <TodayOverview dashboard={dashboard} />
          <TargetProgress dashboard={dashboard} />
          <TargetSettings targets={targets} onTargetsChange={setTargets} />
          <QualitySummary dashboard={dashboard} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <SmartInsights insights={dashboard.insights} />
            <WeeklySummary dashboard={dashboard} />
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

function TodayOverview({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <section className="space-y-3">
      <SectionHeading
        helper={`Logged on ${formatDate(dashboard.today.date)}`}
        title="Today overview"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          helper={formatProgress(dashboard.today.progress.caloriesPct)}
          icon={Flame}
          label="Calories"
          value={formatNutrient(dashboard.today.totals.calories, "kcal")}
        />
        <MetricCard
          helper={formatProgress(dashboard.today.progress.proteinPct)}
          icon={ShieldCheck}
          label="Protein"
          tone={dashboard.today.progress.proteinPct && dashboard.today.progress.proteinPct >= 100 ? "positive" : "neutral"}
          value={formatNutrient(dashboard.today.totals.protein, "g")}
        />
        <MetricCard
          helper={formatProgress(dashboard.today.progress.fiberPct)}
          icon={Salad}
          label="Fiber"
          tone={dashboard.today.progress.fiberPct && dashboard.today.progress.fiberPct >= 100 ? "positive" : "neutral"}
          value={formatNutrient(dashboard.today.totals.fiber, "g")}
        />
        <MetricCard
          helper="Saved meals today"
          icon={Utensils}
          label="Meals"
          value={String(dashboard.today.mealCount)}
        />
      </div>
    </section>
  );
}

function TargetProgress({ dashboard }: { dashboard: DashboardViewModel }) {
  const targets = dashboard.today.targets;
  const totals = dashboard.today.totals;

  return (
    <section className="space-y-3">
      <SectionHeading
        helper="Progress respects unknown nutrition values instead of filling blanks with zero."
        title="Target progress"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TargetProgressBar
          state={getTargetProgressState({
            intent: "range",
            target: targets.calories,
            unit: "kcal",
            value: totals.calories
          })}
          title="Calories"
        />
        <TargetProgressBar
          state={getTargetProgressState({
            intent: "gain",
            target: targets.protein,
            unit: "g",
            value: totals.protein
          })}
          title="Protein"
        />
        <TargetProgressBar
          state={getTargetProgressState({
            intent: "gain",
            target: targets.fiber,
            unit: "g",
            value: totals.fiber
          })}
          title="Fiber"
        />
        <TargetProgressBar
          state={getTargetProgressState({
            intent: "limit",
            target: targets.sodium,
            unit: "mg",
            value: totals.sodium
          })}
          title="Sodium"
        />
      </div>
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
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Nutrition targets</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        {(["calories", "protein", "fiber", "sodium"] as const).map((field) => (
          <label className="space-y-2 text-sm" key={field}>
            <span className="capitalize text-muted-foreground">{field}</span>
            <Input
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

function QualitySummary({ dashboard }: { dashboard: DashboardViewModel }) {
  const todayState = getMealQualityState(dashboard.today.averageQualityScore);
  const weekState = getMealQualityState(dashboard.week.averageQualityScore);

  return (
    <section className="space-y-3">
      <SectionHeading
        helper="Quality uses the existing rule-based score and legacy scorecard fallback."
        title="Quality summary"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          helper={<QualitySummaryText score={dashboard.today.averageQualityScore} />}
          icon={Gauge}
          label="Today quality"
          tone={todayState === "strong" ? "positive" : todayState === "attention" ? "warning" : "neutral"}
          value={formatScore(dashboard.today.averageQualityScore)}
        />
        <MetricCard
          helper={<QualitySummaryText score={dashboard.week.averageQualityScore} />}
          icon={CalendarDays}
          label="Weekly quality"
          tone={weekState === "strong" ? "positive" : weekState === "attention" ? "warning" : "neutral"}
          value={formatScore(dashboard.week.averageQualityScore)}
        />
        <MealCalloutCard
          description="Highest-scoring meal in the current dashboard data."
          meal={dashboard.quality.bestRecentMeal}
          title="Best recent meal"
        />
        <MealCalloutCard
          description="Lowest-scoring meal with available quality data."
          meal={dashboard.quality.highestOpportunityMeal}
          title="Highest-opportunity meal"
        />
      </div>
    </section>
  );
}

function QualitySummaryText({ score }: { score: number | null }) {
  return (
    <span className="inline-flex items-center gap-2">
      <MealQualityBadge score={score} />
    </span>
  );
}

function SmartInsights({ insights }: { insights: DashboardInsight[] }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Smart insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {insights.length === 0 ? (
          <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
            No nutrition insights yet. Save meals with nutrition values to populate this view.
          </p>
        ) : null}

        {insights.map((insight) => (
          <div className="rounded-md border bg-background p-4" key={insight.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={insightClassName(insight.severity)}>
                {insight.severity}
              </Badge>
              {insight.metric ? <NutritionSignalChip>{insight.metric}</NutritionSignalChip> : null}
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

function WeeklySummary({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Weekly summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {formatDate(dashboard.week.startDate)} to {formatDate(dashboard.week.endDate)}
        </div>
        <div className="grid gap-2">
          <WeeklySignal
            label="Average protein"
            signal={dashboard.week.trends.proteinConsistency}
            value={formatNutrient(dashboard.week.dailyAverages.protein, "g/day")}
          />
          <WeeklySignal
            label="Average fiber"
            signal={dashboard.week.trends.fiberConsistency}
            value={formatNutrient(dashboard.week.dailyAverages.fiber, "g/day")}
          />
          <WeeklySignal
            label="Calorie variance"
            signal={dashboard.week.trends.calorieVariance}
            value={dashboard.week.trends.calorieVariance}
          />
          <WeeklySignal
            label="Meal count"
            signal="logged"
            value={String(dashboard.week.mealCount)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklySignal({
  label,
  signal,
  value
}: {
  label: string;
  signal: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value}</p>
      </div>
      <NutritionSignalChip tone={signal === "unknown" ? "unavailable" : "steady"}>
        {signal}
      </NutritionSignalChip>
    </div>
  );
}

function RecentMeals({ meals }: { meals: DashboardViewModel["recentMeals"] }) {
  return (
    <section className="space-y-3">
      <SectionHeading helper="Most recent saved meal records." title="Recent meals" />
      {meals.length === 0 ? (
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          No saved meals found yet.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {meals.map((meal) => (
            <RecentMealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </section>
  );
}

function SectionHeading({ helper, title }: { helper: string; title: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

function formatNutrient(value: number | null, unit: string) {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return `${Math.round(value).toLocaleString()} ${unit}`;
}

function formatProgress(value: number | null) {
  return value === null ? "Target progress unavailable" : `${value}% of target`;
}

function formatScore(value: number | null) {
  return value === null ? "Unavailable" : `${value}/100`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
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
