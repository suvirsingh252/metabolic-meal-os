"use client";

import { type FormEvent, useState } from "react";
import { ExternalLink, FileText, Loader2, Save, Wand2 } from "lucide-react";
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
  | "feedbackPrompt";

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
    const ingredients = meal.ingredientSuggestions;

    if (ingredients.length === 0) {
      setIngredientPersistence({ state: "skipped" });
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
        description="Paste a recipe or meal idea, then review and edit the structured result before saving."
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recipe text
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
                  placeholder="Paste ingredients, instructions, servings, constraints, or a rough meal idea here."
                  rows={16}
                  value={recipeText}
                />
                <p className="text-sm text-muted-foreground">
                  Enter at least 10 characters. {trimmedRecipeTextLength}{" "}
                  characters
                </p>
                <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                  <p>recipeText.length: {recipeText.length}</p>
                  <p>recipeText.trim().length: {trimmedRecipeTextLength}</p>
                  <p>isLoading: {String(isLoading)}</p>
                  <p>isAnalyzeDisabled: {String(isAnalyzeDisabled)}</p>
                  <p className="whitespace-pre-wrap break-words">
                    recipeText: {recipeText}
                  </p>
                </div>
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
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void submitAnalysis()}
                  type="button"
                >
                  Force Analyze
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
        No ingredient suggestions to save.
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
