"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Heart,
  Loader2,
  Repeat2,
  ThumbsDown
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyOptimisticMealDetailFeedback,
  type MealDetailFeedbackAction
} from "@/src/lib/domain/feedback/optimistic";
import type { MealFeedbackSummary } from "@/src/lib/domain/feedback/summary";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { MealFeedbackResult } from "@/src/lib/types/feedback";

type ActionId = MealDetailFeedbackAction;
type SaveState = Record<ActionId, "idle" | "saving" | "saved" | "error">;

const actionCopy: Record<
  ActionId,
  {
    label: string;
    icon: "check" | "heart" | "down" | "repeat";
    feedbackEntry: string;
    energyAfter: "Excellent" | "Steady" | "Neutral" | "Crash";
    hungerLater: "Satisfied" | "Moderate" | "Very Hungry";
    cravingsLater: boolean;
    wouldRepeat: boolean;
    notePrefix: string;
    helper: string;
    successMessage: string;
  }
> = {
  ate: {
    label: "Ate This",
    icon: "check",
    feedbackEntry: "ate from Meal Detail",
    energyAfter: "Neutral",
    hungerLater: "Moderate",
    cravingsLater: false,
    wouldRepeat: false,
    notePrefix: "Ate This",
    helper: "Logged as eaten.",
    successMessage: "Saved: logged as eaten."
  },
  loved: {
    label: "Loved It",
    icon: "heart",
    feedbackEntry: "loved from Meal Detail",
    energyAfter: "Excellent",
    hungerLater: "Satisfied",
    cravingsLater: false,
    wouldRepeat: true,
    notePrefix: "Loved It",
    helper: "Logged as eaten, loved, and worth repeating.",
    successMessage: "Saved: logged as eaten, loved, and worth repeating."
  },
  disliked: {
    label: "Did Not Like",
    icon: "down",
    feedbackEntry: "did not like from Meal Detail",
    energyAfter: "Crash",
    hungerLater: "Very Hungry",
    cravingsLater: true,
    wouldRepeat: false,
    notePrefix: "Did Not Like",
    helper: "Logged as not liked.",
    successMessage: "Saved: logged as not liked."
  },
  repeat: {
    label: "Would Make Again",
    icon: "repeat",
    feedbackEntry: "would make again from Meal Detail",
    energyAfter: "Neutral",
    hungerLater: "Moderate",
    cravingsLater: false,
    wouldRepeat: true,
    notePrefix: "Would Make Again",
    helper: "Marked as worth repeating.",
    successMessage: "Saved: marked as worth repeating."
  }
};

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

function ActionIcon({ icon }: { icon: (typeof actionCopy)[ActionId]["icon"] }) {
  if (icon === "heart") {
    return <Heart className="h-4 w-4" />;
  }

  if (icon === "down") {
    return <ThumbsDown className="h-4 w-4" />;
  }

  if (icon === "repeat") {
    return <Repeat2 className="h-4 w-4" />;
  }

  return <Check className="h-4 w-4" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function EmptyText({ children }: { children: string }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

function FeedbackStat({
  label,
  value
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}

export function MealDetailActions({
  initialFeedbackSummary,
  meal
}: {
  initialFeedbackSummary: MealFeedbackSummary;
  meal: MealSummary;
}) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({
    ate: "idle",
    loved: "idle",
    disliked: "idle",
    repeat: "idle"
  });
  const [feedbackSummary, setFeedbackSummary] = useState(initialFeedbackSummary);
  const [message, setMessage] = useState<string | null>(null);
  const pendingAction = (Object.keys(saveState) as ActionId[]).find(
    (actionId) => saveState[actionId] === "saving"
  );

  async function logFeedback(actionId: ActionId) {
    if (pendingAction) {
      return;
    }

    const action = actionCopy[actionId];
    const createdAt = new Date().toISOString();
    const today = createdAt.slice(0, 10);
    const note = `${action.notePrefix} logged from Meal Detail on ${today}.`;

    setSaveState((previous) => ({ ...previous, [actionId]: "saving" }));
    setMessage(null);

    try {
      const response = await fetch("/api/notion/log-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feedbackEntry: `${meal.mealName} - ${action.feedbackEntry}`,
          selectedMealId: meal.id,
          energyAfter: action.energyAfter,
          hungerLater: action.hungerLater,
          cravingsLater: action.cravingsLater,
          wouldRepeat: action.wouldRepeat,
          notes: note
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setSaveState((previous) => ({ ...previous, [actionId]: "error" }));
        setMessage(getErrorMessage(data, "Unable to save meal feedback right now."));
        return;
      }

      const result = data as MealFeedbackResult;
      setSaveState((previous) => ({ ...previous, [actionId]: "saved" }));
      setFeedbackSummary((current) =>
        applyOptimisticMealDetailFeedback(current, actionId, {
          createdAt,
          note
        })
      );
      setMessage(
        result.warning
          ? `${action.successMessage} ${result.warning}`
          : action.successMessage
      );
      router.refresh();
    } catch {
      setSaveState((previous) => ({ ...previous, [actionId]: "error" }));
      setMessage("Unable to reach the feedback service. Try again.");
    }
  }

  return (
    <div className="space-y-3">
      {message ? <Alert>{message}</Alert> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(actionCopy) as ActionId[]).map((actionId) => {
          const action = actionCopy[actionId];
          const state = saveState[actionId];

          return (
            <Button
              disabled={Boolean(pendingAction)}
              key={actionId}
              onClick={() => void logFeedback(actionId)}
              type="button"
              variant="secondary"
            >
              {state === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : state === "saved" ? (
                <Check className="h-4 w-4" />
              ) : (
                <ActionIcon icon={action.icon} />
              )}
              {state === "saving" ? "Saving..." : action.label}
            </Button>
          );
        })}
      </div>
      <div className="grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(actionCopy) as ActionId[]).map((actionId) => (
          <p key={actionId}>{actionCopy[actionId].helper}</p>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Household feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackSummary.totalEvents > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FeedbackStat label="Eaten" value={feedbackSummary.eatenCount} />
                <FeedbackStat label="Loved" value={feedbackSummary.lovedCount} />
                <FeedbackStat label="Liked" value={feedbackSummary.likedCount} />
                <FeedbackStat
                  label="Did not like"
                  value={feedbackSummary.dislikedCount}
                />
                <FeedbackStat
                  label="Would repeat"
                  value={feedbackSummary.wouldRepeatCount}
                />
                <FeedbackStat
                  label="Confidence"
                  value={feedbackSummary.confidence}
                />
                <FeedbackStat
                  label="Last eaten"
                  value={formatDate(feedbackSummary.lastEatenAt) ?? "Not logged"}
                />
              </div>
              {feedbackSummary.recentNotes.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Recent notes</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {feedbackSummary.recentNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyText>No recent feedback notes are available.</EmptyText>
              )}
            </>
          ) : (
            <EmptyText>This meal has not been rated yet.</EmptyText>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
