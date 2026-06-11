"use client";

import { useState } from "react";
import { Check, ExternalLink, Heart, Loader2, Repeat2, ThumbsDown } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import type { MealFeedbackResult } from "@/src/lib/types/feedback";

type ActionId = "ate" | "loved" | "disliked" | "repeat";
type SaveState = Record<ActionId, "idle" | "saving" | "saved" | "error">;

const actionCopy: Record<
  ActionId,
  {
    label: string;
    icon: "check" | "heart" | "down" | "repeat";
    feedbackEntry: string;
    energyAfter: "Excellent" | "Steady" | "Crash";
    hungerLater: "Satisfied" | "Very Hungry";
    cravingsLater: boolean;
    wouldRepeat: boolean;
    notePrefix: string;
  }
> = {
  ate: {
    label: "Ate This",
    icon: "check",
    feedbackEntry: "ate from Meal Detail",
    energyAfter: "Steady",
    hungerLater: "Satisfied",
    cravingsLater: false,
    wouldRepeat: true,
    notePrefix: "Ate This"
  },
  loved: {
    label: "Loved It",
    icon: "heart",
    feedbackEntry: "loved from Meal Detail",
    energyAfter: "Excellent",
    hungerLater: "Satisfied",
    cravingsLater: false,
    wouldRepeat: true,
    notePrefix: "Loved It"
  },
  disliked: {
    label: "Did Not Like",
    icon: "down",
    feedbackEntry: "did not like from Meal Detail",
    energyAfter: "Crash",
    hungerLater: "Very Hungry",
    cravingsLater: true,
    wouldRepeat: false,
    notePrefix: "Did Not Like"
  },
  repeat: {
    label: "Would Make Again",
    icon: "repeat",
    feedbackEntry: "would make again from Meal Detail",
    energyAfter: "Steady",
    hungerLater: "Satisfied",
    cravingsLater: false,
    wouldRepeat: true,
    notePrefix: "Would Make Again"
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

export function MealDetailActions({ meal }: { meal: MealSummary }) {
  const [saveState, setSaveState] = useState<SaveState>({
    ate: "idle",
    loved: "idle",
    disliked: "idle",
    repeat: "idle"
  });
  const [message, setMessage] = useState<string | null>(null);

  async function logFeedback(actionId: ActionId) {
    const action = actionCopy[actionId];
    const today = new Date().toISOString().slice(0, 10);

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
          notes: `${action.notePrefix} logged from Meal Detail on ${today}.`
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
      setMessage(
        result.warning
          ? `Saved feedback. ${result.warning}`
          : "Saved feedback to Notion."
      );
    } catch {
      setSaveState((previous) => ({ ...previous, [actionId]: "error" }));
      setMessage("Unable to reach the feedback service. Try again.");
    }
  }

  return (
    <div className="space-y-3">
      {message ? <Alert>{message}</Alert> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(actionCopy) as ActionId[]).map((actionId) => {
          const action = actionCopy[actionId];
          const state = saveState[actionId];

          return (
            <Button
              disabled={state === "saving"}
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
              {action.label}
            </Button>
          );
        })}
        <Button asChild variant="ghost">
          <a href={meal.url} rel="noreferrer" target="_blank">
            <ExternalLink className="h-4 w-4" />
            Open in Notion
          </a>
        </Button>
      </div>
    </div>
  );
}
