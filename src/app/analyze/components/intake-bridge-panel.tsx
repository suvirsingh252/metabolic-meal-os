"use client";

import type { IntakeRecord } from "@/src/lib/intake/types";

interface Props {
  intake: IntakeRecord;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  "recipe-url": "Recipe URL",
  "social-url": "Social post",
  "plain-text": "Pasted text",
  "unknown-url": "URL"
};

export function IntakeBridgePanel({ intake }: Props) {
  const label = CLASSIFICATION_LABELS[intake.classification] ?? "Shared content";
  const preview = intake.url ?? intake.rawText;
  const isSocial = intake.classification === "social-url";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-medium text-amber-900 dark:text-amber-100">
          Shared from iPhone
        </span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          {label}
        </span>
        {intake.source && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            {intake.source}
          </span>
        )}
      </div>

      {preview && (
        <p className="mb-2 truncate font-mono text-xs text-amber-800 dark:text-amber-200">
          {preview.length > 120 ? `${preview.slice(0, 120)}…` : preview}
        </p>
      )}

      {isSocial && (
        <p className="mb-2 text-amber-800 dark:text-amber-200">
          Social links may not expose ingredients. If analysis is incomplete,
          paste the caption or recipe text.
        </p>
      )}

      <p className="text-amber-700 dark:text-amber-300">
        Content is pre-filled below. Review it, then tap{" "}
        <strong>Import recipe</strong> to continue.
      </p>
    </div>
  );
}
