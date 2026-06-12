import type { IntakeClassification } from "@/src/lib/intake/types";
import {
  classifySourceInput,
  isSocialSource,
  normalizeUrl,
  parseUrl
} from "@/src/lib/intake/source-classifier";

export { normalizeUrl, parseUrl };

const RECIPE_PATH_PATTERNS = [
  "/recipe",
  "/recipes",
  "/dish",
  "/food",
  "/meal",
  "/cook",
  "/eating"
];

export function classifyInput(
  url?: string,
  text?: string
): IntakeClassification {
  const trimmedUrl = url?.trim();
  const trimmedText = text?.trim();

  if (trimmedUrl) {
    const parsed = parseUrl(trimmedUrl);
    if (parsed) {
      const source = classifySourceInput(trimmedUrl);

      if (isSocialSource(source)) {
        return "social-url";
      }
      if (
        source === "recipe_page" &&
        RECIPE_PATH_PATTERNS.some((pattern) =>
          parsed.pathname.toLowerCase().includes(pattern)
        )
      ) {
        return "recipe-url";
      }
      return "unknown-url";
    }
  }

  if (trimmedText) {
    return "plain-text";
  }

  return "unknown-url";
}
