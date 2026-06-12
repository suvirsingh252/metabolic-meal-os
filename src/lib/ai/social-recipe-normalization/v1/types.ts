import type { SourceClassification } from "@/src/lib/intake/source-classifier";

export const socialRecipeConfidenceLevels = ["low", "medium", "high"] as const;

export type SocialRecipeConfidence =
  (typeof socialRecipeConfidenceLevels)[number];

export interface SocialRecipeCandidate {
  title: string;
  ingredients: string[];
  steps: string[];
  servings?: string | null;
  confidence: SocialRecipeConfidence;
  assumptions: string[];
  missingDetails: string[];
}

export interface SocialRecipeNormalizationRequest {
  sourceUrl?: string | null;
  sourceType: SourceClassification;
  title?: string | null;
  text: string;
}

