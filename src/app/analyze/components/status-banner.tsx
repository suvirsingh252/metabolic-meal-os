"use client";

import { Alert } from "@/components/ui/alert";

export function StatusBanner({
  error,
  inputLooksLikeUrl,
  recipeText
}: {
  error: string | null;
  inputLooksLikeUrl: boolean;
  recipeText: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <Alert>
      <div className="space-y-2">
        <p>{error}</p>
        {inputLooksLikeUrl ? (
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
