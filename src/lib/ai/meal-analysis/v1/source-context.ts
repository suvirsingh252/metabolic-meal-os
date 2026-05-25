import {
  globalHealthSafetyRules,
  healthGuidancePrinciples
} from "@/src/lib/health-guidance";
import { approvedSources } from "@/src/lib/sources/source-registry";

export const approvedSourceIds = approvedSources.map((source) => source.id);
export const healthGuidancePrincipleIds = healthGuidancePrinciples.map(
  (principle) => principle.id
);

export function formatEvidenceContext() {
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
