"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AnalyzeState } from "@/src/app/analyze/types";

const loadingMessages = [
  "Reading meal details...",
  "Estimating household fit...",
  "Checking nutrition signals...",
  "Preparing your review..."
];

const socialIntakeLoadingMessages = [
  "Looking for recipe details...",
  "Checking accessible caption metadata...",
  "Preparing a best-effort estimate...",
  "Preparing your review..."
];

export function getAnalyzePrimaryCtaLabel({
  isLoading,
  socialFallback,
  usesBestEffortSocialIntake,
  loadingMessage
}: {
  isLoading: boolean;
  socialFallback: AnalyzeState["socialFallback"];
  usesBestEffortSocialIntake: boolean;
  loadingMessage: string;
}) {
  if (isLoading) {
    return loadingMessage;
  }

  if (socialFallback) {
    return "Analyze pasted social recipe";
  }

  if (usesBestEffortSocialIntake) {
    return "Analyze best guess";
  }

  return "Analyze recipe";
}

export function MealInputPanel({
  recipeText,
  trimmedRecipeTextLength,
  isAnalyzeDisabled,
  isLoading,
  socialFallback,
  usesBestEffortSocialIntake,
  showInstagramCaptionPrompt = false,
  onSubmit,
  onRecipeTextChange
}: {
  recipeText: string;
  trimmedRecipeTextLength: number;
  isAnalyzeDisabled: boolean;
  isLoading: boolean;
  socialFallback: AnalyzeState["socialFallback"];
  usesBestEffortSocialIntake: boolean;
  showInstagramCaptionPrompt?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRecipeTextChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const activeLoadingMessages = usesBestEffortSocialIntake
    ? socialIntakeLoadingMessages
    : loadingMessages;
  const loadingMessage = activeLoadingMessages[loadingMessageIndex];

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const resetId = window.setTimeout(() => {
      setLoadingMessageIndex(0);
    }, 0);
    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((current) =>
        current >= activeLoadingMessages.length - 1 ? current : current + 1
      );
    }, 5500);

    return () => {
      window.clearTimeout(resetId);
      window.clearInterval(intervalId);
    };
  }, [activeLoadingMessages.length, isLoading]);

  function focusRecipeText(cursorPosition?: number) {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      const position = cursorPosition ?? textarea.value.length;
      textarea.setSelectionRange(position, position);
    });
  }

  function appendNotesPrompt() {
    const nextValue = recipeText.trimEnd().includes("\nNotes:")
      ? recipeText
      : `${recipeText.trimEnd()}\n\nNotes: `;

    onRecipeTextChange(nextValue);
    focusRecipeText(nextValue.length);
  }

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
            <Label htmlFor="recipeText">
              {socialFallback ? "Caption, ingredients, or notes" : "Recipe or meal idea"}
            </Label>
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-72"
              id="recipeText"
              ref={textareaRef}
              onInput={(event) => {
                onRecipeTextChange(event.currentTarget.value);
              }}
              onChange={(event) => {
                onRecipeTextChange(event.currentTarget.value);
              }}
              placeholder={
                socialFallback
                  ? "Paste the caption, ingredient list, rough notes, method, servings, or what you remember from the video."
                  : "Paste a recipe URL, TikTok/Reel/Shorts link, caption, transcript, ingredients, instructions, servings, constraints, or a rough meal idea here."
              }
              rows={8}
              value={recipeText}
            />
            <p className="text-sm text-muted-foreground">
              Enter at least 10 characters. {trimmedRecipeTextLength} characters
            </p>
            <p className="text-sm text-muted-foreground">
              {usesBestEffortSocialIntake
                ? "Instagram captions may not be visible, but Tablewise can still prepare a reviewable best guess."
                : "This can take about 20-30 seconds for detailed meals."}
            </p>
            {usesBestEffortSocialIntake ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  type="button"
                  onClick={() => {
                    appendNotesPrompt();
                  }}
                >
                  Add notes
                </button>
                <button
                  className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  type="button"
                  onClick={() => {
                    focusRecipeText();
                  }}
                >
                  Edit guess
                </button>
              </div>
            ) : null}
            {showInstagramCaptionPrompt ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Have the caption? Paste it to improve this.
                </span>
                <button
                  className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  type="button"
                  onClick={() => {
                    appendNotesPrompt();
                  }}
                >
                  Add caption
                </button>
              </div>
            ) : null}
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
              {getAnalyzePrimaryCtaLabel({
                isLoading,
                socialFallback,
                usesBestEffortSocialIntake,
                loadingMessage
              })}
            </button>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Tablewise is still working. Detailed reviews can take a short moment.
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
