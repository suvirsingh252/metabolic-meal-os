import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getOpenAIEnv } from "@/src/lib/env";
import {
  basicRecipeParserAdapter,
  formatParsedRecipeForAnalysis,
  isProbablyUrl,
  RecipeParserError
} from "@/src/lib/integrations/recipe-parser";
import {
  bloodSugarImpacts,
  cuisines,
  effortLevels,
  mealTypes,
  proteinLevels,
  satietyLevels,
  type MealAnalysisRequest,
  type MealAnalysisResult
} from "@/src/lib/types/meal";
import {
  defaultManualRecipeSource,
  manualParserVersion,
  recipeSourceTypes,
  type RecipeSourceType
} from "@/src/lib/types/recipe";
import {
  globalHealthSafetyRules,
  healthGuidancePrinciples
} from "@/src/lib/health-guidance";
import { getKnownIngredientContext } from "@/src/lib/notion/ingredient-context";
import { approvedSources } from "@/src/lib/sources/source-registry";

export const runtime = "nodejs";

const approvedSourceIds = approvedSources.map((source) => source.id);
const healthGuidancePrincipleIds = healthGuidancePrinciples.map(
  (principle) => principle.id
);

function formatEvidenceContext() {
  const sourceLines = approvedSources
    .filter((source) =>
      [
        "diabetes-canada-guidelines",
        "international-pcos-guideline-2023",
        "canadas-food-guide"
      ].includes(source.id)
    )
    .map(
      (source) =>
        `- ${source.id}: ${source.name}; allowed uses: ${source.allowedUses.join(" ")}; prohibited uses: ${source.prohibitedUses.join(" ")}`
    )
    .join("\n");

  const principleLines = healthGuidancePrinciples
    .map(
      (principle) =>
        `- ${principle.id}: ${principle.summary} Analysis use: ${principle.analysisUse.join(" ")} Safe language: ${principle.safeLanguage.join(" ")} Prohibited claims: ${principle.prohibitedClaims.join(" ")} Source IDs: ${principle.sourceIds.join(", ")}`
    )
    .join("\n");

  return `
Evidence-aware guidance context:

Global safety rules:
${globalHealthSafetyRules.map((rule) => `- ${rule}`).join("\n")}

Approved sources for runtime meal analysis:
${sourceLines}

Health-guidance principles available for guidanceBasis:
${principleLines}
`.trim();
}

const systemPrompt = `
You analyze household recipes and return practical structured JSON for a meal review screen.

Core principle: minimal-change improvement. Suggest the smallest realistic changes that meaningfully improve protein, fiber, or satiety without westernizing, moralizing, or removing the dish's identity.

Guidelines:
- Support insulin-sensitivity-friendly eating patterns.
- Support possible PCOS-friendly dietary patterns.
- Prioritize protein, fiber, satiety, steadier energy, and avoiding a spike-and-crash feeling.
- Preserve Indian food context and Atlantic Canadian comfort food context when present.
- Do not diagnose, treat, or claim to prevent medical conditions.
- Avoid extreme dieting or keto by default unless the input explicitly asks for it.
- Avoid moralizing food. Use neutral, practical language.
- Produce family-friendly outputs that are realistic for household cooking.
- Keep substitutions culturally respectful and avoid stripping the identity of the dish.
- Prefer same-dish, smaller-nudge suggestions before ingredient replacement.
- Never call foods "bad". Frame everything as "could help", "worth watching", or "an easy nudge".
- Avoid calorie or macro obsession. Focus on protein, fiber, satiety, steadier energy, and how the meal feels.
- Use the evidence-aware guidance context below to produce source-linked, non-medical food-pattern support.
- Cite only sourceId and principleId values that appear in the context.
- Do not use USDA nutrient lookup, calorie counting, macro tracking, medical targets, or automated nutrition enrichment in this analysis.
- If known household ingredient context is provided, use it as lightweight background for protein/fiber guidance, blood-sugar impact reasoning, cultural preservation, and minimal-change suggestions.
- Treat known household ingredient nutrient values as approximate ingredient-level context only. Do not calculate meal calories or exact meal macros.
- If the input includes source notes saying the recipe came from social/video metadata or lower-confidence extraction, make confidenceNotes clearly say the link provided limited recipe detail and that pasted captions, transcripts, ingredients, or instructions would improve the analysis.
- For first-screen fields (quickVerdict, minimalChangeVersion, whyThisHelps, culturalNotes), use plain household language. Avoid clinical terms unless truly necessary, including "glycemic response", "metabolic health", "post-meal glucose", and "reproductive health". Prefer phrases like "steadier energy", "more filling", "less of a spike-and-crash feeling", and "keeps the meal satisfying".
- For Indian rice meals, do not default to brown rice or whole-grain swaps. First consider culturally realistic nudges such as a smaller rice mound, more dal/chana/beans, cucumber/yogurt/kachumber first, extra sabzi or salad, half rice and half veg, or keeping basmati while adjusting portion and pairing.
- For Atlantic Canadian comfort meals, preserve the comfort-food identity first. Prefer small side, portion, vegetable, bean, fish, or bread/potato pairing nudges before replacing the meal.
- For mostly refined-carb meals, prefer one tiny protein/fiber add-on such as canned beans or lentils, frozen vegetables, tuna/chicken, Greek yogurt, or a simple side vegetable before suggesting a different meal. Cheese can help satisfaction, but do not make extra cheese the main improvement unless the meal already has a stronger fiber/protein nudge.
- Keep evidenceNotes and confidenceNotes short and plain. They are for backup context, not the main household answer. Avoid terms like "glycemic", "metabolic", "post-meal glucose", and "reproductive" in these notes too.

Scoring (all scores 1–10):
- metabolicScore: overall metabolic friendliness for insulin-resistance-supportive eating.
- proteinScore: protein adequacy for the meal type and serving size.
- fiberScore: fiber content from vegetables, legumes, whole grains.
- satietyScoreNumeric: how filling and satisfying the meal is likely to be.
- bloodSugarRiskScore: estimated blood sugar spike risk (10 = very high risk, 1 = very low risk).

Text fields:
- quickVerdict: 1–2 sentence plain-language summary. What works, what could be nudged.
- mainConcerns: up to 3 short concern strings. Neutral, not moralistic.
- minimalChangeVersion: the smallest practical improvement. Keep the dish recognizable. Prefer pairing, portion, or add-on nudges before replacement. 1–2 short sentences.
- supportiveVersion: a more intentional version that adds protein, fiber, or steadier-energy support. Still realistic. 2–4 sentences.
- plateStrategy: how to plate or portion this meal for better satiety. 1–2 sentences.
- whyThisHelps: brief plain-language explanation of why the suggested changes help the meal feel steadier and more filling. 1–2 short sentences. No medical claims.
- culturalNotes: only include if the meal has strong cultural identity. Acknowledge it. Keep it respectful and brief. Empty string if not applicable.
- shoppingAdditions: 2–5 short ingredient strings to add next shopping trip that would support this meal pattern.
- prepNotes: 1–3 short practical prep tips (timing, batch cooking, shortcuts).
- mealPairings: 2–3 simple food or drink pairings that would help the meal feel balanced and satisfying.
- cautions: 0–2 short notes about things worth watching (e.g. portion size, high sodium, added sugar). Empty array if none.

Evidence-aware v3 fields:
- evidenceNotes: 2–3 short, plain notes connecting the advice to general food-pattern principles. Avoid clinical phrasing. Prefer "steadier energy", "more filling", "less spike-and-crash", and "balanced plate".
- confidenceNotes: 1–2 short uncertainty notes. Mention that portions, product choices, and preparation can vary where relevant. Avoid clinical phrasing.
- safetyDisclaimer: one concise sentence stating this is general food-pattern support, not diagnosis or individualized medical advice.
- guidanceBasis: 2–5 objects. Each object must include a valid sourceId, a valid principleId, and a short relevance string explaining why that principle applies to this meal.

${formatEvidenceContext()}
`.trim();

const mealAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mealName: {
      type: "string",
      description: "Short clear name for the analyzed meal."
    },
    cuisine: {
      type: "string",
      enum: cuisines
    },
    mealType: {
      type: "string",
      enum: mealTypes
    },
    proteinLevel: {
      type: "string",
      enum: proteinLevels
    },
    satietyLevel: {
      type: "string",
      enum: satietyLevels
    },
    bloodSugarImpact: {
      type: "string",
      enum: bloodSugarImpacts
    },
    effortLevel: {
      type: "string",
      enum: effortLevels
    },
    familyApproved: {
      type: "boolean"
    },
    weeknightFriendly: {
      type: "boolean"
    },
    comfortMeal: {
      type: "boolean"
    },
    optimizedVersion: {
      type: "string",
      description:
        "A practical optimized version of the meal focused on protein, fiber, satiety, and lower glycemic load."
    },
    notes: {
      type: "string",
      description:
        "Concise review notes, including tradeoffs and why the optimization is useful."
    },
    ingredientSuggestions: {
      type: "array",
      items: {
        type: "string"
      }
    },
    feedbackPrompt: {
      type: "string",
      description:
        "One short question to ask the household before saving this meal."
    },
    metabolicScore: {
      type: "number",
      description: "Overall metabolic friendliness score 1–10 for insulin-resistance-supportive eating."
    },
    proteinScore: {
      type: "number",
      description: "Protein adequacy score 1–10 for the meal type and serving size."
    },
    fiberScore: {
      type: "number",
      description: "Fiber content score 1–10 from vegetables, legumes, and whole grains."
    },
    satietyScoreNumeric: {
      type: "number",
      description: "Satiety score 1–10 for how filling and satisfying the meal is likely to be."
    },
    bloodSugarRiskScore: {
      type: "number",
      description: "Blood sugar spike risk score 1–10 where 10 is very high risk and 1 is very low risk."
    },
    quickVerdict: {
      type: "string",
      description: "1–2 sentence plain-language summary of what works and what could be nudged."
    },
    mainConcerns: {
      type: "array",
      items: { type: "string" },
      description: "Up to 3 short neutral concern strings. Not moralistic."
    },
    minimalChangeVersion: {
      type: "string",
      description: "The smallest practical improvement that keeps the dish recognizable. 1–3 sentences."
    },
    supportiveVersion: {
      type: "string",
      description: "A more intentional version adding protein, fiber, or lowering glycemic load. Still realistic. 2–4 sentences."
    },
    plateStrategy: {
      type: "string",
      description: "How to plate or portion this meal for better satiety. 1–2 sentences."
    },
    whyThisHelps: {
      type: "string",
      description: "Brief explanation of why suggested changes support blood sugar and satiety. No medical claims. 1–2 sentences."
    },
    culturalNotes: {
      type: "string",
      description: "Acknowledge cultural identity if present. Respectful and brief. Empty string if not applicable."
    },
    shoppingAdditions: {
      type: "array",
      items: { type: "string" },
      description: "2–5 short ingredient strings to add next shopping trip."
    },
    prepNotes: {
      type: "array",
      items: { type: "string" },
      description: "1–3 short practical prep tips."
    },
    mealPairings: {
      type: "array",
      items: { type: "string" },
      description: "2–3 simple food or drink pairings that complement this meal metabolically."
    },
    cautions: {
      type: "array",
      items: { type: "string" },
      description: "0–2 short notes about things worth watching. Empty array if none."
    },
    evidenceNotes: {
      type: "array",
      items: { type: "string" },
      description:
        "2–4 concise evidence-aware notes using general food-pattern support language. No medical claims."
    },
    confidenceNotes: {
      type: "array",
      items: { type: "string" },
      description:
        "1–3 concise uncertainty notes about portions, preparation, product variation, or individual response."
    },
    safetyDisclaimer: {
      type: "string",
      description:
        "One concise sentence: general food-pattern support only, not diagnosis or individualized medical advice."
    },
    guidanceBasis: {
      type: "array",
      description:
        "2–5 source-linked guidance references that use only approved sourceId and principleId values.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sourceId: {
            type: "string",
            enum: approvedSourceIds
          },
          principleId: {
            type: "string",
            enum: healthGuidancePrincipleIds
          },
          relevance: {
            type: "string",
            description:
              "Short explanation of why this source/principle is relevant to this meal."
          }
        },
        required: ["sourceId", "principleId", "relevance"]
      }
    }
  },
  required: [
    "mealName",
    "cuisine",
    "mealType",
    "proteinLevel",
    "satietyLevel",
    "bloodSugarImpact",
    "effortLevel",
    "familyApproved",
    "weeknightFriendly",
    "comfortMeal",
    "optimizedVersion",
    "notes",
    "ingredientSuggestions",
    "feedbackPrompt",
    "metabolicScore",
    "proteinScore",
    "fiberScore",
    "satietyScoreNumeric",
    "bloodSugarRiskScore",
    "quickVerdict",
    "mainConcerns",
    "minimalChangeVersion",
    "supportiveVersion",
    "plateStrategy",
    "whyThisHelps",
    "culturalNotes",
    "shoppingAdditions",
    "prepNotes",
    "mealPairings",
    "cautions",
    "evidenceNotes",
    "confidenceNotes",
    "safetyDisclaimer",
    "guidanceBasis"
  ]
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestBody(body: unknown): MealAnalysisRequest | NextResponse {
  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const recipeText = body.recipeText;

  if (typeof recipeText !== "string") {
    return NextResponse.json(
      { error: "recipeText is required and must be a string." },
      { status: 400 }
    );
  }

  const trimmedRecipeText = recipeText.trim();

  if (trimmedRecipeText.length < 10) {
    return NextResponse.json(
      { error: "recipeText must be at least 10 characters." },
      { status: 400 }
    );
  }

  const sourceType: RecipeSourceType =
    typeof body.sourceType === "string" &&
    recipeSourceTypes.includes(body.sourceType as RecipeSourceType)
      ? (body.sourceType as RecipeSourceType)
      : defaultManualRecipeSource.sourceType;
  const sourceUrl =
    typeof body.sourceUrl === "string" && body.sourceUrl.trim()
      ? body.sourceUrl.trim()
      : null;
  const sourceName =
    typeof body.sourceName === "string" && body.sourceName.trim()
      ? body.sourceName.trim()
      : null;

  return {
    recipeText: trimmedRecipeText,
    sourceType,
    sourceUrl,
    sourceName
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const validatedRequest = validateRequestBody(body);

  if (validatedRequest instanceof NextResponse) {
    return validatedRequest;
  }

  try {
    const preparedRecipe = await prepareRecipeForAnalysis(validatedRequest);
    const ingredientContext = await safeGetKnownIngredientContext(
      preparedRecipe.analysisText
    );
    const { OPENAI_API_KEY } = getOpenAIEnv();
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: formatAnalysisUserPrompt(
            preparedRecipe.analysisText,
            ingredientContext.promptContext
          )
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "meal_analysis",
          strict: true,
          schema: mealAnalysisJsonSchema
        }
      }
    });

    const result = JSON.parse(response.output_text) as MealAnalysisResult;

    return NextResponse.json({
      ...result,
      sourceType: preparedRecipe.sourceType,
      sourceUrl: preparedRecipe.sourceUrl,
      sourceName: preparedRecipe.sourceName,
      sourceClassification: preparedRecipe.sourceClassification,
      sourceNotes: preparedRecipe.sourceNotes,
      importedAt: preparedRecipe.importedAt,
      lastParsedAt: preparedRecipe.lastParsedAt,
      parserVersion: preparedRecipe.parserVersion,
      knownIngredientContextUsed: ingredientContext.ingredients.length > 0,
      knownIngredientContextNames: ingredientContext.ingredients.map(
        (ingredient) => ingredient.ingredientName
      )
    });
  } catch (error) {
    if (error instanceof RecipeParserError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Meal analysis API failure", error);

    return NextResponse.json(
      { error: "Unable to analyze meal right now." },
      { status: 500 }
    );
  }
}

function formatAnalysisUserPrompt(
  analysisText: string,
  ingredientPromptContext: string
) {
  const contextBlock = ingredientPromptContext
    ? `\n\n${ingredientPromptContext}`
    : "";

  return `Analyze this recipe or meal text and return structured JSON only:\n\n${analysisText}${contextBlock}`;
}

async function safeGetKnownIngredientContext(analysisText: string) {
  try {
    return await getKnownIngredientContext({
      text: analysisText
    });
  } catch (error) {
    console.warn("Known ingredient context unavailable", error);

    return {
      ingredients: [],
      promptContext: ""
    };
  }
}

async function prepareRecipeForAnalysis(request: MealAnalysisRequest) {
  if (isProbablyUrl(request.recipeText)) {
    const parsedRecipe = await basicRecipeParserAdapter.parseFromUrl(
      request.recipeText
    );

    return {
      analysisText: formatParsedRecipeForAnalysis(parsedRecipe),
      sourceType: parsedRecipe.source.sourceType,
      sourceUrl: parsedRecipe.source.sourceUrl ?? null,
      sourceName: parsedRecipe.source.sourceName ?? null,
      sourceClassification: parsedRecipe.source.sourceClassification ?? null,
      sourceNotes: parsedRecipe.source.sourceNotes ?? null,
      importedAt: parsedRecipe.source.importedAt ?? new Date().toISOString(),
      lastParsedAt: parsedRecipe.source.lastParsedAt ?? new Date().toISOString(),
      parserVersion: parsedRecipe.source.parserVersion ?? null
    };
  }

  return {
    analysisText: request.recipeText,
    sourceType: request.sourceType ?? defaultManualRecipeSource.sourceType,
    sourceUrl: request.sourceUrl ?? null,
    sourceName: request.sourceName ?? null,
    sourceClassification: "manual-text",
    sourceNotes: null,
    importedAt: new Date().toISOString(),
    lastParsedAt: null,
    parserVersion: request.sourceType === "url" ? null : manualParserVersion
  };
}
