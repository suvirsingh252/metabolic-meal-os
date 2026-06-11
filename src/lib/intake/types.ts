export type IntakeClassification =
  | "recipe-url"
  | "social-url"
  | "plain-text"
  | "unknown-url";

export type IntakeStatus = "pending" | "analyzed" | "error";

export interface IntakeRecord {
  id: string;
  url?: string;
  rawText?: string;
  source?: string;
  classification: IntakeClassification;
  status: IntakeStatus;
  createdAt: string;
  error?: string;
}

export interface IntakeSharePayload {
  url?: string;
  text?: string;
  source?: string;
  sharedAt?: string;
}
