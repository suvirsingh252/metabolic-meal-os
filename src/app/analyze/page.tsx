"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Wand2
} from "lucide-react";
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

type EditableTextField =
  | "mealName"
  | "optimizedVersion"
  | "notes"
  | "feedbackPrompt"
  | "quickVerdict"
  | "minimalChangeVersion"
  | "supportiveVersion"
  | "plateStrategy"
  | "whyThisHelps"
  | "culturalNotes"
  | "safetyDisclaimer";

type EditableScoreField =
  | "metabolicScore"
  | "proteinScore"
  | "fiberScore"
  | "satietyScoreNumeric"
  | "bloodSugarRiskScore";

type EditableBooleanField =
  | "familyApproved"
  | "weeknightFriendly"
  | "comfortMeal";

function getErrorMessage(value: unknown) {
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

interface SaveMealResponse {
  success: true;
  notionPageId: string;
  notionUrl: string;
}

interface SaveIngredientsResponse {
  success: true;
  createdCount: number;
  skippedCount: number;
  malformedCount: number;
}

type IngredientPersistenceStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "empty" }
  | {
      state: "success";
      createdCount: number;
      skippedCount: number;
      malformedCount: number;
    }
  | { state: "skipped" }
  | { state: "failed"; message: string };

export default function AnalyzePage() {
  const [recipeText, setRecipeText] = useState("");
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null);
  const [ingredientText, setIngredientText] = useState("");
  const [mainConcernsText, setMainConcernsText] = useState("");
  const [shoppingAdditionsText, setShoppingAdditionsText] = useState("");
  const [prepNotesText, setPrepNotesText] = useState("");
  const [mealPairingsText, setMealPairingsText] = useState("");
  const [cautionsText, setCautionsText] = useState("");
  const [evidenceNotesText, setEvidenceNotesText] = useState("");
  const [confidenceNotesText, setConfidenceNotesText] = useState("");
  const [guidanceBasisText, setGuidanceBasisText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMeal, setSavedMeal] = useState<SaveMealResponse | null>(null);
  const [ingredientPersistence, setIngredientPersistence] =
    useState<IngredientPersistenceStatus>({ state: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedRecipeTextLength = recipeText.trim().length;
  const isAnalyzeDisabled = isLoading || trimmedRecipeTextLength < 10;

  async function submitAnalysis() {
    if (isLoading) {
      return;
    }

    const trimmedRecipeText = recipeText.trim();

    if (trimmedRecipeText.length < 10) {
      setError("Recipe text must be at least 10 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveError(null);
    setSavedMeal(null);
    setIngredientPersistence({ state: "idle" });

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
        setError(getErrorMessage(data));
        return;
      }

      const result = data as MealAnalysisResult;
      setAnalysis(result);
      setIngredientText(result.ingredientSuggestions.join("\n"));
      setMainConcernsText(result.mainConcerns.join("\n"));
      setShoppingAdditionsText(result.shoppingAdditions.join("\n"));
      setPrepNotesText(result.prepNotes.join("\n"));
      setMealPairingsText(result.mealPairings.join("\n"));
      setCautionsText(result.cautions.join("\n"));
      setEvidenceNotesText(result.evidenceNotes.join("\n"));
      setConfidenceNotesText(result.confidenceNotes.join("\n"));
      setGuidanceBasisText(formatGuidanceBasis(result.guidanceBasis));
    } catch {
      setError("Unable to reach the analysis service. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAnalysis();
  }

  function updateTextField(field: EditableTextField, value: string) {
    clearSaveStatus();
    setAnalysis((current) =>
      current
        ? {
            ...current,
            [field]: value
          }
        : current
    );
  }

  function updateBooleanField(field: EditableBooleanField, checked: boolean) {
    clearSaveStatus();
    setAnalysis((current) =>
      current
        ? {
            ...current,
            [field]: checked
          }
        : current
    );
  }

  function updateIngredientSuggestions(value: string) {
    clearSaveStatus();
    setIngredientText(value);
    setAnalysis((current) =>
      current
        ? {
            ...current,
            ingredientSuggestions: value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          }
        : current
    );
  }

  function updateScore(field: EditableScoreField, value: number) {
    clearSaveStatus();
    setAnalysis((current) =>
      current ? { ...current, [field]: Math.min(10, Math.max(1, value)) } : current
    );
  }

  function updateArrayField(
    textSetter: (text: string) => void,
    field:
      | "mainConcerns"
      | "shoppingAdditions"
      | "prepNotes"
      | "mealPairings"
      | "cautions"
      | "evidenceNotes"
      | "confidenceNotes",
    value: string
  ) {
    clearSaveStatus();
    textSetter(value);
    setAnalysis((current) =>
      current
        ? {
            ...current,
            [field]: value.split("\n").map((s) => s.trim()).filter(Boolean)
          }
        : current
    );
  }

  function updateGuidanceBasis(value: string) {
    clearSaveStatus();
    setGuidanceBasisText(value);
    setAnalysis((current) =>
      current
        ? {
            ...current,
            guidanceBasis: parseGuidanceBasis(value)
          }
        : current
    );
  }

  function clearSaveStatus() {
    setSaveError(null);
    setSavedMeal(null);
    setIngredientPersistence({ state: "idle" });
  }

  function updateAnalysis(nextAnalysis: MealAnalysisResult) {
    clearSaveStatus();
    setAnalysis(nextAnalysis);
  }

  async function handleSaveToNotion() {
    if (!analysis || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSavedMeal(null);

    try {
      const response = await fetch("/api/notion/save-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(analysis)
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setSaveError(getErrorMessage(data));
        return;
      }

      setSavedMeal(data as SaveMealResponse);
      void persistIngredientSuggestions(analysis);
    } catch {
      setSaveError("Unable to reach Notion saving service. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function persistIngredientSuggestions(meal: MealAnalysisResult) {
    const ingredients = normalizeIngredientSuggestionText(
      ingredientText,
      meal.ingredientSuggestions
    );

    if (ingredients.length === 0) {
      setIngredientPersistence({ state: "empty" });
      return;
    }

    setIngredientPersistence({ state: "saving" });

    try {
      const response = await fetch("/api/notion/save-ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mealName: meal.mealName,
          ingredients
        })
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setIngredientPersistence({
          state: "failed",
          message: getErrorMessage(data)
        });
        return;
      }

      const result = data as SaveIngredientsResponse;
      setIngredientPersistence({
        state: "success",
        createdCount: result.createdCount,
        skippedCount: result.skippedCount,
        malformedCount: result.malformedCount
      });
    } catch {
      setIngredientPersistence({
        state: "failed",
        message:
          "Meal saved, but ingredients could not be saved right now."
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recipe intake"
        title="Analyze a recipe"
        description="Paste a recipe URL, recipe text, or meal idea. The review starts with the practical household answer, then keeps the details editable before saving."
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Meal or recipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="recipeText">Recipe or meal idea</Label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="recipeText"
                  onInput={(event) => {
                    setRecipeText(event.currentTarget.value);
                  }}
                  onChange={(event) => {
                    setRecipeText(event.currentTarget.value);
                  }}
                  placeholder="Paste a recipe URL, ingredients, instructions, servings, constraints, or a rough meal idea here."
                  rows={16}
                  value={recipeText}
                />
                <p className="text-sm text-muted-foreground">
                  Enter at least 10 characters. {trimmedRecipeTextLength}{" "}
                  characters
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  disabled={isAnalyzeDisabled}
                  type="submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isLoading ? "Analyzing..." : "Analyze recipe"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review result</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div className="space-y-6">
                <HouseholdSummary analysis={analysis} />

                <CollapsibleSection
                  defaultOpen
                  description="The short answer and the edits most likely to matter at home."
                  title="Practical guidance"
                >
                  <TextareaInput
                    id="quickVerdict"
                    label="Quick verdict"
                    onChange={(value) => updateTextField("quickVerdict", value)}
                    rows={3}
                    value={analysis.quickVerdict}
                  />
                  <TextareaInput
                    id="minimalChangeVersion"
                    label="Smallest helpful change"
                    onChange={(value) =>
                      updateTextField("minimalChangeVersion", value)
                    }
                    rows={4}
                    value={analysis.minimalChangeVersion}
                  />
                  <TextareaInput
                    id="whyThisHelps"
                    label="Why this helps"
                    onChange={(value) => updateTextField("whyThisHelps", value)}
                    rows={3}
                    value={analysis.whyThisHelps}
                  />
                  <TextareaInput
                    id="culturalNotes"
                    label="Keep the dish itself"
                    onChange={(value) => updateTextField("culturalNotes", value)}
                    rows={3}
                    value={analysis.culturalNotes}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  defaultOpen
                  description="Meal identity and household fit."
                  title="Quick edits"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      id="mealName"
                      label="Meal name"
                      onChange={(value) => updateTextField("mealName", value)}
                      value={analysis.mealName}
                    />
                    <EnumSelect<Cuisine>
                      id="cuisine"
                      label="Cuisine"
                      onChange={(value) =>
                        updateAnalysis({ ...analysis, cuisine: value })
                      }
                      options={cuisines}
                      value={analysis.cuisine}
                    />
                    <EnumSelect<MealType>
                      id="mealType"
                      label="Meal type"
                      onChange={(value) =>
                        updateAnalysis({ ...analysis, mealType: value })
                      }
                      options={mealTypes}
                      value={analysis.mealType}
                    />
                    <EnumSelect<ProteinLevel>
                      id="proteinLevel"
                      label="Protein level"
                      onChange={(value) =>
                        updateAnalysis({ ...analysis, proteinLevel: value })
                      }
                      options={proteinLevels}
                      value={analysis.proteinLevel}
                    />
                    <EnumSelect<SatietyLevel>
                      id="satietyLevel"
                      label="Satiety level"
                      onChange={(value) =>
                        updateAnalysis({ ...analysis, satietyLevel: value })
                      }
                      options={satietyLevels}
                      value={analysis.satietyLevel}
                    />
                    <EnumSelect<BloodSugarImpact>
                      id="bloodSugarImpact"
                      label="Blood sugar impact"
                      onChange={(value) =>
                        updateAnalysis({ ...analysis, bloodSugarImpact: value })
                      }
                      options={bloodSugarImpacts}
                      value={analysis.bloodSugarImpact}
                    />
                    <EnumSelect<EffortLevel>
                      id="effortLevel"
                      label="Effort level"
                      onChange={(value) =>
                        updateAnalysis({ ...analysis, effortLevel: value })
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
                        updateBooleanField("familyApproved", checked)
                      }
                    />
                    <BooleanInput
                      checked={analysis.weeknightFriendly}
                      id="weeknightFriendly"
                      label="Weeknight friendly"
                      onChange={(checked) =>
                        updateBooleanField("weeknightFriendly", checked)
                      }
                    />
                    <BooleanInput
                      checked={analysis.comfortMeal}
                      id="comfortMeal"
                      label="Comfort meal"
                      onChange={(checked) =>
                        updateBooleanField("comfortMeal", checked)
                      }
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  description="Useful when you want to tune the meal more carefully."
                  title="More ways to make it work"
                >
                  <TextareaInput
                    id="mainConcerns"
                    label="Main concerns (one per line)"
                    onChange={(value) =>
                      updateArrayField(
                        setMainConcernsText,
                        "mainConcerns",
                        value
                      )
                    }
                    rows={4}
                    value={mainConcernsText}
                  />
                  <TextareaInput
                    id="supportiveVersion"
                    label="More supportive version"
                    onChange={(value) =>
                      updateTextField("supportiveVersion", value)
                    }
                    rows={5}
                    value={analysis.supportiveVersion}
                  />
                  <TextareaInput
                    id="plateStrategy"
                    label="Plate strategy"
                    onChange={(value) => updateTextField("plateStrategy", value)}
                    rows={3}
                    value={analysis.plateStrategy}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  description="Small household moves that can make the meal easier to repeat."
                  title="Shopping, prep, and pairings"
                >
                  <TextareaInput
                    id="shoppingAdditions"
                    label="Shopping additions (one per line)"
                    onChange={(value) =>
                      updateArrayField(
                        setShoppingAdditionsText,
                        "shoppingAdditions",
                        value
                      )
                    }
                    rows={4}
                    value={shoppingAdditionsText}
                  />
                  <TextareaInput
                    id="prepNotes"
                    label="Prep notes (one per line)"
                    onChange={(value) =>
                      updateArrayField(setPrepNotesText, "prepNotes", value)
                    }
                    rows={4}
                    value={prepNotesText}
                  />
                  <TextareaInput
                    id="mealPairings"
                    label="Meal pairings (one per line)"
                    onChange={(value) =>
                      updateArrayField(
                        setMealPairingsText,
                        "mealPairings",
                        value
                      )
                    }
                    rows={4}
                    value={mealPairingsText}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  description="Kept compact so the review stays practical."
                  title="Scores"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ScoreInput
                      id="metabolicScore"
                      label="Metabolic"
                      onChange={(v) => updateScore("metabolicScore", v)}
                      value={analysis.metabolicScore}
                    />
                    <ScoreInput
                      id="proteinScore"
                      label="Protein"
                      onChange={(v) => updateScore("proteinScore", v)}
                      value={analysis.proteinScore}
                    />
                    <ScoreInput
                      id="fiberScore"
                      label="Fiber"
                      onChange={(v) => updateScore("fiberScore", v)}
                      value={analysis.fiberScore}
                    />
                    <ScoreInput
                      id="satietyScoreNumeric"
                      label="Satiety"
                      onChange={(v) => updateScore("satietyScoreNumeric", v)}
                      value={analysis.satietyScoreNumeric}
                    />
                    <ScoreInput
                      id="bloodSugarRiskScore"
                      label="Blood sugar risk"
                      onChange={(v) => updateScore("bloodSugarRiskScore", v)}
                      value={analysis.bloodSugarRiskScore}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  description="Evidence context stays available without dominating the household answer."
                  title="Evidence and safety"
                >
                  <TextareaInput
                    id="evidenceNotes"
                    label="Evidence notes (one per line)"
                    onChange={(value) =>
                      updateArrayField(
                        setEvidenceNotesText,
                        "evidenceNotes",
                        value
                      )
                    }
                    rows={4}
                    value={evidenceNotesText}
                  />
                  <TextareaInput
                    id="confidenceNotes"
                    label="Confidence notes (one per line)"
                    onChange={(value) =>
                      updateArrayField(
                        setConfidenceNotesText,
                        "confidenceNotes",
                        value
                      )
                    }
                    rows={3}
                    value={confidenceNotesText}
                  />
                  <TextareaInput
                    id="safetyDisclaimer"
                    label="Safety disclaimer"
                    onChange={(value) =>
                      updateTextField("safetyDisclaimer", value)
                    }
                    rows={2}
                    value={analysis.safetyDisclaimer}
                  />
                  <TextareaInput
                    id="guidanceBasis"
                    label="Guidance basis (sourceId | principleId | relevance)"
                    onChange={updateGuidanceBasis}
                    rows={5}
                    value={guidanceBasisText}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  description="Source details and fields saved into Notion."
                  title="Advanced saved fields"
                >
                  <SourceSummary analysis={analysis} />
                  <TextareaInput
                    id="optimizedVersion"
                    label="Optimized version"
                    onChange={(value) =>
                      updateTextField("optimizedVersion", value)
                    }
                    rows={8}
                    value={analysis.optimizedVersion}
                  />
                  <TextareaInput
                    id="notes"
                    label="Notes"
                    onChange={(value) => updateTextField("notes", value)}
                    rows={5}
                    value={analysis.notes}
                  />
                  <TextareaInput
                    id="ingredientSuggestions"
                    label="Ingredient suggestions"
                    onChange={updateIngredientSuggestions}
                    rows={6}
                    value={ingredientText}
                  />
                  <TextareaInput
                    id="feedbackPrompt"
                    label="Feedback prompt"
                    onChange={(value) =>
                      updateTextField("feedbackPrompt", value)
                    }
                    rows={3}
                    value={analysis.feedbackPrompt}
                  />
                  <TextareaInput
                    id="cautions"
                    label="Cautions (one per line)"
                    onChange={(value) =>
                      updateArrayField(setCautionsText, "cautions", value)
                    }
                    rows={3}
                    value={cautionsText}
                  />
                </CollapsibleSection>

                <div className="rounded-md border bg-background p-4">
                  <Button
                    disabled={!analysis || isSaving}
                    onClick={handleSaveToNotion}
                    type="button"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save to Notion"}
                  </Button>
                  {saveError ? <Alert className="mt-4">{saveError}</Alert> : null}
                  {savedMeal ? (
                    <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm">
                      <p className="font-medium text-primary">
                        Saved to Notion.
                      </p>
                      <a
                        className="mt-2 inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
                        href={savedMeal.notionUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open Notion page
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <IngredientPersistenceMessage
                        status={ingredientPersistence}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                No analysis has been generated yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatGuidanceBasis(
  guidanceBasis: MealAnalysisResult["guidanceBasis"]
) {
  return guidanceBasis
    .map(
      (basis) =>
        `${basis.sourceId} | ${basis.principleId} | ${basis.relevance}`
    )
    .join("\n");
}

function parseGuidanceBasis(value: string): MealAnalysisResult["guidanceBasis"] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sourceId = "", principleId = "", ...relevanceParts] = line
        .split("|")
        .map((part) => part.trim());

      return {
        sourceId,
        principleId,
        relevance: relevanceParts.join(" | ")
      };
    })
    .filter(
      (basis) =>
        basis.sourceId.length > 0 &&
        basis.principleId.length > 0 &&
        basis.relevance.length > 0
    );
}

function HouseholdSummary({ analysis }: { analysis: MealAnalysisResult }) {
  const answer = getHouseholdAnswer(analysis);

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Household answer
          </p>
          <h3 className="text-xl font-semibold leading-snug text-foreground">
            {answer.headline}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {analysis.quickVerdict}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryBadge label="Protein" value={analysis.proteinLevel} />
          <SummaryBadge label="Satiety" value={analysis.satietyLevel} />
          <SummaryBadge
            label="Blood sugar impact"
            value={analysis.bloodSugarImpact}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SummaryBlock
            label="Smallest helpful change"
            value={analysis.minimalChangeVersion}
          />
          <SummaryBlock label="Why" value={analysis.whyThisHelps} />
        </div>

        {analysis.culturalNotes.trim().length > 0 ? (
          <SummaryBlock
            label="Keep the dish itself"
            value={analysis.culturalNotes}
          />
        ) : null}
      </div>
    </div>
  );
}

function getHouseholdAnswer(analysis: MealAnalysisResult) {
  if (analysis.metabolicScore >= 8 && analysis.bloodSugarImpact !== "High") {
    return { headline: "Yes. This looks like a strong household option." };
  }

  if (analysis.metabolicScore >= 6 || analysis.bloodSugarImpact === "Moderate") {
    return {
      headline: "Yes, with a small nudge. This looks workable for the table."
    };
  }

  return {
    headline:
      "It can work better with a few changes before becoming a regular meal."
  };
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) {
  return (
    <details
      className="group rounded-md border bg-background p-4"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="mt-4 space-y-4 border-t pt-4">{children}</div>
    </details>
  );
}

function SourceSummary({ analysis }: { analysis: MealAnalysisResult }) {
  if (!analysis.sourceType) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-4 text-sm">
      <p className="font-medium">Recipe source</p>
      <div className="mt-2 space-y-1 text-muted-foreground">
        <p>Type: {analysis.sourceType}</p>
        {analysis.sourceName ? <p>Source: {analysis.sourceName}</p> : null}
        {analysis.parserVersion ? (
          <p>Parser: {analysis.parserVersion}</p>
        ) : null}
        {analysis.knownIngredientContextUsed ? (
          <p>
            Known ingredient context used
            {analysis.knownIngredientContextNames?.length
              ? `: ${analysis.knownIngredientContextNames.join(", ")}`
              : ""}
          </p>
        ) : null}
        {analysis.sourceUrl ? (
          <a
            className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            href={analysis.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open source
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>
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
        Ingredient save completed. Suggestions were already present or malformed.
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
        Meal saved, but ingredient persistence did not complete. {status.message}
      </p>
    );
  }

  return (
    <p className="mt-3 text-primary">
      Ingredient suggestions saved. Created {status.createdCount}; skipped{" "}
      {status.skippedCount} existing
      {status.malformedCount > 0
        ? `; ignored ${status.malformedCount} malformed`
        : ""}
      .
    </p>
  );
}

function normalizeIngredientSuggestionText(
  text: string,
  fallback: unknown
): string[] {
  const textIngredients = text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (textIngredients.length > 0) {
    return textIngredients;
  }

  if (!Array.isArray(fallback)) {
    return [];
  }

  return fallback
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextInput({ id, label, value, onChange }: TextInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

interface TextareaInputProps extends TextInputProps {
  rows: number;
}

function TextareaInput({
  id,
  label,
  value,
  onChange,
  rows
}: TextareaInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
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

interface ScoreInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function ScoreInput({ id, label, value, onChange }: ScoreInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}{" "}
        <span className="font-normal text-muted-foreground">{value}/10</span>
      </Label>
      <Input
        id={id}
        max={10}
        min={1}
        onChange={(event) => {
          const num = parseInt(event.target.value, 10);
          if (!isNaN(num)) onChange(Math.min(10, Math.max(1, num)));
        }}
        step={1}
        type="number"
        value={value}
      />
    </div>
  );
}
