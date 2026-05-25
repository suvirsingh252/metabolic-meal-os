"use client";

import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bloodSugarImpacts,
  cuisines,
  effortLevels,
  mealTypes,
  proteinLevels,
  satietyLevels,
  type BloodSugarImpact,
  type Cuisine,
  type EffortLevel,
  type MealAnalysisResult,
  type MealType,
  type ProteinLevel,
  type SatietyLevel
} from "@/src/lib/types/meal";
import type {
  AnalyzeState,
  EditableArrayField,
  EditableBooleanField,
  EditableScoreField,
  EditableTextField
} from "@/src/app/analyze/types";
import { HouseholdSummary } from "@/src/app/analyze/components/analysis-summary";
import {
  BooleanInput,
  CollapsibleSection,
  EnumSelect,
  ScoreInput,
  TextareaInput,
  TextInput
} from "@/src/app/analyze/components/form-fields";
import { SaveMealSection } from "@/src/app/analyze/components/save-meal-section";
import { SourceSummary } from "@/src/app/analyze/components/source-evidence-section";

const nutritionUnavailableMessage =
  "Nutrition totals unavailable for this source. Add estimates manually if you want dashboard tracking.";

type NutritionEstimate = NonNullable<MealAnalysisResult["nutritionEstimate"]>;
type NutritionTotals = NutritionEstimate["totals"];
type NutritionField = keyof NutritionTotals;

const blankNutritionEstimate: NutritionEstimate = {
  totals: {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sodium: null,
    sugar: null
  },
  confidence: "medium",
  provenance: "Entered during meal review",
  source: "user-entered"
};

export function hasAnyNutritionValue(totals: NutritionTotals) {
  return Object.values(totals).some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
}

export function getNutritionTotalsDisplayState(
  nutritionEstimate: MealAnalysisResult["nutritionEstimate"]
) {
  if (!nutritionEstimate) {
    return {
      mode: "unavailable" as const,
      estimate: blankNutritionEstimate,
      hasAnyNutritionValue: false,
      hasSourceNutrition: false,
      sourceLabel: "none detected"
    };
  }

  const hasValue = hasAnyNutritionValue(nutritionEstimate.totals);
  const sourceLabel =
    nutritionEstimate.source === "recipe-json-ld"
      ? "Recipe page"
      : nutritionEstimate.source === "notion-backfill"
        ? "Notion backfill"
        : nutritionEstimate.source === "estimated"
          ? "Estimated"
          : "Manual";

  return {
    mode:
      nutritionEstimate.source === "user-entered"
        ? ("manual" as const)
        : nutritionEstimate.source === "estimated"
          ? ("estimated" as const)
          : ("structured" as const),
    estimate: nutritionEstimate,
    hasAnyNutritionValue: hasValue,
    hasSourceNutrition: true,
    sourceLabel
  };
}

export function applyNutritionReviewEdit(
  estimate: NutritionEstimate,
  previousProvenance: string | null | undefined,
  field: NutritionField,
  value: number | null
): NutritionEstimate {
  return {
    ...estimate,
    source: "user-entered",
    provenance:
      previousProvenance &&
      !previousProvenance.includes("edited during meal review")
        ? `${previousProvenance}; edited during meal review`
        : (previousProvenance ?? "Entered during meal review"),
    totals: {
      ...estimate.totals,
      [field]: value
    }
  };
}

export function AnalysisResultPanel({
  state,
  reviewResultRef,
  onTextFieldChange,
  onBooleanFieldChange,
  onScoreChange,
  onArrayFieldChange,
  onIngredientSuggestionsChange,
  onGuidanceBasisChange,
  onAnalysisChange,
  onSave
}: {
  state: AnalyzeState;
  reviewResultRef: RefObject<HTMLDivElement>;
  onTextFieldChange: (field: EditableTextField, value: string) => void;
  onBooleanFieldChange: (field: EditableBooleanField, checked: boolean) => void;
  onScoreChange: (field: EditableScoreField, value: number) => void;
  onArrayFieldChange: (field: EditableArrayField, value: string) => void;
  onIngredientSuggestionsChange: (value: string) => void;
  onGuidanceBasisChange: (value: string) => void;
  onAnalysisChange: (analysis: MealAnalysisResult) => void;
  onSave: () => void;
}) {
  const { analysis } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review result</CardTitle>
      </CardHeader>
      <CardContent>
        {analysis ? (
          <div className="space-y-5" ref={reviewResultRef} tabIndex={-1}>
            <HouseholdSummary analysis={analysis} />

            <PracticalGuidanceSection
              analysis={analysis}
              onTextFieldChange={onTextFieldChange}
            />
            <QuickEditsSection
              analysis={analysis}
              onAnalysisChange={onAnalysisChange}
              onBooleanFieldChange={onBooleanFieldChange}
              onTextFieldChange={onTextFieldChange}
            />
            <NutritionTotalsSection
              analysis={analysis}
              onAnalysisChange={onAnalysisChange}
            />
            <SupportiveTuningSection
              analysis={analysis}
              mainConcernsText={state.mainConcernsText}
              onArrayFieldChange={onArrayFieldChange}
              onTextFieldChange={onTextFieldChange}
            />
            <ShoppingPrepSection
              mealPairingsText={state.mealPairingsText}
              onArrayFieldChange={onArrayFieldChange}
              prepNotesText={state.prepNotesText}
              shoppingAdditionsText={state.shoppingAdditionsText}
            />
            <ScoresSection analysis={analysis} onScoreChange={onScoreChange} />
            <EvidenceSection
              analysis={analysis}
              confidenceNotesText={state.confidenceNotesText}
              evidenceNotesText={state.evidenceNotesText}
              guidanceBasisText={state.guidanceBasisText}
              onArrayFieldChange={onArrayFieldChange}
              onGuidanceBasisChange={onGuidanceBasisChange}
              onTextFieldChange={onTextFieldChange}
            />
            <AdvancedSavedFieldsSection
              analysis={analysis}
              cautionsText={state.cautionsText}
              ingredientText={state.ingredientText}
              onArrayFieldChange={onArrayFieldChange}
              onIngredientSuggestionsChange={onIngredientSuggestionsChange}
              onTextFieldChange={onTextFieldChange}
            />
            <SaveMealSection
              analysis={analysis}
              ingredientPersistence={state.ingredientPersistence}
              isSaving={state.isSaving}
              onSave={onSave}
              saveError={state.saveError}
              savedMeal={state.savedMeal}
            />
          </div>
        ) : (
          <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
            No analysis has been generated yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NutritionTotalsSection({
  analysis,
  onAnalysisChange
}: {
  analysis: MealAnalysisResult;
  onAnalysisChange: (analysis: MealAnalysisResult) => void;
}) {
  const nutritionState = getNutritionTotalsDisplayState(
    analysis.nutritionEstimate
  );
  const {
    estimate,
    hasAnyNutritionValue,
    hasSourceNutrition,
    mode,
    sourceLabel
  } = nutritionState;

  const nutritionGroups: {
    title: string;
    fields: { field: NutritionField; label: string; unit: string }[];
  }[] = [
    {
      title: "Energy",
      fields: [{ field: "calories", label: "Calories", unit: "kcal" }]
    },
    {
      title: "Macros",
      fields: [
        { field: "protein", label: "Protein", unit: "g" },
        { field: "carbs", label: "Carbs", unit: "g" },
        { field: "fat", label: "Fat", unit: "g" }
      ]
    },
    {
      title: "Health Signals",
      fields: [
        { field: "fiber", label: "Fiber", unit: "g" },
        { field: "sodium", label: "Sodium", unit: "mg" },
        { field: "sugar", label: "Sugar", unit: "g" }
      ]
    }
  ];

  function updateTotal(
    field: NutritionField,
    value: string
  ) {
    const trimmed = value.trim();
    const numericValue = trimmed === "" ? null : Number(trimmed);

    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0)) {
      return;
    }

    onAnalysisChange({
      ...analysis,
      nutritionEstimate: applyNutritionReviewEdit(
        estimate,
        analysis.nutritionEstimate?.provenance,
        field,
        numericValue
      )
    });
  }

  function updateConfidence(value: NutritionEstimate["confidence"]) {
    onAnalysisChange({
      ...analysis,
      nutritionEstimate: {
        ...estimate,
        confidence: value
      }
    });
  }

  return (
    <CollapsibleSection
      description="Meal-level totals used by the dashboard. Leave unknown values blank."
      title="Nutrition totals"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  hasAnyNutritionValue
                    ? "bg-foreground text-background"
                    : undefined
                }
              >
                {hasAnyNutritionValue
                  ? `${estimate.confidence} confidence`
                  : "Unavailable"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Source: {hasSourceNutrition ? sourceLabel : "none detected"}
              </span>
            </div>
            {!hasSourceNutrition ? (
              <p className="text-sm text-muted-foreground">
                {nutritionUnavailableMessage}
              </p>
            ) : mode === "estimated" ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Estimated from meal description. Review before saving.
                </p>
                <p className="text-sm text-muted-foreground">
                  {estimate.provenance}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {estimate.provenance}
              </p>
            )}
          </div>
          {mode !== "unavailable" ? (
            <NutritionConfidenceSelect
              confidence={estimate.confidence}
              onChange={updateConfidence}
            />
          ) : null}
        </div>

        {mode === "unavailable" ? (
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Add manual estimates
            </summary>
            <div className="mt-4 space-y-4">
              <NutritionConfidenceSelect
                confidence={estimate.confidence}
                onChange={updateConfidence}
              />
              <NutritionFieldGroups
                groups={nutritionGroups}
                onUpdate={updateTotal}
                totals={estimate.totals}
              />
            </div>
          </details>
        ) : (
          <NutritionFieldGroups
            groups={nutritionGroups}
            onUpdate={updateTotal}
            totals={estimate.totals}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}

function NutritionConfidenceSelect({
  confidence,
  onChange
}: {
  confidence: NutritionEstimate["confidence"];
  onChange: (value: NutritionEstimate["confidence"]) => void;
}) {
  return (
    <div className="w-full space-y-2 sm:w-44">
      <Label htmlFor="nutrition-confidence">Confidence</Label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        id="nutrition-confidence"
        onChange={(event) =>
          onChange(event.target.value as NutritionEstimate["confidence"])
        }
        value={confidence}
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  );
}

function NutritionFieldGroups({
  groups,
  onUpdate,
  totals
}: {
  groups: {
    title: string;
    fields: { field: NutritionField; label: string; unit: string }[];
  }[];
  onUpdate: (field: NutritionField, value: string) => void;
  totals: NutritionTotals;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {groups.map((group) => (
        <div className="space-y-3 rounded-md border p-3" key={group.title}>
          <h4 className="text-sm font-medium">{group.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {group.fields.map((item) => (
              <NutritionInput
                key={item.field}
                label={item.label}
                onChange={(value) => onUpdate(item.field, value)}
                unit={item.unit}
                value={totals[item.field]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NutritionInput({
  label,
  onChange,
  unit,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  unit: string;
  value: number | null;
}) {
  const id = `nutrition-${label.toLowerCase()}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          min={0}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add"
          type="number"
          value={value ?? ""}
        />
        <span className="w-10 text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function PracticalGuidanceSection({
  analysis,
  onTextFieldChange
}: {
  analysis: MealAnalysisResult;
  onTextFieldChange: (field: EditableTextField, value: string) => void;
}) {
  return (
    <CollapsibleSection
      defaultOpen
      description="The short answer and the edits most likely to matter at home."
      title="Practical guidance"
    >
      <TextareaInput
        id="quickVerdict"
        label="Quick verdict"
        onChange={(value) => onTextFieldChange("quickVerdict", value)}
        rows={3}
        value={analysis.quickVerdict}
      />
      <TextareaInput
        id="minimalChangeVersion"
        label="Smallest helpful change"
        onChange={(value) => onTextFieldChange("minimalChangeVersion", value)}
        rows={4}
        value={analysis.minimalChangeVersion}
      />
      <TextareaInput
        id="whyThisHelps"
        label="Why this helps"
        onChange={(value) => onTextFieldChange("whyThisHelps", value)}
        rows={3}
        value={analysis.whyThisHelps}
      />
      <TextareaInput
        id="culturalNotes"
        label="Keep the dish itself"
        onChange={(value) => onTextFieldChange("culturalNotes", value)}
        rows={3}
        value={analysis.culturalNotes}
      />
    </CollapsibleSection>
  );
}

function QuickEditsSection({
  analysis,
  onAnalysisChange,
  onBooleanFieldChange,
  onTextFieldChange
}: {
  analysis: MealAnalysisResult;
  onAnalysisChange: (analysis: MealAnalysisResult) => void;
  onBooleanFieldChange: (field: EditableBooleanField, checked: boolean) => void;
  onTextFieldChange: (field: EditableTextField, value: string) => void;
}) {
  return (
    <CollapsibleSection
      defaultOpen
      description="Meal identity and household fit."
      title="Quick edits"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          id="mealName"
          label="Meal name"
          onChange={(value) => onTextFieldChange("mealName", value)}
          value={analysis.mealName}
        />
        <EnumSelect<Cuisine>
          id="cuisine"
          label="Cuisine"
          onChange={(value) => onAnalysisChange({ ...analysis, cuisine: value })}
          options={cuisines}
          value={analysis.cuisine}
        />
        <EnumSelect<MealType>
          id="mealType"
          label="Meal type"
          onChange={(value) => onAnalysisChange({ ...analysis, mealType: value })}
          options={mealTypes}
          value={analysis.mealType}
        />
        <EnumSelect<ProteinLevel>
          id="proteinLevel"
          label="Protein level"
          onChange={(value) =>
            onAnalysisChange({ ...analysis, proteinLevel: value })
          }
          options={proteinLevels}
          value={analysis.proteinLevel}
        />
        <EnumSelect<SatietyLevel>
          id="satietyLevel"
          label="Satiety level"
          onChange={(value) =>
            onAnalysisChange({ ...analysis, satietyLevel: value })
          }
          options={satietyLevels}
          value={analysis.satietyLevel}
        />
        <EnumSelect<BloodSugarImpact>
          id="bloodSugarImpact"
          label="Blood sugar impact"
          onChange={(value) =>
            onAnalysisChange({ ...analysis, bloodSugarImpact: value })
          }
          options={bloodSugarImpacts}
          value={analysis.bloodSugarImpact}
        />
        <EnumSelect<EffortLevel>
          id="effortLevel"
          label="Effort level"
          onChange={(value) =>
            onAnalysisChange({ ...analysis, effortLevel: value })
          }
          options={effortLevels}
          value={analysis.effortLevel}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <BooleanInput
          checked={analysis.familyApproved}
          id="familyApproved"
          label="Family approved"
          onChange={(checked) =>
            onBooleanFieldChange("familyApproved", checked)
          }
        />
        <BooleanInput
          checked={analysis.weeknightFriendly}
          id="weeknightFriendly"
          label="Weeknight friendly"
          onChange={(checked) =>
            onBooleanFieldChange("weeknightFriendly", checked)
          }
        />
        <BooleanInput
          checked={analysis.comfortMeal}
          id="comfortMeal"
          label="Comfort meal"
          onChange={(checked) => onBooleanFieldChange("comfortMeal", checked)}
        />
      </div>
    </CollapsibleSection>
  );
}

function SupportiveTuningSection({
  analysis,
  mainConcernsText,
  onArrayFieldChange,
  onTextFieldChange
}: {
  analysis: MealAnalysisResult;
  mainConcernsText: string;
  onArrayFieldChange: (field: EditableArrayField, value: string) => void;
  onTextFieldChange: (field: EditableTextField, value: string) => void;
}) {
  return (
    <CollapsibleSection
      description="Useful when you want to tune the meal more carefully."
      title="More ways to make it work"
    >
      <TextareaInput
        id="mainConcerns"
        label="Main concerns (one per line)"
        onChange={(value) => onArrayFieldChange("mainConcerns", value)}
        rows={4}
        value={mainConcernsText}
      />
      <TextareaInput
        id="supportiveVersion"
        label="More supportive version"
        onChange={(value) => onTextFieldChange("supportiveVersion", value)}
        rows={5}
        value={analysis.supportiveVersion}
      />
      <TextareaInput
        id="plateStrategy"
        label="Plate strategy"
        onChange={(value) => onTextFieldChange("plateStrategy", value)}
        rows={3}
        value={analysis.plateStrategy}
      />
    </CollapsibleSection>
  );
}

function ShoppingPrepSection({
  mealPairingsText,
  onArrayFieldChange,
  prepNotesText,
  shoppingAdditionsText
}: {
  mealPairingsText: string;
  onArrayFieldChange: (field: EditableArrayField, value: string) => void;
  prepNotesText: string;
  shoppingAdditionsText: string;
}) {
  return (
    <CollapsibleSection
      description="Small household moves that can make the meal easier to repeat."
      title="Shopping, prep, and pairings"
    >
      <TextareaInput
        id="shoppingAdditions"
        label="Shopping additions (one per line)"
        onChange={(value) => onArrayFieldChange("shoppingAdditions", value)}
        rows={4}
        value={shoppingAdditionsText}
      />
      <TextareaInput
        id="prepNotes"
        label="Prep notes (one per line)"
        onChange={(value) => onArrayFieldChange("prepNotes", value)}
        rows={4}
        value={prepNotesText}
      />
      <TextareaInput
        id="mealPairings"
        label="Meal pairings (one per line)"
        onChange={(value) => onArrayFieldChange("mealPairings", value)}
        rows={4}
        value={mealPairingsText}
      />
    </CollapsibleSection>
  );
}

function ScoresSection({
  analysis,
  onScoreChange
}: {
  analysis: MealAnalysisResult;
  onScoreChange: (field: EditableScoreField, value: number) => void;
}) {
  return (
    <CollapsibleSection
      description="Kept compact so the review stays practical."
      title="Scores"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ScoreInput
          id="metabolicScore"
          label="Metabolic"
          onChange={(value) => onScoreChange("metabolicScore", value)}
          value={analysis.metabolicScore}
        />
        <ScoreInput
          id="proteinScore"
          label="Protein"
          onChange={(value) => onScoreChange("proteinScore", value)}
          value={analysis.proteinScore}
        />
        <ScoreInput
          id="fiberScore"
          label="Fiber"
          onChange={(value) => onScoreChange("fiberScore", value)}
          value={analysis.fiberScore}
        />
        <ScoreInput
          id="satietyScoreNumeric"
          label="Satiety"
          onChange={(value) => onScoreChange("satietyScoreNumeric", value)}
          value={analysis.satietyScoreNumeric}
        />
        <ScoreInput
          id="bloodSugarRiskScore"
          label="Blood sugar risk"
          onChange={(value) => onScoreChange("bloodSugarRiskScore", value)}
          value={analysis.bloodSugarRiskScore}
        />
      </div>
    </CollapsibleSection>
  );
}

function EvidenceSection({
  analysis,
  confidenceNotesText,
  evidenceNotesText,
  guidanceBasisText,
  onArrayFieldChange,
  onGuidanceBasisChange,
  onTextFieldChange
}: {
  analysis: MealAnalysisResult;
  confidenceNotesText: string;
  evidenceNotesText: string;
  guidanceBasisText: string;
  onArrayFieldChange: (field: EditableArrayField, value: string) => void;
  onGuidanceBasisChange: (value: string) => void;
  onTextFieldChange: (field: EditableTextField, value: string) => void;
}) {
  return (
    <CollapsibleSection
      description="Evidence context stays available without dominating the household answer."
      title="Evidence and safety"
    >
      <TextareaInput
        id="evidenceNotes"
        label="Evidence notes (one per line)"
        onChange={(value) => onArrayFieldChange("evidenceNotes", value)}
        rows={4}
        value={evidenceNotesText}
      />
      <TextareaInput
        id="confidenceNotes"
        label="Confidence notes (one per line)"
        onChange={(value) => onArrayFieldChange("confidenceNotes", value)}
        rows={3}
        value={confidenceNotesText}
      />
      <TextareaInput
        id="safetyDisclaimer"
        label="Safety disclaimer"
        onChange={(value) => onTextFieldChange("safetyDisclaimer", value)}
        rows={2}
        value={analysis.safetyDisclaimer}
      />
      <TextareaInput
        id="guidanceBasis"
        label="Guidance basis (sourceId | principleId | relevance)"
        onChange={onGuidanceBasisChange}
        rows={5}
        value={guidanceBasisText}
      />
    </CollapsibleSection>
  );
}

function AdvancedSavedFieldsSection({
  analysis,
  cautionsText,
  ingredientText,
  onArrayFieldChange,
  onIngredientSuggestionsChange,
  onTextFieldChange
}: {
  analysis: MealAnalysisResult;
  cautionsText: string;
  ingredientText: string;
  onArrayFieldChange: (field: EditableArrayField, value: string) => void;
  onIngredientSuggestionsChange: (value: string) => void;
  onTextFieldChange: (field: EditableTextField, value: string) => void;
}) {
  return (
    <CollapsibleSection
      description="Source details and fields saved into Notion."
      title="Advanced saved fields"
    >
      <SourceSummary analysis={analysis} />
      <TextareaInput
        id="optimizedVersion"
        label="Optimized version"
        onChange={(value) => onTextFieldChange("optimizedVersion", value)}
        rows={8}
        value={analysis.optimizedVersion}
      />
      <TextareaInput
        id="notes"
        label="Notes"
        onChange={(value) => onTextFieldChange("notes", value)}
        rows={5}
        value={analysis.notes}
      />
      <TextareaInput
        id="ingredientSuggestions"
        label="Ingredient suggestions"
        onChange={onIngredientSuggestionsChange}
        rows={6}
        value={ingredientText}
      />
      <TextareaInput
        id="feedbackPrompt"
        label="Feedback prompt"
        onChange={(value) => onTextFieldChange("feedbackPrompt", value)}
        rows={3}
        value={analysis.feedbackPrompt}
      />
      <TextareaInput
        id="cautions"
        label="Cautions (one per line)"
        onChange={(value) => onArrayFieldChange("cautions", value)}
        rows={3}
        value={cautionsText}
      />
    </CollapsibleSection>
  );
}
