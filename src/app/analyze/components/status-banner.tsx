"use client";

import { Alert } from "@/components/ui/alert";
import type { AnalyzeState } from "@/src/app/analyze/types";

export function StatusBanner({
  error,
  inputLooksLikeUrl,
  recipeText,
  socialFallback,
  usesBestEffortSocialIntake
}: {
  error: string | null;
  inputLooksLikeUrl: boolean;
  recipeText: string;
  socialFallback: AnalyzeState["socialFallback"];
  usesBestEffortSocialIntake: boolean;
}) {
  if (!error) {
    return null;
  }

  if (socialFallback) {
    return (
      <Alert>
        <div className="space-y-2">
          <p className="font-medium">Social recipe detected</p>
          <p>{error}</p>
          <p>
            Paste the caption, ingredient list, rough notes, or spoken recipe
            summary into the box. The original social link will stay attached as
            the source.
          </p>
          <p className="break-all text-xs opacity-80">
            Source: {socialFallback.sourceUrl}
          </p>
        </div>
      </Alert>
    );
  }

  return (
    <Alert>
      <div className="space-y-2">
        <p>{error}</p>
        {usesBestEffortSocialIntake ? (
          <>
            <p>
              Meal OS tried the Instagram enrichment path. Captions are often
              hidden from static page reads, so add notes if you have them or
              run a best-guess analysis again.
            </p>
            <p className="break-all text-xs opacity-80">
              Source tried: {recipeText.trim()}
            </p>
          </>
        ) : inputLooksLikeUrl ? (
          <>
            <p>
              The link is still in the box. Paste any caption, transcript,
              ingredient list, or spoken recipe summary into the same box and
              run the analysis again.
            </p>
            <p className="break-all text-xs opacity-80">
              Source tried: {recipeText.trim()}
            </p>
          </>
        ) : null}
      </div>
    </Alert>
  );
}
