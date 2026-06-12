import type { SocialRecipeNormalizationRequest } from "@/src/lib/ai/social-recipe-normalization/v1/types";

export const socialRecipeNormalizationSystemPrompt = `
You normalize messy social recipe captions, notes, and ingredient lists into structured recipe candidates.

Rules:
- Extract only recipe details supported by the supplied text or metadata.
- Do not invent exact nutrition totals, calories, macros, or serving nutrition.
- Clearly mark uncertain quantities, missing amounts, missing cook times, and unclear serving sizes.
- If an amount is vague, keep the vague wording in the ingredient or assumption instead of guessing.
- If servings are not stated, return null and add a missingDetails note.
- Return structured JSON only.
`.trim();

export function formatSocialRecipeNormalizationPrompt(
  request: SocialRecipeNormalizationRequest
) {
  return [
    `Platform/source type: ${request.sourceType}`,
    request.sourceUrl ? `Source URL: ${request.sourceUrl}` : null,
    request.title ? `Title/metadata: ${request.title}` : null,
    `Pasted caption/text/notes:\n${request.text}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

