import type { DashboardMealSummary } from "@/src/lib/domain/analytics";

export type TargetProgressTone = "positive" | "steady" | "warning" | "danger" | "unavailable";
export type TargetProgressIntent = "gain" | "range" | "limit";
export type MealQualityState = "strong" | "solid" | "attention" | "unavailable";

export interface TargetProgressState {
  percent: number | null;
  cappedPercent: number;
  tone: TargetProgressTone;
  label: string;
  detail: string;
}

export function getTargetProgressState({
  value,
  target,
  unit,
  intent
}: {
  value: number | null;
  target: number;
  unit: string;
  intent: TargetProgressIntent;
}): TargetProgressState {
  if (typeof value !== "number" || !Number.isFinite(value) || target <= 0) {
    return {
      percent: null,
      cappedPercent: 0,
      tone: "unavailable",
      label: "Unavailable",
      detail: `Target ${formatCompactNumber(target)} ${unit}`
    };
  }

  const percent = Math.round((value / target) * 100);
  const cappedPercent = Math.max(0, Math.min(percent, 100));

  if (intent === "limit") {
    return {
      percent,
      cappedPercent,
      tone: percent >= 100 ? "danger" : percent >= 85 ? "warning" : "positive",
      label: `${percent}% of limit`,
      detail: `${formatCompactNumber(value)} of ${formatCompactNumber(target)} ${unit}`
    };
  }

  if (intent === "range") {
    return {
      percent,
      cappedPercent,
      tone: percent > 115 ? "warning" : "steady",
      label: `${percent}% of target`,
      detail: `${formatCompactNumber(value)} of ${formatCompactNumber(target)} ${unit}`
    };
  }

  return {
    percent,
    cappedPercent,
    tone: percent >= 100 ? "positive" : percent >= 70 ? "steady" : "warning",
    label: `${percent}% of target`,
    detail: `${formatCompactNumber(value)} of ${formatCompactNumber(target)} ${unit}`
  };
}

export function getMealQualityState(
  score: number | null | undefined,
  label?: DashboardMealSummary["qualityLabel"]
): MealQualityState {
  if (typeof score !== "number" || !Number.isFinite(score) || label === "unknown") {
    return "unavailable";
  }

  if (score >= 75 || label === "high") {
    return "strong";
  }

  if (score >= 50 || label === "moderate") {
    return "solid";
  }

  return "attention";
}

export function mealQualityText(state: MealQualityState) {
  if (state === "strong") return "Strong";
  if (state === "solid") return "Solid";
  if (state === "attention") return "Needs attention";
  return "Unavailable";
}

export function formatCompactNumber(value: number) {
  return Math.round(value).toLocaleString();
}
