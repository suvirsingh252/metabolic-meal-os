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

export const runtime = "nodejs";

const systemPrompt = `
You analyze household recipes and return practical structured JSON for a meal review screen.

Core principle: minimal-change improvement. Suggest the smallest realistic changes that meaningfully improve protein, fiber, or satiety — without westernizing, moralizing, or removing the dish's identity.

Guidelines:
- Support insulin-sensitivity-friendly eating patterns.
- Support possible PCOS-friendly dietary patterns.
- Prioritize protein, fiber, satiety, and lower glycemic load.
- Preserve Indian food context and Atlantic Canadian comfort food context when present.
- Do not diagnose, treat, or claim to prevent medical conditions.
- Avoid extreme dieting or keto by default unless the input explicitly asks for it.
- Avoid moralizing food. Use neutral, practical language.
- Produce family-friendly outputs that are realistic for household cooking.
- Keep substitutions culturally respectful and avoid stripping the identity of the dish.
- Never call foods "bad". Frame everything as "could support" or "worth watching".
- Avoid calorie or macro obsession. Focus on protein, fiber, satiety, and blood sugar stability.

Scoring (all scores 1–10):
- metabolicScore: overall metabolic friendliness for insulin-resistance-supportive eating.
- proteinScore: protein adequacy for the meal type and serving size.
- fiberScore: fiber content from vegetables, legumes, whole grains.
- satietyScoreNumeric: how filling and satisfying the meal is likely to be.
- bloodSugarRiskScore: estimated blood sugar spike risk (10 = very high risk, 1 = very low risk).

Text fields:
- quickVerdict: 1–2 sentence plain-language summary. What works, what could be nudged.
- mainConcerns: up to 3 short concern strings. Neutral, not moralistic.
- minimalChangeVersion: the smallest practical improvement. Keep the dish recognizable. 1–3 sentences.
- supportiveVersion: a more intentional version that adds protein, fiber, or lowers glycemic load. Still realistic. 2–4 sentences.
- plateStrategy: how to plate or portion this meal for better satiety. 1–2 sentences.
- whyThisHelps: brief explanation of why the suggested changes support blood sugar and satiety. 1–2 sentences. No medical claims.
- culturalNotes: only include if the meal has strong cultural identity. Acknowledge it. Keep it respectful and brief. Empty string if not applicable.
- shoppingAdditions: 2–5 short ingredient strings to add next shopping trip that would support this meal pattern.
- prepNotes: 1–3 short practical prep tips (timing, batch cooking, shortcuts).
- mealPairings: 2–3 simple food or drink pairings that would complement this meal metabolically.
- cautions: 0–2 short notes about things worth watching (e.g. portion size, high sodium, added sugar). Empty array if none.
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
    "cautions"
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
          content: `Analyze this recipe or meal text and return structured JSON only:\n\n${preparedRecipe.analysisText}`
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
      importedAt: preparedRecipe.importedAt,
      lastParsedAt: preparedRecipe.lastParsedAt,
      parserVersion: preparedRecipe.parserVersion
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
    importedAt: new Date().toISOString(),
    lastParsedAt: null,
    parserVersion: request.sourceType === "url" ? null : manualParserVersion
  };
}
