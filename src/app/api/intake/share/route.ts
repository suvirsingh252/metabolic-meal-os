import { NextResponse } from "next/server";
import { classifyInput, normalizeUrl, parseUrl } from "@/src/lib/intake/classify";
import { saveIntakeToNotion, getIntakeDbId } from "@/src/lib/intake/notion";
import { readJsonWithLimit } from "@/src/lib/server/request-guards";
import type { IntakeSharePayload } from "@/src/lib/intake/types";

export const runtime = "nodejs";

const PROD_BASE_URL = "https://metabolic-meal-os.vercel.app";
const MAX_TEXT_BYTES = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateToken(request: Request): NextResponse | null {
  const token = process.env.IOS_SHORTCUT_TOKEN?.trim();

  if (!token) {
    return NextResponse.json(
      { error: "Intake endpoint is not configured." },
      { status: 503 }
    );
  }

  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];

  if (!bearer || bearer !== token) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  return null;
}

function extractPayload(body: unknown): IntakeSharePayload | NextResponse {
  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : undefined;
  const text = typeof body.text === "string" ? body.text.trim() : undefined;
  const source = typeof body.source === "string" ? body.source.trim() : undefined;
  const sharedAt = typeof body.sharedAt === "string" ? body.sharedAt.trim() : undefined;

  if (!url && !text) {
    return NextResponse.json(
      { error: "Provide at least one of: url, text." },
      { status: 400 }
    );
  }

  return { url, text, source, sharedAt };
}

export async function POST(request: Request) {
  const tokenError = validateToken(request);
  if (tokenError) return tokenError;

  const body = await readJsonWithLimit(request, MAX_TEXT_BYTES);
  if (body instanceof NextResponse) return body;

  const payload = extractPayload(body);
  if (payload instanceof NextResponse) return payload;

  const { url: rawUrl, text, source, sharedAt } = payload;

  const normalizedUrl = rawUrl ? normalizeUrl(rawUrl) : undefined;
  const validUrl = normalizedUrl && parseUrl(normalizedUrl) ? normalizedUrl : undefined;
  const classification = classifyInput(validUrl, text);
  const createdAt = sharedAt ?? new Date().toISOString();

  const dbId = getIntakeDbId();

  if (!dbId) {
    return NextResponse.json({
      ok: true,
      classification,
      message: "Intake received but storage is not configured",
      analyzeUrl: `${PROD_BASE_URL}/analyze`
    });
  }

  try {
    const result = await saveIntakeToNotion({
      url: validUrl,
      rawText: text,
      source,
      classification,
      createdAt
    });

    if (!result) {
      return NextResponse.json({
        ok: true,
        classification,
        message: "Intake received but storage is not configured",
        analyzeUrl: `${PROD_BASE_URL}/analyze`
      });
    }

    return NextResponse.json({
      ok: true,
      intakeId: result.id,
      classification,
      message: "Recipe received",
      analyzeUrl: result.analyzeUrl
    });
  } catch (error) {
    console.error("Intake share save failed", error);

    return NextResponse.json(
      { error: "Unable to save intake right now. Try again." },
      { status: 500 }
    );
  }
}
