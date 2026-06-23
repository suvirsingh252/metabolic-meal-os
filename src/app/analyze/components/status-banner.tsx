"use client";

import { Alert } from "@/components/ui/alert";
import type { AnalyzeState } from "@/src/app/analyze/types";

const dotdashRecipeDomains = new Set([
  "allrecipes.com",
  "simplyrecipes.com",
  "seriouseats.com"
]);

function readHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isDotdashRecipeDomain(value: string) {
  const hostname = readHostname(value);

  return hostname ? dotdashRecipeDomains.has(hostname) : false;
}

export function getUrlRecoveryCopy(inputLooksLikeUrl: boolean, error: string) {
  if (!inputLooksLikeUrl) {
    return null;
  }

  if (
    !/(could not|did not return|returned \d{3}|blocked|too large|not allowed|recipe url)/i.test(
      error
    )
  ) {
    return null;
  }

  return {
    title: "Tablewise could not read that page automatically.",
    body:
      "Some publishers block automated recipe reading, hide recipe text behind scripts, or return limited page data. The app is still working; it just needs the recipe details another way.",
    nextStep:
      "Leave the link here if you want, then paste the ingredients, recipe text, caption, transcript, or a rough summary into the same box and run Analyze again."
  };
}

export function getClassifiedUrlRecoveryCopy(
  urlRecovery: AnalyzeState["urlRecovery"],
  error: string
) {
  if (!urlRecovery) {
    return null;
  }

  const reasonCopy: Record<
    NonNullable<AnalyzeState["urlRecovery"]>["failureReason"],
    string
  > = {
    blocked_url:
      "The publisher or platform blocked automated reading, but you can still analyze pasted recipe details.",
    fetch_failed:
      "Tablewise could not fetch the page reliably, but pasted recipe details will still work.",
    no_recipe_found:
      "The page did not expose enough recipe detail, but pasted ingredients or instructions will still work.",
    partial_recipe_found:
      "Only part of the recipe was available, so pasted details can improve the analysis.",
    social_url:
      "Social platforms often hide captions or transcripts, so paste the caption or what you remember.",
    manual_input_needed:
      "Paste the recipe details directly and Tablewise can continue from there."
  };

  const isDotdashBlocked =
    urlRecovery.failureReason === "blocked_url" &&
    isDotdashRecipeDomain(urlRecovery.sourceUrl);

  return {
    title: "Tablewise needs recipe details another way.",
    body: isDotdashBlocked
      ? "This publisher family commonly blocks automated recipe reads. Tablewise can still analyze the recipe if you paste the visible ingredients, instructions, or a rough summary."
      : reasonCopy[urlRecovery.failureReason],
    nextStep: isDotdashBlocked
      ? "Paste the recipe details from the page into the box and run Analyze again. The original link will stay attached."
      : "Paste ingredients, instructions, caption, transcript, or a rough description into the box and run Analyze again. The original link will stay attached.",
    technicalDetail: error
  };
}

export function StatusBanner({
  error,
  inputLooksLikeUrl,
  recipeText,
  socialFallback,
  urlRecovery,
  usesBestEffortSocialIntake
}: {
  error: string | null;
  inputLooksLikeUrl: boolean;
  recipeText: string;
  socialFallback: AnalyzeState["socialFallback"];
  urlRecovery: AnalyzeState["urlRecovery"];
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

  const urlRecoveryCopy = getUrlRecoveryCopy(inputLooksLikeUrl, error);
  const classifiedUrlRecoveryCopy = getClassifiedUrlRecoveryCopy(
    urlRecovery,
    error
  );
  const activeUrlRecoveryCopy = classifiedUrlRecoveryCopy ?? urlRecoveryCopy;
  const sourceTried = urlRecovery?.sourceUrl ?? recipeText.trim();

  return (
    <Alert>
      <div className="space-y-2">
        {activeUrlRecoveryCopy ? (
          <>
            <p className="font-medium">{activeUrlRecoveryCopy.title}</p>
            <p>{activeUrlRecoveryCopy.body}</p>
            <p>{activeUrlRecoveryCopy.nextStep}</p>
            <details className="text-xs opacity-80">
              <summary className="cursor-pointer">Technical detail</summary>
              <p className="mt-1 break-words">{error}</p>
            </details>
          </>
        ) : (
          <p>{error}</p>
        )}
        {usesBestEffortSocialIntake ? (
          <>
            <p>
              Tablewise tried the Instagram enrichment path. Captions are often
              hidden from static page reads, so add notes if you have them or
              run a best-guess analysis again.
            </p>
            <p className="break-all text-xs opacity-80">
              Source tried: {recipeText.trim()}
            </p>
          </>
        ) : inputLooksLikeUrl || urlRecovery ? (
          <>
            <p className="break-all text-xs opacity-80">
              Source tried: {sourceTried}
            </p>
          </>
        ) : null}
      </div>
    </Alert>
  );
}
