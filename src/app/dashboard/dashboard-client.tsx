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
import { Label } from "@/components/ui/label";
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
  const [appliedTargets, setAppliedTargets] = useState<NutritionTargets>({
    calories: 2200,
    protein: 140,
    fiber: 30,
    sodium: 2300
  });
  const [draftTargets, setDraftTargets] = useState<NutritionTargets>({
    calories: 2200,
    protein: 140,
    fiber: 30,
    sodium: 2300
  });
  const [targetsReady, setTargetsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        calories: String(appliedTargets.calories),
        protein: String(appliedTargets.protein),
        fiber: String(appliedTargets.fiber),
        sodium: String(appliedTargets.sodium)
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
  }, [appliedTargets]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedTargets = window.localStorage.getItem("nutritionTargets");

      if (storedTargets) {
        try {
          const parsed = JSON.parse(storedTargets) as Partial<NutritionTargets>;
          setAppliedTargets((current) => ({
            calories: readStoredTarget(parsed.calories, current.calories),
            protein: readStoredTarget(parsed.protein, current.protein),
            fiber: readStoredTarget(parsed.fiber, current.fiber),
            sodium: readStoredTarget(parsed.sodium, current.sodium)
          }));
          setDraftTargets((current) => ({
            calories: readStoredTarget(parsed.calories, current.calories),
            protein: readStoredTarget(parsed.protein, current.protein),
            fiber: readStoredTarget(parsed.fiber, current.fiber),
            sodium: readStoredTarget(parsed.sodium, current.sodium)
          }));
        } catch {
          window.localStorage.removeItem("nutritionTargets");
        }
      }

      setTargetsReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!targetsReady) {
      return;
    }

    window.localStorage.setItem("nutritionTargets", JSON.stringify(appliedTargets));
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appliedTargets, loadDashboard, targetsReady]);

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
          <HouseholdTakeaways dashboard={dashboard} />
          <TodayOverview dashboard={dashboard} />
          <TargetProgress dashboard={dashboard} />
          <TargetSettings
            isLoading={isLoading}
            onApply={() => setAppliedTargets(draftTargets)}
            onTargetsChange={setDraftTargets}
            targets={draftTargets}
            targetsChanged={!areTargetsEqual(draftTargets, appliedTargets)}
          />
          <QualitySummary dashboard={dashboard} />
          <DataReliabilitySummary dashboard={dashboard} />
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

function areTargetsEqual(first: NutritionTargets, second: NutritionTargets) {
  return (
    first.calories === second.calories &&
    first.protein === second.protein &&
    first.fiber === second.fiber &&
    first.sodium === second.sodium
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
        helper={`Today: ${formatDateWithYear(dashboard.today.date)}`}
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

function HouseholdTakeaways({ dashboard }: { dashboard: DashboardViewModel }) {
  const confidence = getHouseholdConfidence(dashboard);
  const missingNutrition = dashboard.week.sourceMix.missingNutrition;
  const nutritionLimited = missingNutrition > 0;
  const firstInsight = dashboard.insights[0];

  return (
    <section className="space-y-3">
      <SectionHeading
        helper={`This week: ${formatDateWithYear(
          dashboard.week.startDate
        )} to ${formatDateWithYear(dashboard.week.endDate)}`}
        title="Household takeaways"
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">What did we learn?</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-sm leading-6 text-muted-foreground">
            {dashboard.week.mealCount > 0
              ? `${dashboard.week.mealCount} saved meals are shaping this week's view. Meal OS is using saved quality, nutrition, and household feedback where available.`
              : "No saved meals are in this week's window yet."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">What should we do next?</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-sm leading-6 text-muted-foreground">
            {firstInsight?.action ?? firstInsight?.message ??
              "Save one detailed meal or log feedback on a recent meal to improve future suggestions."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">How confident is this?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2 text-sm leading-6 text-muted-foreground">
            <p>{confidence}</p>
            {nutritionLimited ? (
              <p>
                Nutrition totals are limited right now, so Meal OS is leaning more
                on meal quality and household feedback.
              </p>
            ) : null}
          </CardContent>
        </Card>
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
  isLoading,
  onApply,
  onTargetsChange,
  targets,
  targetsChanged
}: {
  isLoading: boolean;
  onApply: () => void;
  onTargetsChange: (targets: NutritionTargets) => void;
  targets: NutritionTargets;
  targetsChanged: boolean;
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
      <CardHeader className="flex-col gap-3 p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Nutrition targets</CardTitle>
        <Button
          disabled={isLoading || !targetsChanged}
          onClick={onApply}
          size="sm"
          type="button"
          variant="secondary"
        >
          Apply targets
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        {(["calories", "protein", "fiber", "sodium"] as const).map((field) => (
          <div className="space-y-2 text-sm" key={field}>
            <Label
              className="capitalize text-muted-foreground"
              htmlFor={`target-${field}`}
            >
              {field}
            </Label>
            <Input
              id={`target-${field}`}
              min={1}
              name={field}
              onChange={(event) => updateTarget(field, event.target.value)}
              type="number"
              value={targets[field]}
            />
          </div>
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
        helper="Quality combines saved nutrition and meal pattern signals where available."
        title="Quality summary"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          helper={
            <QualitySummaryText
              sample={dashboard.today.qualitySample}
              score={dashboard.today.averageQualityScore}
            />
          }
          icon={Gauge}
          label="Today quality"
          tone={todayState === "strong" ? "positive" : todayState === "attention" ? "warning" : "neutral"}
          value={formatScore(dashboard.today.averageQualityScore)}
        />
        <MetricCard
          helper={
            <QualitySummaryText
              sample={dashboard.week.qualitySample}
              score={dashboard.week.averageQualityScore}
            />
          }
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

function QualitySummaryText({
  sample,
  score
}: {
  sample: DashboardViewModel["today"]["qualitySample"];
  score: number | null;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <MealQualityBadge score={score} />
      <span>{sample.label}</span>
    </span>
  );
}

function DataReliabilitySummary({ dashboard }: { dashboard: DashboardViewModel }) {
  const mix = dashboard.week.sourceMix;
  const calorieSample = dashboard.week.nutritionCompleteness.calories;
  const proteinSample = dashboard.week.nutritionCompleteness.protein;
  const fiberSample = dashboard.week.nutritionCompleteness.fiber;

  return (
    <details className="rounded-md border bg-card p-4">
      <summary className="cursor-pointer font-medium">Advanced data coverage</summary>
      <div className="mt-3">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <NutritionSignalChip tone={mix.structured > 0 ? "steady" : "unavailable"}>
              {mix.structured} recipe nutrition
            </NutritionSignalChip>
            <NutritionSignalChip tone={mix.estimated > 0 ? "steady" : "unavailable"}>
              {mix.estimated} Meal OS estimates
            </NutritionSignalChip>
            <NutritionSignalChip tone={mix.userEntered + mix.reviewed > 0 ? "positive" : "unavailable"}>
              {mix.userEntered + mix.reviewed} reviewed by household
            </NutritionSignalChip>
            <NutritionSignalChip tone={mix.backfilled > 0 ? "warning" : "unavailable"}>
              {mix.backfilled} older saved records
            </NutritionSignalChip>
            <NutritionSignalChip tone={mix.missingNutrition > 0 ? "unavailable" : "positive"}>
              {mix.missingNutrition} missing nutrition
            </NutritionSignalChip>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <ReliabilityLine label="Calories" sample={calorieSample.label} />
            <ReliabilityLine label="Protein" sample={proteinSample.label} />
            <ReliabilityLine label="Fiber" sample={fiberSample.label} />
          </div>
        </CardContent>
      </div>
    </details>
  );
}

function ReliabilityLine({ label, sample }: { label: string; sample: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2.5 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{sample}</p>
    </div>
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
          This week: {formatDateWithYear(dashboard.week.startDate)} to{" "}
          {formatDateWithYear(dashboard.week.endDate)}
        </div>
        <div className="grid gap-2">
          <WeeklySignal
            label="Average protein"
            signal={dashboard.week.trends.proteinConsistency}
            value={formatNutrient(dashboard.week.dailyAverages.protein, "g/day")}
            detail={dashboard.week.nutritionCompleteness.protein.label}
          />
          <WeeklySignal
            label="Average fiber"
            signal={dashboard.week.trends.fiberConsistency}
            value={formatNutrient(dashboard.week.dailyAverages.fiber, "g/day")}
            detail={dashboard.week.nutritionCompleteness.fiber.label}
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
  detail,
  label,
  signal,
  value
}: {
  detail?: string;
  label: string;
  signal: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
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

function formatDateWithYear(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getHouseholdConfidence(dashboard: DashboardViewModel) {
  if (dashboard.week.mealCount === 0) {
    return "Low confidence until meals are saved for this week.";
  }

  if (
    dashboard.week.qualitySample.isEnoughData &&
    dashboard.week.sourceMix.missingNutrition === 0
  ) {
    return "Good confidence for this week's saved meals.";
  }

  if (dashboard.week.qualitySample.scoredMeals > 0) {
    return "Medium confidence because some quality signals are available.";
  }

  return "Low confidence because saved nutrition and feedback are limited.";
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
