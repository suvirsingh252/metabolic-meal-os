"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildTodayViewModel,
  getAlternativeSuggestion,
  todayMealCategories,
  type MealRecommendation,
  type RecommendationMeal,
  type TodayMealCategory,
  type TodayViewModel
} from "@/src/lib/domain/recommendations";
import type { MealFeedbackSummaryByMealId } from "@/src/lib/domain/feedback";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { MealFeedbackResult } from "@/src/lib/types/feedback";

interface TodayResponse {
  meals: MealSummary[];
  feedbackByMealId?: MealFeedbackSummaryByMealId;
}

type SaveState = Record<string, "idle" | "saving" | "saved" | "error">;

function mapMealSummary(meal: MealSummary): RecommendationMeal {
  return {
    id: meal.id,
    url: meal.url,
    mealName: meal.mealName,
    createdAt: meal.createdAt,
    cuisine: meal.cuisine,
    mealType: meal.mealType,
    familyApproved: meal.familyApproved,
    weeknightFriendly: meal.weeknightFriendly,
    comfortMeal: meal.comfortMeal,
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbohydratesG: meal.carbohydratesG,
    fatG: meal.fatG,
    fiberG: meal.fiberG,
    qualityScore: meal.qualityScore
  };
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

export function TodayClient() {
  const [meals, setMeals] = useState<RecommendationMeal[]>([]);
  const [feedbackByMealId, setFeedbackByMealId] =
    useState<MealFeedbackSummaryByMealId>({});
  const [viewModel, setViewModel] = useState<TodayViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [excludedByCategory, setExcludedByCategory] = useState<
    Partial<Record<TodayMealCategory, string[]>>
  >({});

  const suggestions = useMemo(
    () => viewModel?.suggestions ?? {},
    [viewModel?.suggestions]
  );

  const loadMeals = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/today");
      const data: unknown = await response.json();

      if (!response.ok) {
        setLoadError(
          getErrorMessage(data, "Unable to load saved meals from Notion right now.")
        );
        return;
      }

      const todayData = data as TodayResponse;
      const nextMeals = todayData.meals.map(mapMealSummary);
      const nextFeedback = todayData.feedbackByMealId ?? {};
      setMeals(nextMeals);
      setFeedbackByMealId(nextFeedback);
      setViewModel(
        buildTodayViewModel(nextMeals, { feedbackByMealId: nextFeedback })
      );
    } catch {
      setLoadError("Unable to reach the meals service. Try again.");
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

  function handleSuggestAnother(category: TodayMealCategory) {
    if (!viewModel) {
      return;
    }

    const current = viewModel.suggestions[category];

    if (!current) {
      return;
    }

    const excludedMealIds = [
      ...(excludedByCategory[category] ?? []),
      current.meal.id
    ];
    const alternative = getAlternativeSuggestion(
      meals,
      category,
      current.meal.id,
      {
        generatedAt: viewModel.generatedAt,
        excludedMealIds,
        feedbackByMealId
      }
    );

    if (!alternative) {
      setSaveMessage(`No other saved ${category.toLowerCase()} option found yet.`);
      setExcludedByCategory((previous) => ({
        ...previous,
        [category]: excludedMealIds
      }));
      return;
    }

    setExcludedByCategory((previous) => ({
      ...previous,
      [category]: [...excludedMealIds, alternative.meal.id]
    }));
    setViewModel({
      ...viewModel,
      suggestions: {
        ...viewModel.suggestions,
        [category]: alternative
      }
    });
    setSaveMessage(null);
  }

  async function logFeedback(
    recommendation: MealRecommendation,
    sentiment: "ate" | "loved"
  ) {
    const stateKey = `${recommendation.meal.id}:${sentiment}`;
    const today = new Date().toISOString().slice(0, 10);

    setSaveState((previous) => ({ ...previous, [stateKey]: "saving" }));
    setSaveMessage(null);

    try {
      const response = await fetch("/api/notion/log-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feedbackEntry:
            sentiment === "loved"
              ? `${recommendation.meal.mealName} - loved from Today`
              : `${recommendation.meal.mealName} - ate from Today`,
          selectedMealId: recommendation.meal.id,
          energyAfter: sentiment === "loved" ? "Excellent" : "Steady",
          hungerLater: "Satisfied",
          cravingsLater: false,
          wouldRepeat: true,
          notes:
            sentiment === "loved"
              ? `Loved It logged from Today on ${today}.`
              : `Ate This logged from Today on ${today}.`
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setSaveState((previous) => ({ ...previous, [stateKey]: "error" }));
        setSaveMessage(
          getErrorMessage(data, "Unable to save meal feedback right now.")
        );
        return;
      }

      const result = data as MealFeedbackResult;
      setSaveState((previous) => ({ ...previous, [stateKey]: "saved" }));
      setSaveMessage(
        result.warning
          ? `Saved feedback. ${result.warning}`
          : "Saved feedback to Notion."
      );
    } catch {
      setSaveState((previous) => ({ ...previous, [stateKey]: "error" }));
      setSaveMessage("Unable to reach the feedback service. Try again.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Today</p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
            What should we eat today?
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Based on your saved meals, recent use, and household signals already
            in Meal OS.
          </p>
        </div>
        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          {isLoading
            ? "Loading saved meals..."
            : `${meals.length} saved meals checked for today's ideas.`}
        </div>
      </section>

      {loadError ? <Alert>{loadError}</Alert> : null}
      {saveMessage ? <Alert>{saveMessage}</Alert> : null}

      {viewModel?.freshIdeas.length ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Fresh Ideas</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {viewModel.freshIdeas.map((idea) => (
              <a
                className="rounded-md border bg-card p-4 transition-colors hover:bg-secondary/60"
                href={idea.meal.url}
                key={idea.meal.id}
                rel="noreferrer"
                target="_blank"
              >
                <Badge>New Idea</Badge>
                <h3 className="mt-3 font-semibold leading-tight">
                  {idea.meal.mealName}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {idea.reason}. Not yet treated as a household favorite.
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Daily Suggestions</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-md border bg-card p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Building suggestions from saved meals.
          </div>
        ) : null}
        {viewModel?.emptyState ? (
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
            {viewModel.emptyState}
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {todayMealCategories.map((category) => {
            const recommendation = suggestions[category];

            return recommendation ? (
              <SuggestionCard
                category={category}
                key={category}
                onAteThis={() => void logFeedback(recommendation, "ate")}
                onLovedIt={() => void logFeedback(recommendation, "loved")}
                onSuggestAnother={() => handleSuggestAnother(category)}
                recommendation={recommendation}
                saveState={saveState}
              />
            ) : null;
          })}
        </div>
      </section>

      {viewModel ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Health Snapshot</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {viewModel.healthSnapshot.map((item) => (
              <div className="rounded-md border bg-card p-4 text-sm" key={item.id}>
                {item.text}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface SuggestionCardProps {
  category: TodayMealCategory;
  recommendation: MealRecommendation;
  saveState: SaveState;
  onAteThis: () => void;
  onLovedIt: () => void;
  onSuggestAnother: () => void;
}

function SuggestionCard({
  category,
  recommendation,
  saveState,
  onAteThis,
  onLovedIt,
  onSuggestAnother
}: SuggestionCardProps) {
  const ateState = saveState[`${recommendation.meal.id}:ate`] ?? "idle";
  const lovedState = saveState[`${recommendation.meal.id}:loved`] ?? "idle";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-primary">{category}</p>
            <CardTitle className="break-words text-xl leading-tight">
              {recommendation.meal.mealName}
            </CardTitle>
          </div>
          {recommendation.confidence === "low" ? (
            <Badge className="shrink-0 bg-muted text-muted-foreground">
              Low confidence
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {recommendation.reasons.map((reason) => (
            <Badge key={reason}>{reason}</Badge>
          ))}
          {recommendation.reasons.length === 0 ? (
            <Badge className="bg-muted text-muted-foreground">
              Limited saved signals
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {recommendation.confidenceNote}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary">
            <a href={recommendation.meal.url} rel="noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />
              View Meal
            </a>
          </Button>
          <Button
            disabled={ateState === "saving"}
            onClick={onAteThis}
            type="button"
            variant="secondary"
          >
            {ateState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ateState === "saved" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Ate This
          </Button>
          <Button
            disabled={lovedState === "saving"}
            onClick={onLovedIt}
            type="button"
            variant="secondary"
          >
            {lovedState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            Loved It
          </Button>
          <Button onClick={onSuggestAnother} type="button" variant="ghost">
            <RefreshCw className="h-4 w-4" />
            Suggest Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
