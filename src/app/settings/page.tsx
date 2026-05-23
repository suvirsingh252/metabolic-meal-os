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
  const [notionResult, setNotionResult] =
    useState<NotionDiagnosticsResult | null>(null);

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
    </div>
  );
}
