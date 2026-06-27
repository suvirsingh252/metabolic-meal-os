"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Flame,
  Gauge,
  Lightbulb,
  Loader2,
  RefreshCw,
  Salad,
  ShieldCheck,
  Trophy,
  Utensils
} from "lucide-react";
import Link from "next/link";
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

  return "Unable to load insights right now.";
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
      setError("Unable to reach the insights service. Try again.");
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
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-accent">Household intelligence</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-normal text-primary md:text-5xl">
          Insights
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          What Hearth is learning from your saved meals.
        </p>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      {isLoading && !dashboard ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl bg-card text-sm text-muted-foreground shadow-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading insights...
        </div>
      ) : null}

      {dashboard ? (
        <>
          <InsightsHero dashboard={dashboard} />
          <NextActionCard dashboard={dashboard} />
          <div className="grid gap-4 lg:grid-cols-2">
            <BestMealCard meal={dashboard.quality.bestRecentMeal} />
            <OpportunityCard dashboard={dashboard} />
          </div>
          <PatternsSection insights={dashboard.insights} />
          <RecentMeals meals={dashboard.recentMeals} />
          <DetailedAnalyticsAccordion
            dashboard={dashboard}
            draftTargets={draftTargets}
            isLoading={isLoading}
            onApplyTargets={() => setAppliedTargets(draftTargets)}
            onRefresh={loadDashboard}
            onTargetsChange={setDraftTargets}
            targetsChanged={!areTargetsEqual(draftTargets, appliedTargets)}
          />
        </>
      ) : null}
    </div>
  );
}

function InsightsHero({ dashboard }: { dashboard: DashboardViewModel }) {
  const score = dashboard.week.averageQualityScore ?? dashboard.today.averageQualityScore;
  const opportunity = getPrimaryOpportunity(dashboard);

  return (
    <section className="overflow-hidden rounded-[2rem] bg-primary text-primary-foreground shadow-sm">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-10">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-2 text-sm font-semibold text-primary-foreground/85">
            <CalendarDays className="h-4 w-4 text-accent" />
            {formatDateWithYear(dashboard.week.startDate)} to{" "}
            {formatDateWithYear(dashboard.week.endDate)}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-accent">What did we learn?</p>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              {getHeroInterpretation(dashboard)}
            </h2>
            <p className="max-w-2xl text-base leading-7 text-primary-foreground/80">
              {dashboard.week.mealCount > 0
                ? `${dashboard.week.mealCount} saved meals are shaping this week's view. ${opportunity}`
                : "Save a few meals and Hearth will start spotting patterns for your household."}
            </p>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-background/95 p-5 text-primary shadow-sm">
          <p className="text-sm font-semibold text-accent">Household score</p>
          <p className="mt-3 text-5xl font-semibold leading-none">
            {score === null ? "New" : Math.round(score)}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {score === null
              ? "More saved meals will make this clearer."
              : "Weekly quality score from saved meals with enough signal."}
          </p>
        </div>
      </div>
    </section>
  );
}

function NextActionCard({ dashboard }: { dashboard: DashboardViewModel }) {
  const action = getNextAction(dashboard);

  return (
    <Card className="bg-card/90">
      <CardContent className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-accent">Recommended next action</p>
          <h2 className="text-2xl font-semibold leading-tight text-primary">
            {action.title}
          </h2>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {action.description}
          </p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href={action.href}>
            {action.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function BestMealCard({ meal }: { meal: DashboardViewModel["quality"]["bestRecentMeal"] }) {
  if (!meal) {
    return (
      <Card className="bg-card/80">
        <CardContent className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-accent">Best recent meal</p>
          <h2 className="mt-2 text-2xl font-semibold text-primary">
            Nothing to call out yet.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Save meals with quality signals and Hearth will surface what worked.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent">Best recent meal</p>
            <h2 className="mt-2 break-words text-2xl font-semibold leading-tight text-primary">
              {meal.name}
            </h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success/30 text-primary">
            <Trophy className="h-5 w-5" />
          </span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Highest-scoring meal in recent data.
        </p>
        <div className="flex flex-wrap gap-2">
          <MealQualityBadge label={meal.qualityLabel} score={meal.qualityScore} />
          <NutritionSignalChip>{formatNutrient(meal.calories, "kcal")}</NutritionSignalChip>
          <NutritionSignalChip>{formatNutrient(meal.protein, "g protein")}</NutritionSignalChip>
        </div>
        {meal.url ? (
          <Button asChild variant="secondary">
            <a href={meal.url} rel="noreferrer" target="_blank">
              View meal
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ dashboard }: { dashboard: DashboardViewModel }) {
  const opportunity = getOpportunityCopy(dashboard);

  return (
    <Card className="bg-card/80">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent">Biggest opportunity</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-primary">
              {opportunity.title}
            </h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/20 text-primary">
            <Lightbulb className="h-5 w-5" />
          </span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {opportunity.description}
        </p>
        {dashboard.quality.highestOpportunityMeal ? (
          <div className="rounded-2xl bg-background/70 p-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Meal to revisit
            </p>
            <p className="mt-1 break-words font-semibold">
              {dashboard.quality.highestOpportunityMeal.name}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PatternsSection({ insights }: { insights: DashboardInsight[] }) {
  const visibleInsights = insights.slice(0, 3);

  return (
    <section className="space-y-3">
      <SectionHeading
        helper="Short signals from recent meals and targets."
        title="Patterns we're noticing"
      />
      {visibleInsights.length === 0 ? (
        <Card className="bg-card/80">
          <CardContent className="p-5 text-sm leading-6 text-muted-foreground">
            No patterns yet. Save meals with nutrition values to populate this view.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {visibleInsights.map((insight) => (
            <PatternCard insight={insight} key={insight.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function PatternCard({ insight }: { insight: DashboardInsight }) {
  return (
    <Card className="bg-card/80">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={insightClassName(insight.severity)}>
            {insightSeverityLabel(insight.severity)}
          </Badge>
          {insight.metric ? <NutritionSignalChip>{insight.metric}</NutritionSignalChip> : null}
        </div>
        <h3 className="text-lg font-semibold leading-tight text-primary">
          {insight.title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {insight.message}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailedAnalyticsAccordion({
  dashboard,
  draftTargets,
  isLoading,
  onApplyTargets,
  onRefresh,
  onTargetsChange,
  targetsChanged
}: {
  dashboard: DashboardViewModel;
  draftTargets: NutritionTargets;
  isLoading: boolean;
  onApplyTargets: () => void;
  onRefresh: () => void;
  onTargetsChange: (targets: NutritionTargets) => void;
  targetsChanged: boolean;
}) {
  return (
    <CollapsibleDashboardSection
      helper="Nutrition targets, progress, meal quality signals, weekly rhythm, and confidence details."
      title="Hearth Insights details"
    >
      <div className="flex justify-start">
        <Button disabled={isLoading} onClick={onRefresh} size="sm" type="button" variant="secondary">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
      <TodayOverview dashboard={dashboard} />
      <TargetProgress dashboard={dashboard} />
      <TargetSettings
        isLoading={isLoading}
        onApply={onApplyTargets}
        onTargetsChange={onTargetsChange}
        targets={draftTargets}
        targetsChanged={targetsChanged}
      />
      <QualitySummary dashboard={dashboard} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <SmartInsights insights={dashboard.insights} />
        <WeeklySummary dashboard={dashboard} />
      </div>
      <SignalConfidenceSummary dashboard={dashboard} />
    </CollapsibleDashboardSection>
  );
}

function CollapsibleDashboardSection({
  children,
  helper,
  title
}: {
  children: ReactNode;
  helper: string;
  title: string;
}) {
  return (
    <details className="group rounded-2xl bg-card p-5 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-normal text-primary">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {helper}
            </p>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="mt-6 space-y-6">{children}</div>
    </details>
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
          description="Highest-scoring meal in recent saved data."
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

function SignalConfidenceSummary({ dashboard }: { dashboard: DashboardViewModel }) {
  const mix = dashboard.week.sourceMix;
  const calorieSample = dashboard.week.nutritionCompleteness.calories;
  const proteinSample = dashboard.week.nutritionCompleteness.protein;
  const fiberSample = dashboard.week.nutritionCompleteness.fiber;

  return (
    <details className="rounded-md border bg-card p-4">
      <summary className="cursor-pointer font-medium">Signal confidence</summary>
      <div className="mt-3">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <NutritionSignalChip tone={mix.structured > 0 ? "steady" : "unavailable"}>
              {mix.structured} recipe nutrition
            </NutritionSignalChip>
            <NutritionSignalChip tone={mix.estimated > 0 ? "steady" : "unavailable"}>
              {mix.estimated} Hearth estimates
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
        <CardTitle className="text-base">Hearth Insights</CardTitle>
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

function getHeroInterpretation(dashboard: DashboardViewModel) {
  const score = dashboard.week.averageQualityScore ?? dashboard.today.averageQualityScore;

  if (dashboard.week.mealCount === 0) {
    return "Hearth is ready to learn from your meals.";
  }

  if (typeof score === "number" && score >= 75) {
    return "Your household has a strong pattern this week.";
  }

  if (typeof score === "number" && score >= 50) {
    return "Your household is building a useful rhythm.";
  }

  if (dashboard.week.qualitySample.scoredMeals > 0) {
    return "Your household has a clear next improvement.";
  }

  return "Hearth is learning what works at your table.";
}

function getPrimaryOpportunity(dashboard: DashboardViewModel) {
  const proteinInsight = dashboard.insights.find((insight) =>
    insight.id.includes("protein")
  );
  const fiberInsight = dashboard.insights.find((insight) =>
    insight.id.includes("fiber")
  );
  const sodiumInsight = dashboard.insights.find((insight) =>
    insight.id.includes("sodium")
  );

  if (proteinInsight) {
    return "Protein is the biggest opportunity.";
  }

  if (fiberInsight) {
    return "Fiber is the biggest opportunity.";
  }

  if (sodiumInsight) {
    return "Sodium needs a little attention today.";
  }

  if (dashboard.quality.bestRecentMeal) {
    return `${dashboard.quality.bestRecentMeal.name} is a good signal to repeat.`;
  }

  return "The next saved meal will make these insights sharper.";
}

function getNextAction(dashboard: DashboardViewModel) {
  const warningInsight = dashboard.insights.find(
    (insight) => insight.severity === "warning"
  );

  if (warningInsight?.id.includes("protein")) {
    return {
      cta: "Find protein-forward meals",
      description:
        "Choose a dinner with a stronger protein anchor before tuning anything else.",
      href: "/concierge",
      title: "Prioritize a protein-forward dinner next."
    };
  }

  if (warningInsight?.id.includes("fiber")) {
    return {
      cta: "Show dinner ideas",
      description:
        "Look for a dinner that makes beans, vegetables, oats, or whole grains easy.",
      href: "/concierge",
      title: "Add one fiber-friendly meal next."
    };
  }

  if (dashboard.week.mealCount === 0) {
    return {
      cta: "Import recipe",
      description:
        "Start with one saved dinner so Hearth can learn what works for your household.",
      href: "/analyze",
      title: "Save one meal to unlock household insights."
    };
  }

  return {
    cta: "Show dinner ideas",
    description:
      dashboard.insights[0]?.action ??
      "Use tonight's recommendations to keep building on what is already working.",
    href: "/concierge",
    title: "Pick the next dinner from what Hearth has learned."
  };
}

function getOpportunityCopy(dashboard: DashboardViewModel) {
  const warningInsight = dashboard.insights.find(
    (insight) => insight.severity === "warning"
  );

  if (warningInsight?.id.includes("protein")) {
    return {
      description: "Cook one protein-forward meal next. This is the clearest lever in the current week.",
      title: "Protein has been below target this week."
    };
  }

  if (warningInsight?.id.includes("fiber")) {
    return {
      description: "Add one meal with legumes, vegetables, oats, berries, or whole grains.",
      title: "Fiber has room to improve."
    };
  }

  if (warningInsight?.id.includes("sodium")) {
    return {
      description: "Choose a lower-sodium dinner or balance the day with simpler whole foods.",
      title: "Sodium needs attention today."
    };
  }

  if (dashboard.quality.highestOpportunityMeal) {
    return {
      description:
        "This meal has the most room to improve among meals with available quality data.",
      title: "One saved meal is worth revisiting."
    };
  }

  return {
    description:
      "Save another detailed meal or log feedback so Hearth can spot the next useful pattern.",
    title: "More meal signal will sharpen Hearth."
  };
}

function insightSeverityLabel(severity: DashboardInsight["severity"]) {
  if (severity === "positive") {
    return "Strong";
  }

  if (severity === "warning") {
    return "Needs attention";
  }

  return "Improving";
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
