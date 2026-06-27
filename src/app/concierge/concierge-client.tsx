"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  ChevronDown,
  Clock,
  Loader2,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Users,
  Utensils
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MealImage } from "@/src/components/meal-image";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import {
  dinnerConciergeRefinements,
  type DinnerConciergeRecommendation,
  type DinnerConciergeRefinementGroup,
  type DinnerConciergeRefinementState,
  type DinnerConciergeViewModel
} from "@/src/lib/domain/recommendations";

const emptyRefinements: DinnerConciergeRefinementState = {
  mood: [],
  time: null,
  tonight: []
};

const refinementGroups: {
  group: DinnerConciergeRefinementGroup;
  title: string;
}[] = [
  { group: "mood", title: "Mood" },
  { group: "time", title: "Time" },
  { group: "tonight", title: "Tonight" }
];

function buildDinnerQuery(state: DinnerConciergeRefinementState): string {
  const params = new URLSearchParams();

  if (state.mood.length > 0) {
    params.set("mood", state.mood.join(","));
  }
  if (state.time) {
    params.set("time", state.time);
  }
  if (state.tonight.length > 0) {
    params.set("tonight", state.tonight.join(","));
  }

  return params.toString();
}

function countActiveRefinements(state: DinnerConciergeRefinementState): number {
  return state.mood.length + state.tonight.length + (state.time ? 1 : 0);
}

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id)
    ? list.filter((value) => value !== id)
    : [...list, id];
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  ) {
    return (value as { error: string }).error;
  }

  return fallback;
}

function formatTonightDate(generatedAt: string): string {
  const parsed = new Date(generatedAt);

  if (Number.isNaN(parsed.getTime())) {
    return "Tonight";
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function ConciergeClient() {
  const [refinements, setRefinements] =
    useState<DinnerConciergeRefinementState>(emptyRefinements);
  const [viewModel, setViewModel] = useState<DinnerConciergeViewModel | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const loadView = useCallback(
    async (state: DinnerConciergeRefinementState) => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const query = buildDinnerQuery(state);
        const response = await fetch(`/api/dinner${query ? `?${query}` : ""}`);
        const data: unknown = await response.json();

        if (!response.ok) {
          setLoadError(
            getErrorMessage(data, "Unable to load tonight's dinner right now.")
          );
          return;
        }

        setViewModel(data as DinnerConciergeViewModel);
      } catch {
        setLoadError("Unable to reach the dinner concierge. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadView(refinements);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadView, refinements]);

  const activeCount = countActiveRefinements(refinements);
  const lead = viewModel?.leadRecommendation ?? null;
  const alternates = viewModel?.alternates ?? [];
  const freshIdeas = viewModel?.freshIdeas ?? [];

  function toggleMood(id: string) {
    setRefinements((previous) => ({
      ...previous,
      mood: toggleInList(previous.mood, id)
    }));
  }

  function toggleTonight(id: string) {
    setRefinements((previous) => ({
      ...previous,
      tonight: toggleInList(previous.tonight, id)
    }));
  }

  function selectTime(id: string) {
    setRefinements((previous) => ({
      ...previous,
      time: previous.time === id ? null : id
    }));
  }

  function isActive(group: DinnerConciergeRefinementGroup, id: string): boolean {
    if (group === "mood") {
      return refinements.mood.includes(id);
    }
    if (group === "tonight") {
      return refinements.tonight.includes(id);
    }
    return refinements.time === id;
  }

  function handleToggle(group: DinnerConciergeRefinementGroup, id: string) {
    if (group === "mood") {
      toggleMood(id);
    } else if (group === "tonight") {
      toggleTonight(id);
    } else {
      selectTime(id);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-accent">
          {viewModel ? formatTonightDate(viewModel.generatedAt) : "Tonight"}
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-primary sm:text-5xl">
          Dinner is handled.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          One confident pick from your saved family meals.
        </p>
      </section>

      {loadError ? (
        <div className="space-y-3">
          <Alert>{loadError}</Alert>
          <ConciergeActionFallback />
        </div>
      ) : null}

      {isLoading && !viewModel ? (
        <div className="flex items-center gap-2 rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Deciding what&apos;s for dinner.
        </div>
      ) : null}

      {viewModel?.emptyState ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {viewModel.emptyState.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {viewModel.emptyState.message}
            </p>
            <ConciergeActionFallback
              primaryLabel={viewModel.emptyState.actionLabel}
            />
          </CardContent>
        </Card>
      ) : null}

      {lead ? (
        <LeadCard recommendation={lead} isRefreshing={isLoading} />
      ) : null}

      {alternates.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Other options tonight</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {alternates.map((recommendation) => (
              <AlternateCard
                key={recommendation.mealId}
                recommendation={recommendation}
              />
            ))}
          </div>
        </section>
      ) : null}

      {freshIdeas.length > 0 ? (
        <section className="space-y-3">
          {showMore ? (
            <>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Fresh ideas</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {freshIdeas.map((recommendation) => (
                  <AlternateCard
                    key={recommendation.mealId}
                    recommendation={recommendation}
                    label="Fresh idea"
                  />
                ))}
              </div>
            </>
          ) : (
            <Button
              onClick={() => setShowMore(true)}
              type="button"
              variant="secondary"
            >
              <Sparkles className="h-4 w-4" />
              Show me more
            </Button>
          )}
        </section>
      ) : null}

      {!viewModel?.emptyState || activeCount > 0 ? (
        <RefineStrip
          activeCount={activeCount}
          isActive={isActive}
          onClear={() => setRefinements(emptyRefinements)}
          onToggle={handleToggle}
          open={refineOpen}
          onOpenChange={setRefineOpen}
        />
      ) : null}
    </div>
  );
}

function LeadCard({
  recommendation,
  isRefreshing
}: {
  recommendation: DinnerConciergeRecommendation;
  isRefreshing: boolean;
}) {
  const reasonLine = recommendation.reasons.slice(0, 2).join(" · ");
  const explanationDetails = recommendation.explanation.details.slice(0, 2);

  return (
    <Card className="overflow-hidden bg-primary text-primary-foreground">
      <div className="relative aspect-[16/9] w-full">
        <MealImage
          alt={`${recommendation.name} image`}
          imageUrl={recommendation.imageUrl}
          priority
          sizes="100vw"
        />
      </div>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-accent">Tonight&apos;s pick</p>
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <CardTitle className="break-words text-3xl leading-tight sm:text-4xl">
          {recommendation.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reasonLine ? (
          <p className="text-base leading-7 text-primary-foreground/80">{reasonLine}</p>
        ) : null}
        <div className="rounded-md bg-background/10 p-4">
          <p className="text-sm font-semibold text-accent">
            {recommendation.explanation.headline}
          </p>
          {explanationDetails.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-primary-foreground/80">
              {explanationDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <MetaBadges recommendation={recommendation} />
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <a href={getMealDetailPath(recommendation.mealId)}>
            <ChefHat className="h-4 w-4" />
            Cook this tonight
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function AlternateCard({
  recommendation,
  label
}: {
  recommendation: DinnerConciergeRecommendation;
  label?: string;
}) {
  const reasonLine = recommendation.reasons.slice(0, 1).join(" · ");
  const explanationLine = recommendation.explanation.details[0] ?? null;

  return (
    <a
      className="flex h-full flex-col overflow-hidden rounded-md border bg-card transition-colors hover:bg-secondary/60"
      href={getMealDetailPath(recommendation.mealId)}
    >
      <div className="relative aspect-[4/3] w-full">
        <MealImage
          alt={`${recommendation.name} image`}
          imageUrl={recommendation.imageUrl}
          sizes="(min-width: 640px) 33vw, 100vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
      {label ? (
        <Badge className="w-fit bg-muted text-muted-foreground">{label}</Badge>
      ) : null}
      <h3 className="font-semibold leading-tight">{recommendation.name}</h3>
      {reasonLine ? (
        <p className="text-sm text-muted-foreground">{reasonLine}</p>
      ) : null}
      {explanationLine ? (
        <p className="text-xs leading-5 text-muted-foreground">{explanationLine}</p>
      ) : null}
      <MetaBadges recommendation={recommendation} compact />
      </div>
    </a>
  );
}

function MetaBadges({
  recommendation,
  compact
}: {
  recommendation: DinnerConciergeRecommendation;
  compact?: boolean;
}) {
  const badges = compact
    ? recommendation.badges.slice(0, 2)
    : recommendation.badges;

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const isTime = /min|effort/i.test(badge);
        const isFamily = /family/i.test(badge);

        return (
          <Badge className="bg-muted text-muted-foreground" key={badge}>
            {isTime ? <Clock className="h-3 w-3" /> : null}
            {isFamily ? <Users className="h-3 w-3" /> : null}
            {badge}
          </Badge>
        );
      })}
    </div>
  );
}

function RefineStrip({
  activeCount,
  isActive,
  onToggle,
  onClear,
  open,
  onOpenChange
}: {
  activeCount: number;
  isActive: (group: DinnerConciergeRefinementGroup, id: string) => boolean;
  onToggle: (group: DinnerConciergeRefinementGroup, id: string) => void;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <section
      aria-label="Refine tonight"
      className="rounded-md border bg-card p-4"
    >
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className="flex items-center gap-2 font-medium">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Refine tonight
          {activeCount > 0 ? (
            <Badge className="bg-primary/15 text-primary">{activeCount}</Badge>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-t pt-4">
          {refinementGroups.map(({ group, title }) => {
            const options = dinnerConciergeRefinements.filter(
              (option) => option.group === group
            );

            return (
              <div className="space-y-2" key={group}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => {
                    const active = isActive(group, option.id);

                    return (
                      <button
                        aria-pressed={active}
                        className={`min-h-11 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:bg-secondary/60"
                        }`}
                        key={option.id}
                        onClick={() => onToggle(group, option.id)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {activeCount > 0 ? (
            <Button
              className="h-9"
              onClick={onClear}
              type="button"
              variant="ghost"
            >
              <RotateCcw className="h-4 w-4" />
              Clear refinements
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ConciergeActionFallback({
  primaryLabel
}: {
  primaryLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href="/meals">
          <Utensils className="h-4 w-4" />
          {primaryLabel ?? "Browse saved meals"}
        </Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="/analyze">
          Import recipe
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
