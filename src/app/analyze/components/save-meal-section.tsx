"use client";

import { ExternalLink, Loader2, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type {
  IngredientPersistenceStatus,
  SaveMealResponse
} from "@/src/app/analyze/types";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

export function SaveMealSection({
  analysis,
  isSaving,
  saveError,
  savedMeal,
  ingredientPersistence,
  onSave
}: {
  analysis: MealAnalysisResult | null;
  isSaving: boolean;
  saveError: string | null;
  savedMeal: SaveMealResponse | null;
  ingredientPersistence: IngredientPersistenceStatus;
  onSave: () => void;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <Button disabled={!analysis || isSaving} onClick={onSave} type="button">
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSaving ? "Saving..." : "Save meal"}
      </Button>
      {saveError ? <Alert className="mt-4">{saveError}</Alert> : null}
      {savedMeal ? (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm">
          <p className="font-medium text-primary">Saved to Meal OS.</p>
          <details className="mt-3 text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Advanced details
            </summary>
            <a
              className="mt-2 inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
              href={savedMeal.notionUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open saved record
              <ExternalLink className="h-4 w-4" />
            </a>
          </details>
          <IngredientPersistenceMessage status={ingredientPersistence} />
        </div>
      ) : null}
    </div>
  );
}

function IngredientPersistenceMessage({
  status
}: {
  status: IngredientPersistenceStatus;
}) {
  if (status.state === "idle") {
    return null;
  }

  if (status.state === "saving") {
    return (
      <p className="mt-3 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving ingredient suggestions...
      </p>
    );
  }

  if (status.state === "skipped") {
    return (
      <p className="mt-3 text-muted-foreground">
        Ingredient save completed. Suggestions were already present or
        malformed.
      </p>
    );
  }

  if (status.state === "empty") {
    return (
      <p className="mt-3 text-muted-foreground">
        No ingredient suggestions were available to save.
      </p>
    );
  }

  if (status.state === "failed") {
    return (
      <p className="mt-3 text-amber-800">
        Meal saved, but ingredient suggestions did not finish saving.{" "}
        {status.message}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-1 text-primary">
      <p>
        Ingredient suggestions saved. Created {status.createdCount}; skipped{" "}
        {status.skippedCount} existing
        {typeof status.relatedCount === "number"
          ? `; related ${status.relatedCount} to this meal`
          : ""}
        {status.malformedCount > 0
          ? `; ignored ${status.malformedCount} malformed`
          : ""}
        .
      </p>
      {status.relationWarning ? (
        <p className="text-amber-800">{status.relationWarning}</p>
      ) : null}
    </div>
  );
}
