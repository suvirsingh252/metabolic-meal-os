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
  const showInstagramCaptionPrompt =
    state.analysis?.sourceClassification === "instagram" &&
    state.analysis.socialRecipeCandidate?.confidence === "low";

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="Dinner intake"
        title="Bring a meal into Tablewise"
        description="Paste a recipe, caption, or rough dinner idea. Tablewise turns it into a family-ready plan."
      />

      {intakeRecord && <IntakeBridgePanel intake={intakeRecord} />}

      <StatusBanner
        error={state.error}
        inputLooksLikeUrl={controller.inputLooksLikeUrl}
        recipeText={state.recipeText}
        socialFallback={state.socialFallback}
        urlRecovery={state.urlRecovery}
        usesBestEffortSocialIntake={controller.usesBestEffortSocialIntake}
      />

      <div className="mx-auto grid max-w-5xl gap-6">
        <MealInputPanel
          isAnalyzeDisabled={controller.isAnalyzeDisabled}
          isLoading={state.isLoading}
          onRecipeTextChange={controller.setRecipeText}
          onSubmit={controller.handleSubmit}
          recipeText={state.recipeText}
          showInstagramCaptionPrompt={showInstagramCaptionPrompt}
          socialFallback={state.socialFallback}
          trimmedRecipeTextLength={controller.trimmedRecipeTextLength}
          urlRecovery={state.urlRecovery}
          usesBestEffortSocialIntake={controller.usesBestEffortSocialIntake}
        />

        <AnalysisResultPanel
          onAnalysisChange={controller.updateAnalysis}
          onArrayFieldChange={controller.updateArrayField}
          onBooleanFieldChange={controller.updateBooleanField}
          onGuidanceBasisChange={controller.updateGuidanceBasis}
          onIngredientSuggestionsChange={controller.updateIngredientSuggestions}
          onOptimize={controller.handleOptimize}
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
