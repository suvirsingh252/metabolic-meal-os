"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, MessageSquare, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  energyAfterOptions,
  hungerLaterOptions,
  type EnergyAfter,
  type HungerLater,
  type MealFeedbackResult
} from "@/src/lib/types/feedback";
import type { MealSummary } from "@/src/lib/notion/meal-summary";

const manualMealValue = "__manual__";

interface MealsResponse {
  meals: MealSummary[];
}

function getErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Unable to save meal feedback right now.";
}

function getMealLoadErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Saved meals could not be loaded. Manual feedback entry still works.";
}

export default function FeedbackPage() {
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [selectedMealId, setSelectedMealId] = useState(manualMealValue);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [mealLoadWarning, setMealLoadWarning] = useState<string | null>(null);
  const [feedbackEntry, setFeedbackEntry] = useState("");
  const [energyAfter, setEnergyAfter] = useState<EnergyAfter>("Neutral");
  const [hungerLater, setHungerLater] = useState<HungerLater>("Satisfied");
  const [cravingsLater, setCravingsLater] = useState(false);
  const [wouldRepeat, setWouldRepeat] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] =
    useState<MealFeedbackResult | null>(null);

  const loadMeals = useCallback(async () => {
    setIsLoadingMeals(true);
    setMealLoadWarning(null);

    try {
      const response = await fetch("/api/notion/meals");
      const data: unknown = await response.json();

      if (!response.ok) {
        setMealLoadWarning(getMealLoadErrorMessage(data));
        return;
      }

      setMeals((data as MealsResponse).meals);
    } catch {
      setMealLoadWarning(
        "Saved meals could not be loaded. Manual feedback entry still works."
      );
    } finally {
      setIsLoadingMeals(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMeals();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMeals]);

  function handleMealSelection(mealId: string) {
    setSelectedMealId(mealId);

    if (mealId === manualMealValue) {
      return;
    }

    const selectedMeal = meals.find((meal) => meal.id === mealId);

    if (selectedMeal) {
      setFeedbackEntry(selectedMeal.mealName);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (feedbackEntry.trim().length === 0) {
      setError("Feedback entry is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedFeedback(null);

    try {
      const response = await fetch("/api/notion/log-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feedbackEntry: feedbackEntry.trim(),
          energyAfter,
          hungerLater,
          cravingsLater,
          wouldRepeat,
          notes
        })
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(data));
        return;
      }

      setSavedFeedback(data as MealFeedbackResult);
    } catch {
      setError("Unable to reach the feedback service. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review loop"
        title="Meal feedback"
        description="Log how a meal felt after eating so future planning can learn from real household experience."
      />

      {error ? <Alert>{error}</Alert> : null}

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Post-meal log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="mealSelection">Meal</Label>
              <Select
                disabled={isLoadingMeals}
                id="mealSelection"
                onChange={(event) => handleMealSelection(event.target.value)}
                value={selectedMealId}
              >
                <option value={manualMealValue}>
                  {isLoadingMeals ? "Loading saved meals..." : "Manual entry"}
                </option>
                {meals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.mealName}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-muted-foreground">
                This currently saves the meal name only. A Notion relation will
                be added later.
              </p>
              {mealLoadWarning ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {mealLoadWarning}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedbackEntry">Feedback entry</Label>
              <Input
                id="feedbackEntry"
                onChange={(event) => setFeedbackEntry(event.target.value)}
                placeholder="e.g. Chana masala dinner felt steady and satisfying"
                value={feedbackEntry}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <EnumSelect<EnergyAfter>
                id="energyAfter"
                label="Energy after"
                onChange={setEnergyAfter}
                options={energyAfterOptions}
                value={energyAfter}
              />
              <EnumSelect<HungerLater>
                id="hungerLater"
                label="Hunger later"
                onChange={setHungerLater}
                options={hungerLaterOptions}
                value={hungerLater}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <BooleanInput
                checked={cravingsLater}
                id="cravingsLater"
                label="Cravings later"
                onChange={setCravingsLater}
              />
              <BooleanInput
                checked={wouldRepeat}
                id="wouldRepeat"
                label="Would repeat"
                onChange={setWouldRepeat}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add hunger, energy, digestion, prep, leftovers, or family comments."
                rows={8}
                value={notes}
              />
            </div>

            <Button disabled={isSaving} type="submit">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save feedback"}
            </Button>
          </form>

          {savedFeedback ? (
            <div className="mt-6 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm">
              <p className="font-medium text-primary">Saved to Notion.</p>
              <a
                className="mt-2 inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
                href={savedFeedback.notionUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open feedback page
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

interface EnumSelectProps<TValue extends string> {
  id: string;
  label: string;
  options: readonly TValue[];
  value: TValue;
  onChange: (value: TValue) => void;
}

function EnumSelect<TValue extends string>({
  id,
  label,
  options,
  value,
  onChange
}: EnumSelectProps<TValue>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        onChange={(event) => onChange(event.target.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface BooleanInputProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function BooleanInput({ id, label, checked, onChange }: BooleanInputProps) {
  return (
    <label
      className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm font-medium"
      htmlFor={id}
    >
      <Checkbox
        checked={checked}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
