import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMealSummary } from "@/src/lib/domain/analytics";
import {
  getMealQualityState,
  mealQualityText,
  type MealQualityState,
  type TargetProgressState,
  type TargetProgressTone
} from "@/src/app/dashboard/dashboard-display";

export function MetricCard({
  helper,
  icon: Icon,
  label,
  tone = "neutral",
  value
}: {
  helper: ReactNode;
  icon: LucideIcon;
  label: string;
  tone?: "neutral" | "positive" | "warning";
  value: string;
}) {
  return (
    <Card className={cn("overflow-hidden", cardToneClassName(tone))}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 break-words text-2xl font-semibold leading-tight">{value}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 text-sm leading-5 text-muted-foreground">{helper}</div>
      </CardContent>
    </Card>
  );
}

export function TargetProgressBar({
  state,
  title
}: {
  state: TargetProgressState;
  title: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.detail}</p>
        </div>
        <NutritionSignalChip tone={state.tone}>{state.label}</NutritionSignalChip>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-sm bg-muted">
        <div
          aria-hidden="true"
          className={cn("h-full rounded-sm", progressToneClassName(state.tone))}
          style={{ width: `${state.cappedPercent}%` }}
        />
      </div>
    </div>
  );
}

export function MealQualityBadge({
  label,
  score,
  state
}: {
  label?: DashboardMealSummary["qualityLabel"];
  score: number | null;
  state?: MealQualityState;
}) {
  const qualityState = state ?? getMealQualityState(score, label);

  return (
    <Badge className={qualityBadgeClassName(qualityState)}>
      {mealQualityText(qualityState)}
      {typeof score === "number" ? ` ${score}/100` : ""}
    </Badge>
  );
}

export function NutritionSignalChip({
  children,
  tone = "steady"
}: {
  children: ReactNode;
  tone?: TargetProgressTone;
}) {
  return (
    <Badge className={cn("whitespace-normal text-left leading-5 sm:whitespace-nowrap", signalToneClassName(tone))}>
      {children}
    </Badge>
  );
}

export function RecentMealCard({ meal }: { meal: DashboardMealSummary }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold leading-tight">{meal.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(meal.loggedAt)}
            </p>
          </div>
          {meal.url ? (
            <Button asChild aria-label={`Open ${meal.name}`} size="sm" variant="secondary">
              <a href={meal.url} rel="noreferrer" target="_blank">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-start gap-2">
          <NutritionSignalChip>{formatNutrient(meal.calories, "kcal")}</NutritionSignalChip>
          <NutritionSignalChip>{formatNutrient(meal.protein, "g protein")}</NutritionSignalChip>
          <NutritionSignalChip tone={meal.confidence || meal.provenance ? "steady" : "unavailable"}>
            {meal.confidence ?? meal.provenance ?? "Nutrition unavailable"}
          </NutritionSignalChip>
          <MealQualityBadge label={meal.qualityLabel} score={meal.qualityScore} />
        </div>
      </CardContent>
    </Card>
  );
}

export function MealCalloutCard({
  description,
  meal,
  title
}: {
  description: string;
  meal: DashboardMealSummary | null;
  title: string;
}) {
  if (!meal) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="font-medium">{title}</p>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Save meals with quality signals to populate this card.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              {title}
            </p>
            <h3 className="mt-2 break-words text-lg font-semibold leading-tight">{meal.name}</h3>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">{description}</p>
        <div className="mt-4 flex flex-wrap items-start gap-2">
          <MealQualityBadge label={meal.qualityLabel} score={meal.qualityScore} />
          <NutritionSignalChip>{formatNutrient(meal.calories, "kcal")}</NutritionSignalChip>
          <NutritionSignalChip>{formatNutrient(meal.protein, "g protein")}</NutritionSignalChip>
        </div>
      </CardContent>
    </Card>
  );
}

function cardToneClassName(tone: "neutral" | "positive" | "warning") {
  if (tone === "positive") {
    return "border-primary/30";
  }

  if (tone === "warning") {
    return "border-accent/40";
  }

  return "";
}

function progressToneClassName(tone: TargetProgressTone) {
  if (tone === "positive") return "bg-primary";
  if (tone === "steady") return "bg-sky-600";
  if (tone === "warning") return "bg-accent";
  if (tone === "danger") return "bg-destructive";
  return "bg-muted-foreground/40";
}

function signalToneClassName(tone: TargetProgressTone) {
  if (tone === "positive") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (tone === "warning") {
    return "border-accent/30 bg-accent/10 text-accent";
  }

  if (tone === "danger") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (tone === "unavailable") {
    return "border-border bg-muted text-muted-foreground";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function qualityBadgeClassName(state: MealQualityState) {
  if (state === "strong") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (state === "solid") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (state === "attention") {
    return "border-accent/30 bg-accent/10 text-accent";
  }

  return "border-border bg-muted text-muted-foreground";
}

function formatNutrient(value: number | null, unit: string) {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return `${Math.round(value).toLocaleString()} ${unit}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
