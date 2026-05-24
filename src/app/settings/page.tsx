"use client";

import { useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Search,
  Settings2,
  XCircle
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDefaultHouseholdPreferences } from "@/src/lib/household/preferences";

interface NotionDiagnosticsSuccess {
  ok: true;
  databaseTitle: string;
  databaseId: string;
}

interface NotionDiagnosticsFailure {
  ok: false;
  error: string;
}

type NotionDiagnosticsResult =
  | NotionDiagnosticsSuccess
  | NotionDiagnosticsFailure;

interface NotionSchemaDatabase {
  key: "meals" | "ingredients" | "feedback";
  id: string;
  title: string;
  properties: Array<{
    name: string;
    type: string;
  }>;
}

interface NotionSchemaError {
  key: "meals" | "ingredients" | "feedback";
  ok: false;
  error: string;
}

interface NotionSchemasResult {
  ok: boolean;
  databases: NotionSchemaDatabase[];
  errors?: NotionSchemaError[];
}

interface IngredientLookupSnapshot {
  ingredient: string;
  source: "usda-food-data-central";
  sourceName: "USDA FoodData Central";
  confidence: "high" | "medium" | "low";
  matchedDescription: string;
  fdcId: number;
  nutrients: {
    proteinG?: number;
    fiberG?: number;
    carbohydrateG?: number;
    totalSugarsG?: number;
    totalFatG?: number;
    saturatedFatG?: number;
    sodiumMg?: number;
    energyKcal?: number;
  };
  notes: string[];
}

interface IngredientEnrichmentResult {
  success: true;
  mode: "lookup" | "lookup-and-update";
  lookup: IngredientLookupSnapshot;
  lookupConfidence: "high" | "medium" | "low";
  updatedFields: string[];
  skippedFields: Array<{
    field: string;
    reason: string;
  }>;
}

function getErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Unable to verify Notion connection.";
}

export default function SettingsPage() {
  const [isTestingNotion, setIsTestingNotion] = useState(false);
  const [isTestingSchemas, setIsTestingSchemas] = useState(false);
  const [notionResult, setNotionResult] =
    useState<NotionDiagnosticsResult | null>(null);
  const [schemaResult, setSchemaResult] = useState<NotionSchemasResult | null>(
    null
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [lookupIngredient, setLookupIngredient] = useState("chickpeas");
  const [isLookingUpIngredient, setIsLookingUpIngredient] = useState(false);
  const [ingredientLookupResult, setIngredientLookupResult] =
    useState<IngredientLookupSnapshot | null>(null);
  const [ingredientLookupError, setIngredientLookupError] = useState<
    string | null
  >(null);
  const [enrichIngredient, setEnrichIngredient] = useState("chickpeas");
  const [enrichIngredientPageId, setEnrichIngredientPageId] = useState("");
  const [isEnrichingIngredient, setIsEnrichingIngredient] = useState(false);
  const [ingredientEnrichmentResult, setIngredientEnrichmentResult] =
    useState<IngredientEnrichmentResult | null>(null);
  const [ingredientEnrichmentError, setIngredientEnrichmentError] = useState<
    string | null
  >(null);
  const householdPreferences = getDefaultHouseholdPreferences();

  async function testNotionConnection() {
    if (isTestingNotion) {
      return;
    }

    setIsTestingNotion(true);
    setNotionResult(null);

    try {
      const response = await fetch("/api/diagnostics/notion");
      const data: unknown = await response.json();

      if (!response.ok) {
        setNotionResult({
          ok: false,
          error: getErrorMessage(data)
        });
        return;
      }

      setNotionResult(data as NotionDiagnosticsSuccess);
    } catch {
      setNotionResult({
        ok: false,
        error: "Unable to reach the diagnostics endpoint. Try again."
      });
    } finally {
      setIsTestingNotion(false);
    }
  }

  async function testNotionSchemas() {
    if (isTestingSchemas) {
      return;
    }

    setIsTestingSchemas(true);
    setSchemaResult(null);
    setSchemaError(null);

    try {
      const response = await fetch("/api/diagnostics/notion-schemas");
      const data: unknown = await response.json();

      if (!response.ok) {
        setSchemaError(getErrorMessage(data));
        return;
      }

      setSchemaResult(data as NotionSchemasResult);
    } catch {
      setSchemaError("Unable to reach the schema diagnostics endpoint. Try again.");
    } finally {
      setIsTestingSchemas(false);
    }
  }

  async function testIngredientLookup() {
    if (isLookingUpIngredient) {
      return;
    }

    const ingredient = lookupIngredient.trim();

    if (ingredient.length < 2) {
      setIngredientLookupError("Ingredient must be at least 2 characters.");
      setIngredientLookupResult(null);
      return;
    }

    setIsLookingUpIngredient(true);
    setIngredientLookupError(null);
    setIngredientLookupResult(null);

    try {
      const response = await fetch("/api/ingredients/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ingredient })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setIngredientLookupError(getErrorMessage(data));
        return;
      }

      setIngredientLookupResult(data as IngredientLookupSnapshot);
    } catch {
      setIngredientLookupError(
        "Unable to reach the ingredient lookup endpoint. Try again."
      );
    } finally {
      setIsLookingUpIngredient(false);
    }
  }

  async function testIngredientEnrichment() {
    if (isEnrichingIngredient) {
      return;
    }

    const ingredientName = enrichIngredient.trim();
    const ingredientPageId = enrichIngredientPageId.trim();

    if (ingredientName.length < 2) {
      setIngredientEnrichmentError("Ingredient name must be at least 2 characters.");
      setIngredientEnrichmentResult(null);
      return;
    }

    setIsEnrichingIngredient(true);
    setIngredientEnrichmentError(null);
    setIngredientEnrichmentResult(null);

    try {
      const response = await fetch("/api/ingredients/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ingredientName,
          ingredientPageId: ingredientPageId || null
        })
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setIngredientEnrichmentError(getErrorMessage(data));
        return;
      }

      setIngredientEnrichmentResult(data as IngredientEnrichmentResult);
    } catch {
      setIngredientEnrichmentError(
        "Unable to reach the ingredient enrichment endpoint. Try again."
      );
    } finally {
      setIsEnrichingIngredient(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Verify server-side OpenAI and Notion configuration without exposing secrets to the client."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Server environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-status">OpenAI API key</Label>
              <Input id="openai-status" readOnly value="Server-side only" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notion-status">Notion API key</Label>
              <Input id="notion-status" readOnly value="Server-side only" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              MVP scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>No authentication is enabled.</p>
            <p>No local database is configured.</p>
            <p>API credentials remain server-only.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Household defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadonlySetting label="Country" value={householdPreferences.country} />
          <ReadonlySetting label="Province" value={householdPreferences.province} />
          <ReadonlySetting label="City" value={householdPreferences.city} />
          <ReadonlySetting
            label="Preferred units"
            value={householdPreferences.preferredUnits}
          />
          <ReadonlySetting label="Currency" value={householdPreferences.currency} />
          <ReadonlySetting
            label="Temperature"
            value={householdPreferences.temperatureUnit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notion diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            disabled={isTestingNotion}
            onClick={testNotionConnection}
            type="button"
          >
            {isTestingNotion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings2 className="h-4 w-4" />
            )}
            {isTestingNotion ? "Testing..." : "Test Notion Connection"}
          </Button>

          {notionResult?.ok ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Notion connection verified
              </div>
              <p className="mt-2 text-foreground">
                Meals database: {notionResult.databaseTitle}
              </p>
              <p className="mt-1 break-all text-muted-foreground">
                {notionResult.databaseId}
              </p>
            </div>
          ) : null}

          {notionResult && !notionResult.ok ? (
            <Alert>
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {notionResult.error}
              </span>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Ingredient Lookup Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="ingredientLookup">Ingredient</Label>
              <Input
                id="ingredientLookup"
                maxLength={100}
                onChange={(event) => setLookupIngredient(event.target.value)}
                placeholder="e.g. chickpeas"
                value={lookupIngredient}
              />
            </div>
            <div className="flex items-end">
              <Button
                disabled={isLookingUpIngredient}
                onClick={testIngredientLookup}
                type="button"
                variant="secondary"
              >
                {isLookingUpIngredient ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {isLookingUpIngredient ? "Looking up..." : "Lookup"}
              </Button>
            </div>
          </div>

          {ingredientLookupError ? (
            <Alert>
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {ingredientLookupError}
              </span>
            </Alert>
          ) : null}

          {ingredientLookupResult ? (
            <IngredientLookupResultCard result={ingredientLookupResult} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enrich Ingredient Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="enrichIngredient">Ingredient name</Label>
              <Input
                id="enrichIngredient"
                maxLength={100}
                onChange={(event) => setEnrichIngredient(event.target.value)}
                placeholder="e.g. chickpeas"
                value={enrichIngredient}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrichIngredientPageId">
                Ingredient page ID optional
              </Label>
              <Input
                id="enrichIngredientPageId"
                onChange={(event) =>
                  setEnrichIngredientPageId(event.target.value)
                }
                placeholder="Paste a Notion Ingredient page ID to update"
                value={enrichIngredientPageId}
              />
            </div>
            <div className="flex items-end">
              <Button
                disabled={isEnrichingIngredient}
                onClick={testIngredientEnrichment}
                type="button"
                variant="secondary"
              >
                {isEnrichingIngredient ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {isEnrichingIngredient ? "Enriching..." : "Enrich"}
              </Button>
            </div>
          </div>

          {ingredientEnrichmentError ? (
            <Alert>
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {ingredientEnrichmentError}
              </span>
            </Alert>
          ) : null}

          {ingredientEnrichmentResult ? (
            <IngredientEnrichmentResultCard
              result={ingredientEnrichmentResult}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notion schema diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            disabled={isTestingSchemas}
            onClick={testNotionSchemas}
            type="button"
            variant="secondary"
          >
            {isTestingSchemas ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings2 className="h-4 w-4" />
            )}
            {isTestingSchemas ? "Testing..." : "Test Notion Schemas"}
          </Button>

          {schemaError ? (
            <Alert>
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {schemaError}
              </span>
            </Alert>
          ) : null}

          {schemaResult ? (
            <div className="space-y-4">
              {schemaResult.ok ? (
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Active Notion schemas loaded
                </div>
              ) : null}

              {schemaResult.errors?.length ? (
                <Alert>
                  <div className="space-y-2">
                    {schemaResult.errors.map((error) => (
                      <div
                        className="flex items-center gap-2"
                        key={error.key}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>{error.error}</span>
                      </div>
                    ))}
                  </div>
                </Alert>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3">
                {schemaResult.databases.map((database) => (
                  <SchemaSummaryCard database={database} key={database.key} />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function IngredientEnrichmentResultCard({
  result
}: {
  result: IngredientEnrichmentResult;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-background p-4 text-sm">
      <div>
        <p className="font-medium">
          {result.mode === "lookup-and-update"
            ? "Lookup and update completed"
            : "Lookup completed without Notion update"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Confidence {result.lookupConfidence}; matched{" "}
          {result.lookup.matchedDescription}; FDC ID {result.lookup.fdcId}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FieldList
          emptyText="No fields were updated."
          fields={result.updatedFields}
          title="Updated fields"
        />
        <SkippedFieldList fields={result.skippedFields} />
      </div>

      <IngredientLookupResultCard result={result.lookup} />
    </div>
  );
}

function FieldList({
  title,
  fields,
  emptyText
}: {
  title: string;
  fields: string[];
  emptyText: string;
}) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      {fields.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {fields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function SkippedFieldList({
  fields
}: {
  fields: IngredientEnrichmentResult["skippedFields"];
}) {
  return (
    <div>
      <p className="font-medium">Skipped fields</p>
      {fields.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {fields.map((field) => (
            <li key={`${field.field}-${field.reason}`}>
              {field.field}: {field.reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">No fields were skipped.</p>
      )}
    </div>
  );
}

function IngredientLookupResultCard({
  result
}: {
  result: IngredientLookupSnapshot;
}) {
  const nutrients = [
    ["Energy", formatNutrient(result.nutrients.energyKcal, "kcal")],
    ["Protein", formatNutrient(result.nutrients.proteinG, "g")],
    ["Carbohydrate", formatNutrient(result.nutrients.carbohydrateG, "g")],
    ["Fiber", formatNutrient(result.nutrients.fiberG, "g")],
    ["Total sugars", formatNutrient(result.nutrients.totalSugarsG, "g")],
    ["Total fat", formatNutrient(result.nutrients.totalFatG, "g")],
    ["Saturated fat", formatNutrient(result.nutrients.saturatedFatG, "g")],
    ["Sodium", formatNutrient(result.nutrients.sodiumMg, "mg")]
  ];

  return (
    <div className="rounded-md border bg-background p-4 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{result.matchedDescription}</p>
          <p className="mt-1 text-muted-foreground">
            {result.sourceName} · FDC ID {result.fdcId} · confidence{" "}
            {result.confidence}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {nutrients.map(([label, value]) => (
          <div className="rounded-md border bg-card px-3 py-2" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
          </div>
        ))}
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-muted-foreground">
        {result.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

function formatNutrient(value: number | undefined, unit: string) {
  return typeof value === "number" ? `${value} ${unit}` : "Not returned";
}

function ReadonlySetting({ label, value }: { label: string; value: string }) {
  const id = `setting-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} readOnly value={value} />
    </div>
  );
}

function SchemaSummaryCard({
  database
}: {
  database: NotionSchemaDatabase;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {database.key}
        </p>
        <h2 className="font-semibold">{database.title}</h2>
        <p className="break-all text-xs text-muted-foreground">{database.id}</p>
      </div>

      <div className="mt-4 space-y-2">
        {database.properties.map((property) => (
          <div
            className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
            key={property.name}
          >
            <span className="min-w-0 truncate font-medium">{property.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {property.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
