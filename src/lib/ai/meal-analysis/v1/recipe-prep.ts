import {
  basicRecipeParserAdapter,
  formatParsedRecipeForAnalysis,
  isProbablyUrl,
  RecipeParserError
} from "@/src/lib/integrations/recipe-parser";
import type { MealAnalysisRequest, MealSourceClassification } from "@/src/lib/types/meal";
import { estimateFreeTextNutrition } from "@/src/lib/domain/nutrition";
import {
  defaultManualRecipeSource,
  manualParserVersion
} from "@/src/lib/types/recipe";
import {
  classifySourceInput,
  isSocialSource,
  parseUrl,
  type SourceClassification
} from "@/src/lib/intake/source-classifier";
import { normalizeSocialRecipeText } from "@/src/lib/ai/social-recipe-normalization/v1/service";
import type { SocialRecipeCandidate } from "@/src/lib/ai/social-recipe-normalization/v1/types";

const socialParserVersion = "social-normalizer-v1";

const sourceClassificationMap: Record<
  SourceClassification,
  MealSourceClassification
> = {
  recipe_page: "recipe-page",
  tiktok: "tiktok",
  instagram: "instagram",
  youtube: "youtube",
  pinterest: "pinterest",
  facebook: "facebook",
  unknown_social: "unknown-social",
  plain_text: "plain-text"
};

function mapSourceClassification(
  source: SourceClassification
): MealSourceClassification {
  return sourceClassificationMap[source];
}

function readPinterestOutboundRecipeUrl(value: string) {
  const parsed = parseUrl(value);

  if (!parsed || classifySourceInput(value) !== "pinterest") {
    return null;
  }

  for (const key of ["url", "link", "source_url"]) {
    const candidate = parsed.searchParams.get(key);

    if (!candidate) {
      continue;
    }

    const candidateSource = classifySourceInput(candidate);

    if (!isSocialSource(candidateSource)) {
      return candidate;
    }
  }

  return null;
}

function formatSocialCandidateForAnalysis(input: {
  sourceUrl?: string | null;
  sourceType: SourceClassification;
  candidate: SocialRecipeCandidate;
}) {
  const { candidate } = input;
  const sections = [
    "Social recipe detected and normalized from pasted caption/text.",
    `Platform/source type: ${input.sourceType}`,
    input.sourceUrl ? `Source URL: ${input.sourceUrl}` : null,
    `Recipe: ${candidate.title}`,
    candidate.servings ? `Servings: ${candidate.servings}` : "Servings: unclear",
    `Normalization confidence: ${candidate.confidence}`,
    candidate.ingredients.length
      ? `Ingredients:\n${candidate.ingredients.map((item) => `- ${item}`).join("\n")}`
      : null,
    candidate.steps.length
      ? `Instructions:\n${candidate.steps
          .map((step, index) => `${index + 1}. ${step}`)
          .join("\n")}`
      : null,
    candidate.assumptions.length
      ? `Assumptions:\n${candidate.assumptions
          .map((item) => `- ${item}`)
          .join("\n")}`
      : null,
    candidate.missingDetails.length
      ? `Missing details:\n${candidate.missingDetails
          .map((item) => `- ${item}`)
          .join("\n")}`
      : null
  ];

  return sections.filter(Boolean).join("\n\n");
}

export async function prepareRecipeForMealAnalysis(
  request: MealAnalysisRequest
) {
  if (isProbablyUrl(request.recipeText)) {
    const inputSource = classifySourceInput(request.recipeText);

    if (isSocialSource(inputSource)) {
      const outboundRecipeUrl =
        inputSource === "pinterest"
          ? readPinterestOutboundRecipeUrl(request.recipeText)
          : null;

      if (outboundRecipeUrl) {
        const parsedRecipe =
          await basicRecipeParserAdapter.parseFromUrl(outboundRecipeUrl);

        return {
          analysisText: formatParsedRecipeForAnalysis(parsedRecipe),
          ingredients: parsedRecipe.ingredients,
          instructions: parsedRecipe.instructions ?? [],
          sourceType: parsedRecipe.source.sourceType,
          sourceUrl: parsedRecipe.source.sourceUrl ?? null,
          sourceName: parsedRecipe.source.sourceName ?? null,
          sourceClassification:
            parsedRecipe.source.sourceClassification ?? null,
          sourceNotes: [
            ...(parsedRecipe.source.sourceNotes ?? []),
            `Resolved from Pinterest source: ${request.recipeText}`
          ],
          importedAt:
            parsedRecipe.source.importedAt ?? new Date().toISOString(),
          lastParsedAt:
            parsedRecipe.source.lastParsedAt ?? new Date().toISOString(),
          parserVersion: parsedRecipe.source.parserVersion ?? null,
          socialRecipeCandidate: null,
          nutritionEstimate: parsedRecipe.nutrition
            ? {
                totals: {
                  calories: parsedRecipe.nutrition.calories,
                  protein: parsedRecipe.nutrition.protein,
                  carbs: parsedRecipe.nutrition.carbs,
                  fat: parsedRecipe.nutrition.fat,
                  fiber: parsedRecipe.nutrition.fiber,
                  sodium: parsedRecipe.nutrition.sodium,
                  sugar: parsedRecipe.nutrition.sugar
                },
                confidence: parsedRecipe.nutrition.confidence,
                provenance: parsedRecipe.nutrition.provenance,
                source: "recipe-json-ld" as const
              }
            : null
        };
      }

      throw new RecipeParserError(
        "Social recipe detected. Paste the caption, ingredient list, rough notes, or spoken recipe summary below and I can normalize it for analysis."
      );
    }

    const parsedRecipe = await basicRecipeParserAdapter.parseFromUrl(
      request.recipeText
    );

    return {
      analysisText: formatParsedRecipeForAnalysis(parsedRecipe),
      ingredients: parsedRecipe.ingredients,
      instructions: parsedRecipe.instructions ?? [],
      sourceType: parsedRecipe.source.sourceType,
      sourceUrl: parsedRecipe.source.sourceUrl ?? null,
      sourceName: parsedRecipe.source.sourceName ?? null,
      sourceClassification: parsedRecipe.source.sourceClassification ?? null,
      sourceNotes: parsedRecipe.source.sourceNotes ?? null,
      importedAt: parsedRecipe.source.importedAt ?? new Date().toISOString(),
      lastParsedAt: parsedRecipe.source.lastParsedAt ?? new Date().toISOString(),
      parserVersion: parsedRecipe.source.parserVersion ?? null,
      socialRecipeCandidate: null,
      nutritionEstimate: parsedRecipe.nutrition
        ? {
            totals: {
              calories: parsedRecipe.nutrition.calories,
              protein: parsedRecipe.nutrition.protein,
              carbs: parsedRecipe.nutrition.carbs,
              fat: parsedRecipe.nutrition.fat,
              fiber: parsedRecipe.nutrition.fiber,
              sodium: parsedRecipe.nutrition.sodium,
              sugar: parsedRecipe.nutrition.sugar
            },
            confidence: parsedRecipe.nutrition.confidence,
            provenance: parsedRecipe.nutrition.provenance,
            source: "recipe-json-ld" as const
          }
        : null
    };
  }

  const socialSourceFromUrl = request.sourceUrl
    ? classifySourceInput(request.sourceUrl)
    : null;
  const socialSource =
    socialSourceFromUrl && isSocialSource(socialSourceFromUrl)
      ? socialSourceFromUrl
      : null;

  if (socialSource) {
    const candidate = await normalizeSocialRecipeText({
      sourceUrl: request.sourceUrl,
      sourceType: socialSource,
      title: request.sourceName,
      text: request.recipeText
    });
    const now = new Date().toISOString();

    return {
      analysisText: formatSocialCandidateForAnalysis({
        sourceUrl: request.sourceUrl,
        sourceType: socialSource,
        candidate
      }),
      ingredients: candidate.ingredients.map((rawText) => ({ rawText })),
      instructions: candidate.steps,
      sourceType: "url" as const,
      sourceUrl: request.sourceUrl ?? null,
      sourceName: request.sourceName ?? socialSource,
      sourceClassification: mapSourceClassification(socialSource),
      sourceNotes: [
        "Social recipe detected and normalized from pasted caption/text.",
        `Normalization confidence: ${candidate.confidence}`,
        ...candidate.assumptions.map((item) => `Assumption: ${item}`),
        ...candidate.missingDetails.map((item) => `Missing detail: ${item}`)
      ],
      importedAt: now,
      lastParsedAt: now,
      parserVersion: socialParserVersion,
      socialRecipeCandidate: candidate,
      nutritionEstimate: null
    };
  }

  return {
    analysisText: request.recipeText,
    ingredients: [],
    instructions: [],
    sourceType: request.sourceType ?? defaultManualRecipeSource.sourceType,
    sourceUrl: request.sourceUrl ?? null,
    sourceName: request.sourceName ?? null,
    sourceClassification: request.sourceClassification ?? ("manual-text" as const),
    sourceNotes: null,
    importedAt: new Date().toISOString(),
    lastParsedAt: null,
    parserVersion: request.sourceType === "url" ? null : manualParserVersion,
    socialRecipeCandidate: null,
    nutritionEstimate: estimateFreeTextNutrition(request.recipeText)
  };
}
