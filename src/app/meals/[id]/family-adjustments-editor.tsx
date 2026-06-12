"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { familyAdjustmentMarker } from "@/src/lib/domain/meals/cookbook";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

const quickAdjustments = [
  "Less salt",
  "More spice",
  "Extra vegetables",
  "Different protein",
  "Longer cook",
  "Other"
];

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

export function FamilyAdjustmentsEditor({ meal }: { meal: MealSummary }) {
  const router = useRouter();
  const [adjustment, setAdjustment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function saveAdjustment(value = adjustment) {
    const trimmed = value.trim();

    if (!trimmed || status === "saving") {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/notion/log-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feedbackEntry: `${meal.mealName} - family cookbook adjustment`,
          selectedMealId: meal.id,
          energyAfter: "Neutral",
          hungerLater: "Moderate",
          cravingsLater: false,
          wouldRepeat: true,
          notes: `${familyAdjustmentMarker} ${trimmed}`
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(getErrorMessage(data, "Unable to save this adjustment."));
        return;
      }

      setStatus("saved");
      setAdjustment("");
      setMessage("Saved for next time.");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Unable to reach the feedback service. Try again.");
    }
  }

  return (
    <div className="space-y-3">
      {message ? <Alert>{message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {quickAdjustments.map((chip) => (
          <Button
            disabled={status === "saving"}
            key={chip}
            onClick={() => {
              if (chip === "Other") {
                setAdjustment("");
                return;
              }

              setAdjustment(chip);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Plus className="h-4 w-4" />
            {chip}
          </Button>
        ))}
      </div>
      <Textarea
        aria-label="Family recipe adjustment"
        onChange={(event) => setAdjustment(event.target.value)}
        placeholder="Did you change anything?"
        rows={3}
        value={adjustment}
      />
      <Button
        disabled={status === "saving" || !adjustment.trim()}
        onClick={() => void saveAdjustment()}
        type="button"
      >
        {status === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "saved" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Save adjustment
      </Button>
    </div>
  );
}
