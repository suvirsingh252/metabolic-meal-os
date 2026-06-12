import {
  canonicalizeInstagramUrl,
  isSupportedInstagramContentUrl
} from "@/src/lib/intake-v2/instagram";
import {
  fetchStaticSocialMetadata,
  filterBoilerplateText
} from "@/src/lib/intake-v2/metadata";
import {
  buildSocialMealCandidate,
  formatSocialMealCandidateForAnalysis
} from "@/src/lib/intake-v2/normalize";
import type {
  IntakeCapture,
  IntakeEnrichmentResult,
  IntakeEvidence
} from "@/src/lib/intake-v2/types";

export const intakeV2ParserVersion = "intake-v2-social-v1";

export function supportsIntakeV2Instagram(value: string) {
  return isSupportedInstagramContentUrl(value);
}

export async function enrichInstagramIntake(
  capture: IntakeCapture,
  metadataLoader = fetchStaticSocialMetadata
): Promise<IntakeEnrichmentResult> {
  const originalUrl = capture.originalUrl?.trim();

  if (!originalUrl) {
    throw new Error("Instagram intake requires originalUrl.");
  }

  const canonical = canonicalizeInstagramUrl(originalUrl);

  if (!canonical) {
    throw new Error("Instagram intake requires an Instagram URL.");
  }

  if (!isSupportedInstagramContentUrl(canonical.canonicalUrl)) {
    throw new Error("Instagram intake requires a reel, post, or story URL.");
  }

  const captureEvidence = buildCaptureEvidence(capture);
  let metadataResult: Awaited<ReturnType<typeof fetchStaticSocialMetadata>> = {
    metadata: {},
    evidence: []
  };

  try {
    metadataResult = await metadataLoader(canonical.canonicalUrl);
  } catch {
    metadataResult = {
      metadata: {},
      evidence: [
        {
          kind: "instagram_metadata",
          label: "Instagram metadata unavailable",
          text: "The caption was not available from static page metadata.",
          confidence: "low"
        }
      ]
    };
  }

  const evidence = [...captureEvidence, ...metadataResult.evidence];
  const status = chooseEnrichmentStatus(evidence);

  return {
    ...canonical,
    metadata: {
      ...metadataResult.metadata,
      title:
        filterBoilerplateText(capture.pageTitle) ?? metadataResult.metadata.title,
      description:
        filterBoilerplateText(capture.pageDescription) ??
        metadataResult.metadata.description
    },
    evidence,
    status
  };
}

export async function buildInstagramMealCandidate(
  capture: IntakeCapture,
  metadataLoader = fetchStaticSocialMetadata
) {
  const enrichment = await enrichInstagramIntake(capture, metadataLoader);
  const candidate = buildSocialMealCandidate(enrichment);

  return {
    enrichment,
    candidate,
    analysisText: formatSocialMealCandidateForAnalysis({
      enrichment,
      candidate
    })
  };
}

function buildCaptureEvidence(capture: IntakeCapture): IntakeEvidence[] {
  const evidence: IntakeEvidence[] = [];

  if (capture.sharedText?.trim()) {
    evidence.push({
      kind:
        capture.kind === "social_share_payload"
          ? "share_sheet_text"
          : "user_text",
      label: "Shared text",
      text: capture.sharedText.trim(),
      confidence: "medium"
    });
  }

  if (capture.selectedText?.trim()) {
    evidence.push({
      kind: "user_text",
      label: "Selected text",
      text: capture.selectedText.trim(),
      confidence: "medium"
    });
  }

  const pageDescription = filterBoilerplateText(capture.pageDescription);
  const pageTitle = filterBoilerplateText(capture.pageTitle);

  if (pageDescription?.trim()) {
    evidence.push({
      kind: "open_graph",
      label: "Page description",
      text: pageDescription.trim(),
      field: "pageDescription",
      confidence: "low"
    });
  }

  if (pageTitle?.trim()) {
    evidence.push({
      kind: "open_graph",
      label: "Page title",
      text: pageTitle.trim(),
      field: "pageTitle",
      confidence: "low"
    });
  }

  if (capture.images?.length) {
    evidence.push({
      kind: "screenshot_vision",
      label: "Screenshot placeholder",
      text: "Image metadata was captured, but OCR/vision is not implemented in this intake slice.",
      confidence: "low"
    });
  }

  return evidence;
}

function chooseEnrichmentStatus(evidence: IntakeEvidence[]): IntakeEnrichmentResult["status"] {
  const strongText = evidence.some(
    (item) =>
      item.text &&
      ["user_text", "share_sheet_text", "instagram_metadata"].includes(
        item.kind
      ) &&
      /ingredient|recipe|cook|bake|tsp|tbsp|cup|serves/i.test(item.text)
  );

  if (strongText) {
    return "recipe_caption_found";
  }

  const partial = evidence.some(
    (item) =>
      item.text &&
      item.kind === "open_graph" &&
      /ingredient|recipe|cook|bake|tsp|tbsp|cup|serves/i.test(item.text)
  );

  if (partial) {
    return "partial_recipe_details_found";
  }

  return evidence.length > 0
    ? "caption_unavailable_best_effort"
    : "best_effort_estimate";
}
