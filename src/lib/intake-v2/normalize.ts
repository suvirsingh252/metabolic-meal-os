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

const knownIngredientNouns = [
  "allspice",
  "basil",
  "basmati",
  "base",
  "beans",
  "beef",
  "bouillon",
  "broth",
  "butter",
  "cardamom",
  "carrot",
  "cheese",
  "chicken",
  "chickpeas",
  "cilantro",
  "cinnamon",
  "cloves",
  "coriander",
  "cucumber",
  "cumin",
  "dal",
  "egg",
  "feta",
  "flour",
  "garlic",
  "ginger",
  "ghee",
  "greek yogurt",
  "honey",
  "lentils",
  "lemon",
  "lime",
  "mayo",
  "mayonnaise",
  "milk",
  "mint",
  "oil",
  "onion",
  "oregano",
  "paneer",
  "paprika",
  "parsley",
  "pasta",
  "pepper",
  "rice",
  "salt",
  "sauce",
  "spinach",
  "sumac",
  "thyme",
  "tomato",
  "tomatoes",
  "tofu",
  "turmeric",
  "vinegar",
  "water",
  "yogurt"
];

const quantityPattern =
  /(?:^|\s)(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(?:to\s+\d+\s*)?(?:cups?|c|tbsp|tablespoons?|tbsps?|tsp|teaspoons?|tsps?|grams?|g|kg|ml|l|liters?|litres?|oz|ounces?|lbs?|pounds?|cloves?|heads?|small|medium|large|pinch|dash|handful|spoonful|sticks?|cans?|packets?|bunch|bunches|pieces?|slices?)\b/i;
const standaloneQuantityPattern =
  /^(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:-|to)?\s*(?:\d+(?:[./]\d+)?)?\s*(?:cups?|c|tbsp|tablespoons?|tbsps?|tsp|teaspoons?|tsps?|grams?|g|kg|ml|l|liters?|litres?|oz|ounces?|lbs?|pounds?|cloves?|heads?|pinch|dash|handful|spoonful|sticks?|cans?|packets?|bunch|bunches|pieces?|slices?)?\b/i;
const socialChromePattern =
  /\b(?:instagram|tiktok|log in|login|sign up|signup|never miss a post|more options|verified|followers?|following|follow|likes?|views?|comments?|share|save|reels?|original audio|watch more|open app|app store|google play|see translation|suggested posts?|sponsored|paid partnership)\b/i;
const socialCtaPattern =
  /\b(?:comment\s+(?:recipe|link)|recipe\s+in\s+comments?|link\s+in\s+bio|follow\s+(?:for|me)|dm\s+me|send\s+this|tag\s+someone|save\s+this|share\s+this)\b/i;
const instructionVerbPattern =
  /\b(?:add|bake|blend|boil|broil|chop|combine|cook|dice|drain|fry|grill|heat|marinate|mix|pour|preheat|rinse|roast|saute|sauté|season|serve|simmer|slice|stir|toast|top|whisk)\b/i;
const instructionStartPattern =
  /^(?:\d+[.)]\s+|step\s+\d+[:.)]\s+|method:?|instructions:?|directions:?)/i;
const ingredientHeadingPattern =
  /^(?:ingredients?|for\s+(?:the\s+)?[\w\s&/-]+|chicken|rice|salad|sauce|garlic sauce|marinade|dressing|bowls?|fresh sumac salad)\s*:?$/i;
const sectionHeadingPrefixPattern =
  /^(?:ingredients?|for\s+(?:the\s+)?[\w\s&/-]+|chicken|rice|salad|sauce|garlic sauce|marinade|dressing|fresh sumac salad)\s*:\s*/i;
const maxIngredientLength = 110;

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
  const weakMetadataText = [
    enrichment.metadata.ogDescription,
    enrichment.metadata.description,
    enrichment.metadata.ogTitle,
    enrichment.metadata.title
  ]
    .filter(Boolean)
    .join(" ");
  const rawRecipeText = bestText ?? weakMetadataText;
  const metadataTitle =
    filterBoilerplateText(enrichment.metadata.ogTitle) ??
    filterBoilerplateText(enrichment.metadata.title) ??
    formatFallbackTitle(enrichment);
  const captionTitle = inferTitleFromCaption(rawRecipeText);
  const inferredTitle =
    captionTitle ??
    cleanInstagramTitle(metadataTitle) ??
    formatFallbackTitle(enrichment);
  const normalizedCaption = normalizeSocialCaptionText(rawRecipeText, inferredTitle);
  const ingredients = extractLikelyIngredientLines(normalizedCaption);
  const steps = extractLikelyStepLines(normalizedCaption);
  const hasCaptionLikeText = Boolean(
    normalizedCaption && (hasRecipeSignal(normalizedCaption) || ingredients.length > 0)
  );
  const confidence = hasCaptionLikeText ? "medium" : "low";
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

export function normalizeSocialCaptionText(
  value: string | null | undefined,
  titleHint?: string | null
) {
  if (!value) {
    return "";
  }

  const withoutHashtags = value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/#[A-Za-z0-9_-]+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\bwww\.\S+/gi, " ");
  const roughLines = withoutHashtags
    .split(/\n+|(?<=\.)\s+(?=(?:For\s+the|Ingredients?|Method|Instructions?|Directions?)\b)/i)
    .map((line) => normalizeSpaces(line.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")))
    .flatMap(splitJoinedChromeLine)
    .map((line) => line.replace(/^\s*(?:[-*•·–—]+|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !isPlatformChromeLine(line));

  const isolated = isolateRecipeCaption(roughLines, titleHint);

  return isolated.join("\n").trim();
}

function extractLikelyIngredientLines(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const ingredients: string[] = [];
  let inIngredientSection = false;

  for (const line of value.split(/\n+/).map(normalizeSpaces).filter(Boolean)) {
    const withoutHeading = line.replace(sectionHeadingPrefixPattern, "").trim();

    if (ingredientHeadingPattern.test(line)) {
      inIngredientSection = true;
      continue;
    }

    if (instructionStartPattern.test(line)) {
      inIngredientSection = false;
      continue;
    }

    const fragments = splitIngredientFragments(withoutHeading);
    const accepted = fragments.filter(isConfidentIngredientLine);

    if (accepted.length > 0) {
      ingredients.push(...accepted);
      inIngredientSection = true;
      continue;
    }

    if (
      inIngredientSection &&
      !instructionVerbPattern.test(line) &&
      isConfidentIngredientLine(withoutHeading)
    ) {
      ingredients.push(withoutHeading);
    }
  }

  return dedupePreservingOrder(ingredients).slice(0, 40);
}

function extractLikelyStepLines(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const steps: string[] = [];
  let inInstructions = false;
  let inIngredients = false;

  for (const rawLine of value.split(/\n+/).map(normalizeSpaces).filter(Boolean)) {
    const line = rawLine.replace(/^[-*•·]\s*/, "").trim();

    if (ingredientHeadingPattern.test(line) || sectionHeadingPrefixPattern.test(line)) {
      inIngredients = true;
      inInstructions = false;
      continue;
    }

    if (instructionStartPattern.test(line)) {
      inInstructions = true;
      inIngredients = false;
      const stripped = line.replace(instructionStartPattern, "").trim();

      if (stripped && isCleanInstructionLine(stripped)) {
        steps.push(stripped);
      }

      continue;
    }

    if (inIngredients && splitIngredientFragments(line).some(isConfidentIngredientLine)) {
      continue;
    }

    const candidates = line
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      if ((inInstructions || instructionVerbPattern.test(candidate)) && isCleanInstructionLine(candidate)) {
        steps.push(candidate);
        inInstructions = true;
        inIngredients = false;
      }
    }
  }

  return dedupePreservingOrder(steps).slice(0, 12);
}

function cleanInstagramTitle(value: string) {
  const normalized = normalizeSpaces(value)
    .replace(/\s*•\s*Instagram.*$/i, "")
    .trim();
  const titledCaption = normalized.match(/(?:on Instagram|TikTok)\s*:\s*(.+)$/i);
  const title = titledCaption?.[1] ?? normalized.replace(/^@[\w.]+\s*:?\s*/i, "");
  const cleaned = title
    .replace(/^["']|["']$/g, "")
    .replace(/\b(?:Instagram|TikTok)\b/gi, "")
    .trim();

  return cleaned && !isPlatformChromeLine(cleaned) ? cleaned : null;
}

function formatFallbackTitle(enrichment: IntakeEnrichmentResult) {
  const content = enrichment.contentType === "post" ? "post" : "reel";

  return enrichment.shortcode
    ? `Instagram ${content} ${enrichment.shortcode}`
    : `Instagram ${content}`;
}

function inferTitleFromCaption(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const lines = value
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean)
    .filter((line) => !isPlatformChromeLine(line));

  for (const line of lines.slice(0, 8)) {
    const cleaned = cleanInstagramTitle(line) ?? line;

    if (
      cleaned.length >= 8 &&
      cleaned.length <= 80 &&
      /recipe|bowl|bowls|chicken|rice|pasta|salad|sauce|dinner|lunch|breakfast|shawarma/i.test(cleaned) &&
      !quantityPattern.test(cleaned) &&
      !instructionVerbPattern.test(cleaned)
    ) {
      return cleaned.replace(/:$/, "").trim();
    }
  }

  return null;
}

function isolateRecipeCaption(lines: string[], titleHint?: string | null) {
  const title = titleHint ? normalizeSpaces(titleHint).toLowerCase() : null;
  const titleIndex = title
    ? lines.findIndex((line) => normalizeSpaces(line).toLowerCase().includes(title))
    : -1;
  const markerIndex = lines.findIndex(
    (line) =>
      ingredientHeadingPattern.test(line) ||
      sectionHeadingPrefixPattern.test(line) ||
      isConfidentIngredientLine(line) ||
      instructionStartPattern.test(line)
  );
  const startIndex =
    titleIndex >= 0
      ? titleIndex
      : markerIndex >= 0
        ? markerIndex
        : lines.findIndex((line) => hasRecipeSignal(line));

  if (startIndex < 0) {
    return [];
  }

  return lines
    .slice(startIndex)
    .map((line, index) => {
      if (index === 0 && title && normalizeSpaces(line).toLowerCase().includes(title)) {
        return line.replace(new RegExp(escapeRegExp(titleHint ?? ""), "i"), "").trim();
      }

      return line;
    })
    .filter(Boolean)
    .filter((line) => !isPromotionalProse(line));
}

function splitJoinedChromeLine(line: string) {
  return line
    .replace(/\b(?:Log In|Sign Up|Never miss a post|More options|Verified)\b/gi, "\n$&\n")
    .split(/\n+/)
    .map(normalizeSpaces)
    .filter(Boolean);
}

function isPlatformChromeLine(line: string) {
  const normalized = normalizeSpaces(line);

  if (!normalized) {
    return true;
  }

  if (/^@?[A-Za-z0-9_.]{2,30}$/.test(normalized) && !hasIngredientNoun(normalized)) {
    return true;
  }

  if (socialCtaPattern.test(normalized)) {
    return true;
  }

  if (socialChromePattern.test(normalized) && !hasIngredientNoun(normalized)) {
    return true;
  }

  return false;
}

function isPromotionalProse(line: string) {
  const normalized = normalizeSpaces(line);

  if (isPlatformChromeLine(normalized) || socialCtaPattern.test(normalized)) {
    return true;
  }

  if (/@[A-Za-z0-9_.]{2,30}/.test(normalized) && !quantityPattern.test(normalized)) {
    return true;
  }

  return (
    normalized.length > maxIngredientLength &&
    !instructionVerbPattern.test(normalized) &&
    splitIngredientFragments(normalized).filter(isConfidentIngredientLine).length === 0
  );
}

function splitIngredientFragments(line: string) {
  const withoutHandles = line
    .replace(/@[A-Za-z0-9_.]{2,30}/g, " ")
    .replace(/\((?:optional|to taste)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const headingStripped = withoutHandles.replace(sectionHeadingPrefixPattern, "").trim();
  const normalized = headingStripped
    .replace(
      /(?<=[.!?])\s+(?=(?:add|bake|blend|boil|broil|chop|combine|cook|dice|drain|fry|grill|heat|marinate|mix|pour|preheat|rinse|roast|saute|sauté|season|serve|simmer|slice|stir|toast|top|whisk)\b)/gi,
      "\n"
    )
    .replace(/\s+[+]\s+/g, "\n")
    .replace(/\s+[–—-]\s+(?=(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞]|[A-Za-z ]{2,30}(?:\s*powder)?(?:,|$)))/g, "\n")
    .replace(/[•·;]/g, "\n");

  return normalized
    .split(/\n+|,(?=\s*(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞]|salt|pepper|oil|garlic|onion|cumin|coriander|allspice|turmeric|parsley|sumac|cucumber|tomato|rice|water|butter|mayonnaise|yogurt|chicken|lemon))/i)
    .map(cleanIngredientFragment)
    .flatMap(splitKnownIngredientList)
    .map(cleanIngredientFragment)
    .filter(Boolean);
}

function splitKnownIngredientList(fragment: string) {
  if (
    quantityPattern.test(fragment) ||
    fragment.length > 70 ||
    !/,\s*|\band\b/i.test(fragment)
  ) {
    return [fragment];
  }

  const pieces = fragment
    .split(/\s*,\s*|\s+\band\b\s+/i)
    .map(cleanIngredientFragment)
    .filter(Boolean);

  return pieces.length > 1 && pieces.every((piece) => hasIngredientNoun(piece))
    ? pieces
    : [fragment];
}

function cleanIngredientFragment(value: string) {
  return normalizeSpaces(
    value
      .replace(/^[-*•·–—]+\s*/, "")
      .replace(/^(?:and|plus|with)\s+/i, "")
      .replace(/\b(?:recipe|ingredients?|you'?ll need|for the \w+)\b:?/gi, "")
      .replace(/[.!]$/g, "")
      .trim()
  );
}

function isConfidentIngredientLine(line: string) {
  const normalized = cleanIngredientFragment(line);

  if (normalized.length < 3 || normalized.length > maxIngredientLength) {
    return false;
  }

  if (isPlatformChromeLine(normalized) || socialCtaPattern.test(normalized)) {
    return false;
  }

  if (instructionVerbPattern.test(normalized) && !quantityPattern.test(normalized)) {
    return false;
  }

  if (/[.!?]$/.test(normalized) && normalized.split(/\s+/).length > 8) {
    return false;
  }

  return (
    quantityPattern.test(normalized) ||
    standaloneQuantityPattern.test(normalized) ||
    hasIngredientNoun(normalized)
  );
}

function isCleanInstructionLine(line: string) {
  const normalized = normalizeSpaces(line);

  return (
    normalized.length >= 8 &&
    normalized.length <= 220 &&
    instructionVerbPattern.test(normalized) &&
    !isPlatformChromeLine(normalized) &&
    !socialCtaPattern.test(normalized)
  );
}

function hasIngredientNoun(value: string) {
  const normalized = normalizeSpaces(value).toLowerCase();

  return knownIngredientNouns.some((noun) =>
    new RegExp(`\\b${escapeRegExp(noun)}\\b`, "i").test(normalized)
  );
}

function dedupePreservingOrder(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = normalizeSpaces(value).toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
