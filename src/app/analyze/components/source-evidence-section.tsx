"use client";

import { ExternalLink } from "lucide-react";
import type { MealAnalysisResult } from "@/src/lib/types/meal";

export function SourceSummary({ analysis }: { analysis: MealAnalysisResult }) {
  if (!analysis.sourceType) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-4 text-sm">
      <p className="font-medium">Recipe source</p>
      <div className="mt-2 space-y-1 text-muted-foreground">
        <p>Type: {analysis.sourceType}</p>
        {analysis.sourceClassification ? (
          <p>Classification: {analysis.sourceClassification}</p>
        ) : null}
        {analysis.sourceName ? <p>Source: {analysis.sourceName}</p> : null}
        {analysis.parserVersion ? (
          <p>Parser: {analysis.parserVersion}</p>
        ) : null}
        {analysis.analysisVersion ? (
          <p>Analysis: {analysis.analysisVersion}</p>
        ) : null}
        {analysis.analysisModel ? <p>Model: {analysis.analysisModel}</p> : null}
        {analysis.householdId ? <p>Household: {analysis.householdId}</p> : null}
        {analysis.sourceNotes?.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {analysis.sourceNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
        {analysis.socialRecipeCandidate ? (
          <div className="mt-3 space-y-2 rounded-md border bg-card p-3 text-foreground">
            <p className="font-medium">
              Social normalization: {analysis.socialRecipeCandidate.confidence}
            </p>
            <p>{analysis.socialRecipeCandidate.title}</p>
            {analysis.socialRecipeCandidate.servings ? (
              <p>Servings: {analysis.socialRecipeCandidate.servings}</p>
            ) : null}
            {analysis.socialRecipeCandidate.assumptions.length ? (
              <div>
                <p className="text-muted-foreground">Assumptions</p>
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.socialRecipeCandidate.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analysis.socialRecipeCandidate.missingDetails.length ? (
              <div>
                <p className="text-muted-foreground">Missing details</p>
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.socialRecipeCandidate.missingDetails.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
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
