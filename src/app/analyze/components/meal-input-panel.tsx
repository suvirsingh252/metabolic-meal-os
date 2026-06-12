"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FileText, Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const loadingMessages = [
  "Reading meal details...",
  "Estimating household fit...",
  "Checking nutrition signals...",
  "Preparing your review..."
];

export function MealInputPanel({
  recipeText,
  trimmedRecipeTextLength,
  isAnalyzeDisabled,
  isLoading,
  onSubmit,
  onRecipeTextChange
}: {
  recipeText: string;
  trimmedRecipeTextLength: number;
  isAnalyzeDisabled: boolean;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRecipeTextChange: (value: string) => void;
}) {
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingMessage = loadingMessages[loadingMessageIndex];

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const resetId = window.setTimeout(() => {
      setLoadingMessageIndex(0);
    }, 0);
    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((current) =>
        current >= loadingMessages.length - 1 ? current : current + 1
      );
    }, 5500);

    return () => {
      window.clearTimeout(resetId);
      window.clearInterval(intervalId);
    };
  }, [isLoading]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Meal or recipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="recipeText">Recipe or meal idea</Label>
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-72"
              id="recipeText"
              onInput={(event) => {
                onRecipeTextChange(event.currentTarget.value);
              }}
              onChange={(event) => {
                onRecipeTextChange(event.currentTarget.value);
              }}
              placeholder="Paste a recipe URL, TikTok/Reel/Shorts link, caption, transcript, ingredients, instructions, servings, constraints, or a rough meal idea here."
              rows={8}
              value={recipeText}
            />
            <p className="text-sm text-muted-foreground">
              Enter at least 10 characters. {trimmedRecipeTextLength} characters
            </p>
            <p className="text-sm text-muted-foreground">
              This can take about 20-30 seconds for detailed meals.
            </p>
          </div>
          <div className="space-y-2">
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              disabled={isAnalyzeDisabled}
              type="submit"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {isLoading ? loadingMessage : "Analyze recipe"}
            </button>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Meal OS is still working. Detailed reviews can take a short moment.
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
