"use client";

import type { MealAnalysisResult } from "@/src/lib/types/meal";

export function HouseholdSummary({ analysis }: { analysis: MealAnalysisResult }) {
  const answer = getHouseholdAnswer(analysis);

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 sm:p-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Household answer
          </p>
          <h3 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {answer.headline}
          </h3>
          <p className="text-sm leading-5 text-muted-foreground">
            {analysis.quickVerdict}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SummaryBadge label="Protein" value={analysis.proteinLevel} />
          <SummaryBadge label="Satiety" value={analysis.satietyLevel} />
          <SummaryBadge label="Energy" value={analysis.bloodSugarImpact} />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <SummaryBlock
            label="Smallest helpful change"
            value={analysis.minimalChangeVersion}
          />
          <SummaryBlock label="Why" value={analysis.whyThisHelps} />
        </div>

        {analysis.culturalNotes.trim().length > 0 ? (
          <div className="rounded-md border bg-background p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Keep the dish itself
            </p>
            <p className="mt-1.5 text-sm leading-5 text-foreground">
              {analysis.culturalNotes}
            </p>
          </div>
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
    <div className="min-w-0 rounded-md border bg-background px-2 py-2 sm:px-3">
      <p className="text-[11px] font-medium leading-4 text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2.5 sm:p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-5 text-foreground">{value}</p>
    </div>
  );
}
