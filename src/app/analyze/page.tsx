"use client";

import { PageHeader } from "@/components/page-header";
import { AnalysisResultPanel } from "@/src/app/analyze/components/analysis-result-panel";
import { MealInputPanel } from "@/src/app/analyze/components/meal-input-panel";
import { StatusBanner } from "@/src/app/analyze/components/status-banner";
import { useAnalyzeController } from "@/src/app/analyze/hooks/use-analyze-controller";

export default function AnalyzePage() {
  const controller = useAnalyzeController();
  const { state } = controller;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recipe intake"
        title="Analyze a recipe"
        description="Paste a recipe URL, recipe text, or meal idea. The review starts with the practical household answer, then keeps the details editable before saving."
      />

      <StatusBanner
        error={state.error}
        inputLooksLikeUrl={controller.inputLooksLikeUrl}
        recipeText={state.recipeText}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <MealInputPanel
          isAnalyzeDisabled={controller.isAnalyzeDisabled}
          isLoading={state.isLoading}
          onRecipeTextChange={controller.setRecipeText}
          onSubmit={controller.handleSubmit}
          recipeText={state.recipeText}
          trimmedRecipeTextLength={controller.trimmedRecipeTextLength}
        />

        <AnalysisResultPanel
          onAnalysisChange={controller.updateAnalysis}
          onArrayFieldChange={controller.updateArrayField}
          onBooleanFieldChange={controller.updateBooleanField}
          onGuidanceBasisChange={controller.updateGuidanceBasis}
          onIngredientSuggestionsChange={controller.updateIngredientSuggestions}
          onSave={controller.handleSaveToNotion}
          onScoreChange={controller.updateScore}
          onTextFieldChange={controller.updateTextField}
          reviewResultRef={controller.reviewResultRef}
          state={state}
        />
      </div>
    </div>
  );
}
