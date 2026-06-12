"use client";

import { PageHeader } from "@/components/page-header";
import { AnalysisResultPanel } from "@/src/app/analyze/components/analysis-result-panel";
import { IntakeBridgePanel } from "@/src/app/analyze/components/intake-bridge-panel";
import { MealInputPanel } from "@/src/app/analyze/components/meal-input-panel";
import { StatusBanner } from "@/src/app/analyze/components/status-banner";
import { useAnalyzeController } from "@/src/app/analyze/hooks/use-analyze-controller";
import type { IntakeRecord } from "@/src/lib/intake/types";

interface Props {
  intakeRecord?: IntakeRecord | null;
}

export function AnalyzeClient({ intakeRecord }: Props) {
  const initialRecipeText = intakeRecord?.url ?? intakeRecord?.rawText ?? "";
  const controller = useAnalyzeController(initialRecipeText);
  const { state } = controller;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="Recipe intake"
        title="Analyze a recipe"
        description="Paste or share a meal, review the household answer, and save it."
      />

      {intakeRecord && <IntakeBridgePanel intake={intakeRecord} />}

      <StatusBanner
        error={state.error}
        inputLooksLikeUrl={controller.inputLooksLikeUrl}
        recipeText={state.recipeText}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
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
