"use client";

import { type FormEvent, useReducer, useRef } from "react";
import {
  analyzeReducer,
  initialAnalyzeState,
  normalizeIngredientSuggestionText
} from "@/src/app/analyze/reducer";
import type {
  EditableArrayField,
  EditableBooleanField,
  EditableScoreField,
  EditableTextField,
  SaveIngredientsResponse,
  SaveMealResponse
} from "@/src/app/analyze/types";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

export function getErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Unable to analyze meal right now.";
}

export function looksLikeSharedUrl(value: string) {
  const trimmed = value.trim();

  return (
    /^https?:\/\//i.test(trimmed) ||
    /^www\./i.test(trimmed) ||
    /^(vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com|instagram\.com|youtu\.be|youtube\.com|m\.youtube\.com)\//i.test(
      trimmed
    )
  );
}

export function useAnalyzeController() {
  const reviewResultRef = useRef<HTMLDivElement | null>(null);
  const [state, dispatch] = useReducer(analyzeReducer, initialAnalyzeState);

  const trimmedRecipeTextLength = state.recipeText.trim().length;
  const inputLooksLikeUrl = looksLikeSharedUrl(state.recipeText);
  const isAnalyzeDisabled = state.isLoading || trimmedRecipeTextLength < 10;

  async function submitAnalysis() {
    if (state.isLoading) {
      return;
    }

    const trimmedRecipeText = state.recipeText.trim();

    if (trimmedRecipeText.length < 10) {
      dispatch({
        type: "analysisFailed",
        message: "Recipe text must be at least 10 characters."
      });
      return;
    }

    dispatch({ type: "analysisStarted" });

    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ recipeText: trimmedRecipeText })
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        dispatch({ type: "analysisFailed", message: getErrorMessage(data) });
        return;
      }

      dispatch({
        type: "analysisSucceeded",
        analysis: data as MealAnalysisResult
      });
      window.requestAnimationFrame(() => {
        reviewResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        reviewResultRef.current?.focus({ preventScroll: true });
      });
    } catch {
      dispatch({
        type: "analysisFailed",
        message: "Unable to reach the analysis service. Try again."
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAnalysis();
  }

  async function handleSaveToNotion() {
    if (!state.analysis || state.isSaving) {
      return;
    }

    dispatch({ type: "saveStarted" });

    try {
      const response = await fetch("/api/notion/save-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(state.analysis)
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        dispatch({ type: "saveFailed", message: getErrorMessage(data) });
        return;
      }

      const savedMeal = data as SaveMealResponse;
      dispatch({ type: "saveSucceeded", savedMeal });
      void persistIngredientSuggestions(state.analysis, savedMeal.notionPageId);
    } catch {
      dispatch({
        type: "saveFailed",
        message: "Unable to reach the meal saving service. Try again."
      });
    } finally {
      dispatch({ type: "saveFinished" });
    }
  }

  async function persistIngredientSuggestions(
    meal: MealAnalysisResult,
    mealPageId: string
  ) {
    const ingredients = normalizeIngredientSuggestionText(
      state.ingredientText,
      meal.ingredientSuggestions
    );

    if (ingredients.length === 0) {
      dispatch({
        type: "ingredientPersistenceChanged",
        status: { state: "empty" }
      });
      return;
    }

    dispatch({
      type: "ingredientPersistenceChanged",
      status: { state: "saving" }
    });

    try {
      const response = await fetch("/api/notion/save-ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mealName: meal.mealName,
          ingredients,
          mealPageId
        })
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        dispatch({
          type: "ingredientPersistenceChanged",
          status: { state: "failed", message: getErrorMessage(data) }
        });
        return;
      }

      const result = data as SaveIngredientsResponse;
      dispatch({
        type: "ingredientPersistenceChanged",
        status: {
          state: "success",
          createdCount: result.createdCount,
          skippedCount: result.skippedCount,
          duplicateCount: result.duplicateCount,
          relatedCount: result.relatedCount,
          malformedCount: result.malformedCount,
          relationWarning: result.relationWarning
        }
      });
    } catch {
      dispatch({
        type: "ingredientPersistenceChanged",
        status: {
          state: "failed",
          message: "Meal saved, but ingredients could not be saved right now."
        }
      });
    }
  }

  return {
    state,
    reviewResultRef,
    trimmedRecipeTextLength,
    inputLooksLikeUrl,
    isAnalyzeDisabled,
    handleSubmit,
    handleSaveToNotion,
    setRecipeText(value: string) {
      dispatch({ type: "recipeTextChanged", value });
    },
    updateTextField(field: EditableTextField, value: string) {
      dispatch({ type: "textFieldChanged", field, value });
    },
    updateBooleanField(field: EditableBooleanField, checked: boolean) {
      dispatch({ type: "booleanFieldChanged", field, checked });
    },
    updateScore(field: EditableScoreField, value: number) {
      dispatch({ type: "scoreChanged", field, value });
    },
    updateArrayField(field: EditableArrayField, value: string) {
      dispatch({ type: "arrayFieldChanged", field, value });
    },
    updateIngredientSuggestions(value: string) {
      dispatch({ type: "ingredientSuggestionsChanged", value });
    },
    updateGuidanceBasis(value: string) {
      dispatch({ type: "guidanceBasisChanged", value });
    },
    updateAnalysis(analysis: MealAnalysisResult) {
      dispatch({ type: "analysisReplaced", analysis });
    }
  };
}
