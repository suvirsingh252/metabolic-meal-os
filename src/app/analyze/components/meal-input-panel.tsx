"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  urlRecovery,
  usesBestEffortSocialIntake,
  loadingMessage
}: {
  isLoading: boolean;
  socialFallback: AnalyzeState["socialFallback"];
  urlRecovery: AnalyzeState["urlRecovery"];
  usesBestEffortSocialIntake: boolean;
  loadingMessage: string;
}) {
  if (isLoading) {
    return loadingMessage;
  }

  if (socialFallback) {
    return "Handle this dinner";
  }

  if (urlRecovery) {
    return "Handle this dinner";
  }

  if (usesBestEffortSocialIntake) {
    return "Handle the best guess";
  }

  return "Handle this dinner";
}

export function MealInputPanel({
  recipeText,
  trimmedRecipeTextLength,
  isAnalyzeDisabled,
  isLoading,
  socialFallback,
  urlRecovery,
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
  urlRecovery: AnalyzeState["urlRecovery"];
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
    <Card className="bg-card/80">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <FileText className="h-6 w-6 text-accent" />
          What are we making?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="recipeText">
              {socialFallback || urlRecovery
                ? "Paste what you have"
                : "Recipe, caption, or dinner idea"}
            </Label>
            <textarea
              className="min-h-44 w-full rounded-2xl border border-input/70 bg-background/80 px-5 py-4 text-base leading-7 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-72"
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
                  ? "Paste the caption, ingredients, method, servings, or what you remember."
                  : urlRecovery
                    ? "Paste ingredients, instructions, servings, or a rough description."
                  : "Paste a recipe URL, caption, ingredients, instructions, or a rough meal idea."
              }
              rows={8}
              value={recipeText}
            />
            <p className="text-sm leading-6 text-muted-foreground">
              {usesBestEffortSocialIntake
                ? "A best guess is okay. Add any details you remember."
                : `${trimmedRecipeTextLength} characters. Detailed meals can take 20-30 seconds.`}
            </p>
            {usesBestEffortSocialIntake ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                  type="button"
                  onClick={() => {
                    appendNotesPrompt();
                  }}
                >
                  Add notes
                </button>
                <button
                  className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
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
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Have the caption? Add it for a better dinner plan.
                </span>
                <button
                  className="rounded-full bg-card px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-card/80"
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
            <Button
              className="w-full sm:w-auto"
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
                urlRecovery,
                usesBestEffortSocialIntake,
                loadingMessage
              })}
            </Button>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Tablewise is building the household answer.
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
