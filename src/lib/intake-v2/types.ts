export const intakeConfidenceLevels = ["low", "medium", "high"] as const;

export type IntakeConfidence = (typeof intakeConfidenceLevels)[number];

export const intakeSourcePlatforms = [
  "instagram",
  "tiktok",
  "youtube",
  "pinterest",
  "facebook",
  "unknown_social"
] as const;

export type IntakeSourcePlatform = (typeof intakeSourcePlatforms)[number];

export type IntakeCaptureKind = "url" | "social_share_payload";

export interface IntakeImagePlaceholder {
  id?: string;
  filename?: string;
  contentType?: string;
  width?: number;
  height?: number;
  byteSize?: number;
  note?: string;
}

export interface IntakeCapture {
  kind: IntakeCaptureKind;
  originalUrl?: string | null;
  sharedText?: string | null;
  selectedText?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  sourceApp?: string | null;
  images?: IntakeImagePlaceholder[];
  capturedAt?: string | null;
}

export type IntakeEvidenceKind =
  | "user_text"
  | "share_sheet_text"
  | "instagram_metadata"
  | "open_graph"
  | "screenshot_vision"
  | "canonical_recipe_page"
  | "ai_inference";

export interface IntakeEvidence {
  kind: IntakeEvidenceKind;
  label: string;
  text?: string | null;
  url?: string | null;
  field?: string | null;
  confidence: IntakeConfidence;
}

export interface IntakeMetadata {
  title?: string | null;
  ogTitle?: string | null;
  description?: string | null;
  ogDescription?: string | null;
  authorHandle?: string | null;
  thumbnailUrl?: string | null;
  captionText?: string | null;
}

export interface IntakeEnrichmentResult {
  originalUrl: string;
  canonicalUrl: string;
  platform: IntakeSourcePlatform;
  shortcode?: string | null;
  contentType?: "reel" | "post" | "story" | "unknown";
  metadata: IntakeMetadata;
  evidence: IntakeEvidence[];
  status:
    | "recipe_caption_found"
    | "partial_recipe_details_found"
    | "best_effort_estimate"
    | "caption_unavailable_best_effort";
}

export type EvidenceLevel = "explicit" | "inferred";

export interface EvidenceBackedText {
  text: string;
  evidenceLevel: EvidenceLevel;
  evidenceKinds: IntakeEvidenceKind[];
}

export interface SocialMealCandidate {
  title: string;
  ingredients: string[];
  steps: string[];
  servings?: string | null;
  confidence: IntakeConfidence;
  assumptions: string[];
  missingDetails: string[];
  sourceEvidence: IntakeEvidence[];
  ingredientEvidence?: EvidenceBackedText[];
  stepEvidence?: EvidenceBackedText[];
}

export interface IntakeFeedbackEvent {
  event:
    | "accepted_best_guess"
    | "edited_title"
    | "edited_ingredients"
    | "changed_servings"
    | "marked_guess_wrong"
    | "saved_anyway";
  platform?: IntakeSourcePlatform | null;
  canonicalUrl?: string | null;
  confidence?: IntakeConfidence | null;
  householdId?: string | null;
  occurredAt: string;
}
