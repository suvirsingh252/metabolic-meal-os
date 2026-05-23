import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getOpenAIEnv } from "@/src/lib/env";
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

export const runtime = "nodejs";

const systemPrompt = `
You analyze household recipes and return practical structured JSON for a meal review screen.

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
    "feedbackPrompt"
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

  return { recipeText: trimmedRecipeText };
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
          content: `Analyze this recipe or meal text and return structured JSON only:\n\n${validatedRequest.recipeText}`
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Meal analysis API failure", error);

    return NextResponse.json(
      { error: "Unable to analyze meal right now." },
      { status: 500 }
    );
  }
}
