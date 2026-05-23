"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Settings2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
