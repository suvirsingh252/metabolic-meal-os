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

  const input = typeof body.input === "string" ? body.input.trim() : undefined;
  const url = typeof body.url === "string" ? body.url.trim() : undefined;
  const text = typeof body.text === "string" ? body.text.trim() : undefined;
  const source = typeof body.source === "string" ? body.source.trim() : undefined;
  const sharedAt = typeof body.sharedAt === "string" ? body.sharedAt.trim() : undefined;

  if (!input && !url && !text) {
    return NextResponse.json(
      { error: "Provide input, url, or text." },
      { status: 400 }
    );
  }

  return { input, url, text, source, sharedAt };
}

function normalizePayloadInput(payload: IntakeSharePayload): {
  rawUrl?: string;
  text?: string;
} {
  if (payload.input) {
    const parsed = parseUrl(payload.input);
    if (parsed) {
      return { rawUrl: payload.input };
    }
    return { text: payload.input };
  }

  return { rawUrl: payload.url, text: payload.text };
}

function getBaseUrl(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return PROD_BASE_URL;
  }
}

export async function POST(request: Request) {
  const tokenError = validateToken(request);
  if (tokenError) return tokenError;

  const body = await readJsonWithLimit(request, MAX_TEXT_BYTES);
  if (body instanceof NextResponse) return body;

  const payload = extractPayload(body);
  if (payload instanceof NextResponse) return payload;

  const { rawUrl, text } = normalizePayloadInput(payload);
  const { source, sharedAt } = payload;

  const normalizedUrl = rawUrl ? normalizeUrl(rawUrl) : undefined;
  const validUrl = normalizedUrl && parseUrl(normalizedUrl) ? normalizedUrl : undefined;
  const classification = classifyInput(validUrl, text);
  const createdAt = sharedAt ?? new Date().toISOString();
  const baseUrl = getBaseUrl(request);

  const dbId = getIntakeDbId();

  if (!dbId) {
    return NextResponse.json({
      ok: true,
      classification,
      message: "Intake received but storage is not configured",
      analyzeUrl: `${baseUrl}/analyze`,
      openUrl: `${baseUrl}/analyze`
    });
  }

  try {
    const result = await saveIntakeToNotion({
      url: validUrl,
      rawText: text,
      source,
      classification,
      createdAt,
      baseUrl
    });

    if (!result) {
      return NextResponse.json({
        ok: true,
        classification,
        message: "Intake received but storage is not configured",
        analyzeUrl: `${baseUrl}/analyze`,
        openUrl: `${baseUrl}/analyze`
      });
    }

    return NextResponse.json({
      ok: true,
      intakeId: result.id,
      classification,
      message: "Recipe received",
      analyzeUrl: result.analyzeUrl,
      openUrl: result.analyzeUrl
    });
  } catch (error) {
    console.error("Intake share save failed", error);

    return NextResponse.json(
      { error: "Unable to save intake right now. Try again." },
      { status: 500 }
    );
  }
}
