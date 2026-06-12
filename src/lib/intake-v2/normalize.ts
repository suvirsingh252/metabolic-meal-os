import type {
  IntakeEnrichmentResult,
  IntakeEvidence,
  SocialMealCandidate
} from "@/src/lib/intake-v2/types";
import { filterBoilerplateText } from "@/src/lib/intake-v2/metadata";

const usefulRecipeSignals = [
  "ingredient",
  "ingredients",
  "recipe",
  "cook",
  "bake",
  "tsp",
  "tbsp",
  "cup",
  "salt",
  "pepper",
  "serves",
  "method"
];

export function buildSocialMealCandidate(
  enrichment: IntakeEnrichmentResult
): SocialMealCandidate {
  const captionEvidence = enrichment.evidence.filter(
    (item) =>
      item.kind === "share_sheet_text" ||
      item.kind === "user_text" ||
      item.kind === "instagram_metadata"
  );
  const bestText = chooseBestEvidenceText(captionEvidence);
  const metadataTitle =
    filterBoilerplateText(enrichment.metadata.ogTitle) ??
    filterBoilerplateText(enrichment.metadata.title) ??
    formatFallbackTitle(enrichment);
  const inferredTitle = cleanInstagramTitle(metadataTitle) || formatFallbackTitle(enrichment);
  const hasCaptionLikeText = Boolean(bestText && hasRecipeSignal(bestText));
  const weakMetadataText = [
    enrichment.metadata.ogDescription,
    enrichment.metadata.description,
    enrichment.metadata.ogTitle,
    enrichment.metadata.title
  ]
    .filter(Boolean)
    .join(" ");
  const confidence = hasCaptionLikeText ? "medium" : "low";
  const ingredients = extractLikelyIngredientLines(bestText ?? weakMetadataText);
  const steps = extractLikelyStepLines(bestText ?? weakMetadataText);
  const sourceEvidence =
    captionEvidence.length > 0 ? captionEvidence : enrichment.evidence;
  const assumptions = [
    "Only evidence available from the shared link and accessible metadata was used.",
    !hasCaptionLikeText
      ? "Instagram may hide captions from server-side fetches, so this is a best-effort meal draft."
      : null,
    ingredients.length === 0
      ? "Ingredient names were not explicitly visible; review or edit before saving."
      : null
  ].filter((item): item is string => Boolean(item));
  const missingDetails = [
    "Exact quantities",
    "Servings",
    "Cook time",
    ingredients.length === 0 ? "Visible ingredient list" : null,
    steps.length === 0 ? "Step-by-step method" : null
  ].filter((item): item is string => Boolean(item));

  return {
    title: inferredTitle,
    ingredients,
    steps,
    servings: null,
    confidence,
    assumptions,
    missingDetails,
    sourceEvidence,
    ingredientEvidence: ingredients.map((text) => ({
      text,
      evidenceLevel: "explicit",
      evidenceKinds: sourceEvidence.map((item) => item.kind)
    })),
    stepEvidence: steps.map((text) => ({
      text,
      evidenceLevel: "explicit",
      evidenceKinds: sourceEvidence.map((item) => item.kind)
    }))
  };
}

export function formatSocialMealCandidateForAnalysis(input: {
  enrichment: IntakeEnrichmentResult;
  candidate: SocialMealCandidate;
}) {
  const { enrichment, candidate } = input;
  const evidenceLines = enrichment.evidence
    .map((item) => {
      const value = item.text ?? item.url;
      return value
        ? `- ${item.label} (${item.kind}, ${item.confidence}): ${value}`
        : null;
    })
    .filter(Boolean);

  return [
    "Social meal intake v2 candidate.",
    `Platform/source type: ${enrichment.platform}`,
    `Original URL: ${enrichment.originalUrl}`,
    `Canonical URL: ${enrichment.canonicalUrl}`,
    enrichment.shortcode ? `Instagram shortcode: ${enrichment.shortcode}` : null,
    `Enrichment status: ${enrichment.status}`,
    `Recipe: ${candidate.title}`,
    "Servings: unclear",
    `Normalization confidence: ${candidate.confidence}`,
    candidate.ingredients.length
      ? `Ingredients explicitly visible:\n${candidate.ingredients
          .map((item) => `- ${item}`)
          .join("\n")}`
      : "Ingredients explicitly visible: none",
    candidate.steps.length
      ? `Instructions explicitly visible:\n${candidate.steps
          .map((step, index) => `${index + 1}. ${step}`)
          .join("\n")}`
      : "Instructions explicitly visible: none",
    candidate.assumptions.length
      ? `Assumptions:\n${candidate.assumptions.map((item) => `- ${item}`).join("\n")}`
      : null,
    candidate.missingDetails.length
      ? `Missing details:\n${candidate.missingDetails
          .map((item) => `- ${item}`)
          .join("\n")}`
      : null,
    evidenceLines.length ? `Source evidence:\n${evidenceLines.join("\n")}` : null,
    "Do not invent exact quantities, servings, cook times, or nutrition totals. If recipe details are missing, label the result as a best-effort estimate and ask the user to review."
  ]
    .filter(Boolean)
    .join("\n\n");
}

function chooseBestEvidenceText(evidence: IntakeEvidence[]) {
  const ranked = evidence
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => scoreEvidenceText(b) - scoreEvidenceText(a));

  return ranked[0] ?? null;
}

function scoreEvidenceText(value: string) {
  const normalized = value.toLowerCase();
  const signalScore = usefulRecipeSignals.filter((signal) =>
    normalized.includes(signal)
  ).length;

  return signalScore * 100 + Math.min(value.length, 500);
}

function hasRecipeSignal(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  return usefulRecipeSignals.some((signal) => normalized.includes(signal));
}

function extractLikelyIngredientLines(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n|•|;|,(?=\s*(?:\d|salt|pepper|oil|garlic|onion|flour|rice|dal|paneer|chicken|tofu))/i)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter((item) => item.length >= 3 && hasRecipeSignal(item))
    .slice(0, 20);
}

function extractLikelyStepLines(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => /cook|bake|mix|stir|saute|sauté|add|serve|blend|heat/i.test(item))
    .slice(0, 12);
}

function cleanInstagramTitle(value: string) {
  return value
    .replace(/\s*•\s*Instagram.*$/i, "")
    .replace(/\s*on Instagram.*$/i, "")
    .trim();
}

function formatFallbackTitle(enrichment: IntakeEnrichmentResult) {
  const content = enrichment.contentType === "post" ? "post" : "reel";

  return enrichment.shortcode
    ? `Instagram ${content} ${enrichment.shortcode}`
    : `Instagram ${content}`;
}
