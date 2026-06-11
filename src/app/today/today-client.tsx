"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
  Utensils
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
  type TodayViewModel,
  rankRecommendationsForCategory
} from "@/src/lib/domain/recommendations";
import {
  applyOptimisticFeedbackSummary,
  buildHouseholdLearningStrip,
  emptyMealFeedbackSummary,
  mergeFeedbackSummariesPreservingOptimistic,
  preserveLocalFeedbackOverrides,
  restoreFeedbackSummarySnapshot,
  type HouseholdLearningStripViewModel,
  type MealFeedbackSummary,
  type MealFeedbackSummaryByMealId
} from "@/src/lib/domain/feedback";
import { getMealDetailPath } from "@/src/lib/domain/meals/detail-view-model";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { MealFeedbackResult } from "@/src/lib/types/feedback";

interface TodayResponse {
  meals: MealSummary[];
  feedbackByMealId?: MealFeedbackSummaryByMealId;
}

type SaveState = Record<string, "idle" | "saving" | "saved" | "error">;

interface TodayFeedbackUndoSnapshot {
  action: "ate" | "loved";
  previousSummary: MealFeedbackSummary | null;
}

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
  const router = useRouter();
  const [meals, setMeals] = useState<RecommendationMeal[]>([]);
  const [feedbackByMealId, setFeedbackByMealId] =
    useState<MealFeedbackSummaryByMealId>({});
  const [viewModel, setViewModel] = useState<TodayViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [undoByMealId, setUndoByMealId] = useState<
    Record<string, TodayFeedbackUndoSnapshot>
  >({});
  const [excludedByCategory, setExcludedByCategory] = useState<
    Partial<Record<TodayMealCategory, string[]>>
  >({});
  const feedbackByMealIdRef = useRef<MealFeedbackSummaryByMealId>({});
  const pendingMealIdsRef = useRef<Set<string>>(new Set());
  const locallyUndoneMealIdsRef = useRef<Set<string>>(new Set());

  const suggestions = useMemo(
    () => viewModel?.suggestions ?? {},
    [viewModel?.suggestions]
  );
  const learningStrip = useMemo(
    () =>
      buildHouseholdLearningStrip(feedbackByMealId, {
        generatedAt: viewModel?.generatedAt
      }),
    [feedbackByMealId, viewModel?.generatedAt]
  );

  function commitFeedbackByMealId(nextFeedback: MealFeedbackSummaryByMealId) {
    feedbackByMealIdRef.current = nextFeedback;
    setFeedbackByMealId(nextFeedback);
  }

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
      const nextFeedback = preserveLocalFeedbackOverrides(
        mergeFeedbackSummariesPreservingOptimistic(
          feedbackByMealIdRef.current,
          todayData.feedbackByMealId ?? {}
        ),
        feedbackByMealIdRef.current,
        Array.from(locallyUndoneMealIdsRef.current)
      );
      setMeals(nextMeals);
      commitFeedbackByMealId(nextFeedback);
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
    if (pendingMealIdsRef.current.has(recommendation.meal.id)) {
      return;
    }

    const stateKey = `${recommendation.meal.id}:${sentiment}`;
    const createdAt = new Date().toISOString();
    const today = createdAt.slice(0, 10);
    const note =
      sentiment === "loved"
        ? `Loved It logged from Today on ${today}.`
        : `Ate This logged from Today on ${today}.`;

    locallyUndoneMealIdsRef.current.delete(recommendation.meal.id);
    pendingMealIdsRef.current.add(recommendation.meal.id);
    setUndoByMealId((previous) => removeMealKey(previous, recommendation.meal.id));
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
          notes: note
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setSaveState((previous) => ({ ...previous, [stateKey]: "error" }));
        pendingMealIdsRef.current.delete(recommendation.meal.id);
        setSaveMessage(
          getErrorMessage(data, "Unable to save meal feedback right now.")
        );
        return;
      }

      const result = data as MealFeedbackResult;
      const previousFeedback = feedbackByMealIdRef.current;
      const previousSnapshot = previousFeedback[recommendation.meal.id] ?? null;
      const previousSummary =
        previousSnapshot ?? emptyMealFeedbackSummary(recommendation.meal.id);
      const optimisticSummary = applyOptimisticFeedbackSummary(
        previousSummary,
        sentiment,
        {
          createdAt,
          note
        }
      );
      const nextFeedback = {
        ...previousFeedback,
        [recommendation.meal.id]: optimisticSummary
      };

      commitFeedbackByMealId(nextFeedback);
      setViewModel((current) =>
        current
          ? applyOptimisticTodayRecommendation(
              current,
              meals,
              recommendation,
              nextFeedback
            )
          : current
      );
      setSaveState((previous) => ({ ...previous, [stateKey]: "saved" }));
      setUndoByMealId((previous) => ({
        ...previous,
        [recommendation.meal.id]: {
          action: sentiment,
          previousSummary: previousSnapshot
        }
      }));
      pendingMealIdsRef.current.delete(recommendation.meal.id);
      setSaveMessage(
        result.warning
          ? `Saved feedback. ${result.warning}`
          : "Saved feedback to Notion."
      );
      router.refresh();
    } catch {
      setSaveState((previous) => ({ ...previous, [stateKey]: "error" }));
      pendingMealIdsRef.current.delete(recommendation.meal.id);
      setSaveMessage("Unable to reach the feedback service. Try again.");
    }
  }

  function handleUndo(recommendation: MealRecommendation) {
    const undoSnapshot = undoByMealId[recommendation.meal.id];

    if (!undoSnapshot || pendingMealIdsRef.current.has(recommendation.meal.id)) {
      return;
    }

    const nextFeedback = restoreFeedbackSummarySnapshot(
      feedbackByMealIdRef.current,
      recommendation.meal.id,
      undoSnapshot.previousSummary
    );

    locallyUndoneMealIdsRef.current.add(recommendation.meal.id);
    commitFeedbackByMealId(nextFeedback);
    setViewModel((current) =>
      current
        ? applyOptimisticTodayRecommendation(
            current,
            meals,
            recommendation,
            nextFeedback
          )
        : current
    );
    setSaveState((previous) =>
      removeMealKey(
        removeMealKey(previous, `${recommendation.meal.id}:ate`),
        `${recommendation.meal.id}:loved`
      )
    );
    setUndoByMealId((previous) => removeMealKey(previous, recommendation.meal.id));
    setSaveMessage("Undo applied in this Today view. Notion history was not changed.");
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

      <HouseholdLearningStrip learning={learningStrip} />

      {loadError ? (
        <div className="space-y-3">
          <Alert>{loadError}</Alert>
          <TodayActionFallback />
        </div>
      ) : null}
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
                href={getMealDetailPath(idea.meal.id)}
                key={idea.meal.id}
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
          <div className="space-y-4 rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {viewModel.emptyState}
            </p>
            <TodayActionFallback />
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
                onUndo={() => handleUndo(recommendation)}
                recommendation={recommendation}
                saveState={saveState}
                undoSnapshot={undoByMealId[recommendation.meal.id] ?? null}
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

function removeMealKey<TValue extends Record<string, unknown>>(
  values: TValue,
  key: string
): TValue {
  const next = { ...values };
  delete next[key];
  return next;
}

function HouseholdLearningStrip({
  learning
}: {
  learning: HouseholdLearningStripViewModel;
}) {
  return (
    <section
      aria-label="Recent household learning"
      className="rounded-md border bg-card p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Recent household learning</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {learning.headline}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {learning.hasRecentFeedback ? (
            learning.items.map((item) => (
              <Badge className="bg-muted text-muted-foreground" key={item.id}>
                {item.text}
              </Badge>
            ))
          ) : (
            <Badge className="bg-muted text-muted-foreground">
              {learning.emptyText}
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
}

function TodayActionFallback() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href="/analyze">
          Analyze a meal
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="/meals">
          <Utensils className="h-4 w-4" />
          View saved meals
        </Link>
      </Button>
    </div>
  );
}

function applyOptimisticTodayRecommendation(
  viewModel: TodayViewModel,
  meals: RecommendationMeal[],
  recommendation: MealRecommendation,
  feedbackByMealId: MealFeedbackSummaryByMealId
): TodayViewModel {
  const rankedRecommendation = rankRecommendationsForCategory(
    meals,
    recommendation.category,
    {
      generatedAt: viewModel.generatedAt,
      feedbackByMealId
    }
  ).find((candidate) => candidate.meal.id === recommendation.meal.id);
  const nextRecommendation =
    rankedRecommendation ??
    ({
      ...recommendation,
      feedbackSummary: feedbackByMealId[recommendation.meal.id] ?? null,
      confidenceNote: feedbackByMealId[recommendation.meal.id]
        ? "Based on your saved meals and household feedback."
        : "Based on your saved meals."
    } satisfies MealRecommendation);

  return {
    ...viewModel,
    suggestions: {
      ...viewModel.suggestions,
      [recommendation.category]: nextRecommendation
    }
  };
}

interface SuggestionCardProps {
  category: TodayMealCategory;
  recommendation: MealRecommendation;
  saveState: SaveState;
  onAteThis: () => void;
  onLovedIt: () => void;
  onSuggestAnother: () => void;
  onUndo: () => void;
  undoSnapshot: TodayFeedbackUndoSnapshot | null;
}

function SuggestionCard({
  category,
  recommendation,
  saveState,
  onAteThis,
  onLovedIt,
  onSuggestAnother,
  onUndo,
  undoSnapshot
}: SuggestionCardProps) {
  const ateState = saveState[`${recommendation.meal.id}:ate`] ?? "idle";
  const lovedState = saveState[`${recommendation.meal.id}:loved`] ?? "idle";
  const pendingAction =
    ateState === "saving" ? "ate" : lovedState === "saving" ? "loved" : null;
  const feedbackSummary = recommendation.feedbackSummary;

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
        {feedbackSummary && feedbackSummary.totalEvents > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-muted text-muted-foreground">
              Eaten {feedbackSummary.eatenCount}
            </Badge>
            {feedbackSummary.lovedCount > 0 ? (
              <Badge className="bg-muted text-muted-foreground">
                Loved {feedbackSummary.lovedCount}
              </Badge>
            ) : null}
            {feedbackSummary.wouldRepeatCount > 0 ? (
              <Badge className="bg-muted text-muted-foreground">
                Would repeat {feedbackSummary.wouldRepeatCount}
              </Badge>
            ) : null}
          </div>
        ) : null}
        {undoSnapshot ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            <span>Saved. Undo?</span>
            <Button
              className="h-7 px-2 text-xs"
              disabled={pendingAction !== null}
              onClick={onUndo}
              type="button"
              variant="ghost"
            >
              Undo local view
            </Button>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary">
            <a href={getMealDetailPath(recommendation.meal.id)}>
              <ExternalLink className="h-4 w-4" />
              View Meal
            </a>
          </Button>
          <Button
            disabled={pendingAction !== null}
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
            {ateState === "saving" ? "Saving..." : "Ate This"}
          </Button>
          <Button
            disabled={pendingAction !== null}
            onClick={onLovedIt}
            type="button"
            variant="secondary"
          >
            {lovedState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            {lovedState === "saving" ? "Saving..." : "Loved It"}
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
