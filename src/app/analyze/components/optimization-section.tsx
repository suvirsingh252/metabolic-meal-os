"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  optimizationTypes,
  type MealOptimizationResult,
  type OptimizationType
} from "@/src/lib/ai/meal-optimization/v1/types";
import type { OptimizationState } from "@/src/app/analyze/types";

const optimizationLabels: Record<OptimizationType, string> = {
  "higher-protein": "More Protein",
  healthier: "Healthier",
  "kid-friendly": "Kid-Friendly",
  "budget-friendly": "Budget"
};

interface Props {
  optimizations: Partial<Record<OptimizationType, OptimizationState>>;
  onOptimize: (type: OptimizationType) => void;
}

export function OptimizationSection({ optimizations, onOptimize }: Props) {
  const [activeType, setActiveType] = useState<OptimizationType | null>(null);

  function handleClick(type: OptimizationType) {
    setActiveType(type);
    const current = optimizations[type];

    if (!current || current.status === "error") {
      void onOptimize(type);
    }
  }

  const activeState = activeType ? optimizations[activeType] : null;

  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Improve this meal
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {optimizationTypes.map((type) => {
          const optState = optimizations[type];
          const isActive = activeType === type;
          const isLoading = optState?.status === "loading";
          const hasResult = optState?.status === "success";

          return (
            <button
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && hasResult
                  ? "border-primary bg-primary text-primary-foreground"
                  : isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                isLoading && "cursor-wait opacity-70"
              )}
              disabled={isLoading}
              key={type}
              onClick={() => handleClick(type)}
              type="button"
            >
              {isLoading ? "Working…" : optimizationLabels[type]}
            </button>
          );
        })}
      </div>

      {activeState?.status === "success" && (
        <OptimizationResultCard result={activeState.result} />
      )}

      {activeState?.status === "error" && (
        <p className="text-sm text-destructive">
          Unable to generate suggestion right now. Try again.
        </p>
      )}
    </div>
  );
}

function OptimizationResultCard({ result }: { result: MealOptimizationResult }) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3 sm:p-4">
      <h4 className="text-sm font-semibold leading-snug">{result.headline}</h4>

      <ul className="space-y-1.5">
        {result.changes.map((change, index) => (
          <li className="flex gap-2 text-sm leading-5" key={index}>
            <span aria-hidden className="mt-0.5 shrink-0 text-muted-foreground">
              •
            </span>
            <span>{change}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-5 text-muted-foreground">{result.whyItHelps}</p>

      {result.note.trim().length > 0 && (
        <p className="border-t pt-2 text-xs leading-5 text-muted-foreground">
          {result.note}
        </p>
      )}
    </div>
  );
}
